/**
 * 外部 CLI 桥接 - 调用本机的 weflow-cli（微信）与 qce（qchat-cli，QQ）
 *
 * 这两个工具都是独立演进的项目，命令名字和参数形式都改过，所以这里只做三件事：
 *   1) 拼命令：外部传入的值（账号名、群号、路径）先过白名单或引号，避免拼进 shell 被注入；
 *   2) 执行：统一超时/缓冲，失败时把 stderr 收敛成一句能看懂的话；
 *   3) 找产物：两个 CLI 都是"导出到目录"，产物文件名带会话名（可能含中文），
 *      所以按修改时间取目录里最新生成的 JSON，而不是猜文件名。
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';

const execAsync = promisify(exec);

/** 群号 / QQ 号 */
export const QQ_ID_RE = /^\d{5,12}$/;
/** qce 的账号名（见 qce account list） */
export const ACCOUNT_RE = /^[A-Za-z0-9_-]{1,32}$/;

/**
 * 给 shell 参数加引号。含引号的值一律拒绝——这些值本来就只应是账号名、号码或路径。
 * @param {string} value
 * @returns {string}
 */
export function quoteArg(value) {
  const text = String(value);
  if (/"/.test(text)) throw new Error(`参数含非法引号: ${text}`);
  return /[\s&|<>^()]/.test(text) ? `"${text}"` : text;
}

/**
 * 执行一个 CLI 命令（不抛异常，返回结构化结果）
 * @param {string} cli - 可执行名或路径，如 'qce' / 'weflow-cli'
 * @param {string[]} args - 已拆分好的参数
 * @param {{ timeoutMs?: number, cwd?: string }} [options]
 * @returns {Promise<{ok: boolean, stdout: string, stderr: string, error?: Error}>}
 */
export async function runCli(cli, args, options = {}) {
  const cmd = [quoteArg(cli), ...args.map(quoteArg)].join(' ');
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
      timeout: options.timeoutMs || 600000,
      cwd: options.cwd,
      env: process.env
    });
    return { ok: true, stdout: stdout || '', stderr: stderr || '' };
  } catch (err) {
    // 受限环境（沙箱、组策略、部分 CI）会禁止子进程创建管道，exec 直接 EPERM/EINVAL。
    // 退化成“输出重定向到临时文件、不接管 stdio”，拿到的东西是一样的。
    if (process.platform === 'win32' && isPipeBlocked(err)) {
      return runWithRedirect(cli, args, options);
    }
    return {
      ok: false,
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      error: err
    };
  }
}

/**
 * 判断是不是“管道被系统挡住”这一类错误
 * @param {Error & {code?: string}} err
 * @returns {boolean}
 */
function isPipeBlocked(err) {
  return err?.code === 'EPERM' || err?.code === 'EINVAL' ||
    /spawn EPERM|not supported|refused/i.test(String(err?.message || ''));
}

/**
 * 退化执行：cmd /c 把 stdout/stderr 重定向到临时文件，stdio 完全不接管
 * @param {string} cli
 * @param {string[]} args
 * @param {{ timeoutMs?: number, cwd?: string }} options
 * @returns {Promise<{ok: boolean, stdout: string, stderr: string, error?: Error}>}
 */
function runWithRedirect(cli, args, options = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ember-cli-'));
  const outFile = path.join(tmpDir, 'stdout.txt');
  const errFile = path.join(tmpDir, 'stderr.txt');
  const inner = [quoteArg(cli), ...args.map(quoteArg)].join(' ') +
    ` 1>"${outFile}" 2>"${errFile}"`;

  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', inner], {
        cwd: options.cwd,
        env: process.env,
        stdio: 'ignore',
        windowsHide: true
      });
    } catch (err) {
      resolve({ ok: false, stdout: '', stderr: '', error: err });
      return;
    }

    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* 已经退出 */ }
    }, options.timeoutMs || 600000);

    const finish = (code, error) => {
      clearTimeout(timer);
      const stdout = readText(outFile);
      const stderr = readText(errFile);
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* 清理失败不影响结果 */ }
      // 0xC0000142 = STATUS_DLL_INIT_FAILED：进程根本没起来，通常是受限环境而不是命令写错了
      const blocked = code === 3221225794;
      resolve({
        ok: code === 0,
        stdout,
        stderr,
        error: code === 0
          ? undefined
          : (error || new Error(blocked
            ? '子进程无法初始化（0xC0000142）——当前环境不允许子进程，请在本机普通终端里运行'
            : `退出码 ${code}`))
      });
    };

    child.on('error', (err) => finish(-1, err));
    child.on('close', (code) => finish(code === null ? -1 : code));
  });
}

/**
 * 读文本文件，不存在就当空
 * @param {string} file
 * @returns {string}
 */
function readText(file) {
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * 从错误里挑一句最像人话的说明
 * @param {{stderr?: string, stdout?: string, error?: Error}} result
 * @returns {string}
 */
export function describeFailure(result) {
  const raw = (result.stderr || result.stdout || '').trim();
  if (!raw) return result.error?.message || '命令执行失败';
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  // CLI 的报错通常在最后几行（前面是进度输出），取最后一条非空行
  return lines[lines.length - 1].slice(0, 300);
}

/**
 * 取目录里最新的 JSON 文件
 * @param {string} dir
 * @returns {string|null} 绝对路径
 */
export function newestJsonIn(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const files = entries
    .filter((entry) => entry.isFile() && /\.json$/i.test(entry.name))
    .map((entry) => {
      const full = path.join(dir, entry.name);
      return { full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return files.length > 0 ? files[0].full : null;
}

/**
 * 判断某个 CLI 是否可用（供 status 命令与报错提示使用）
 * @param {string} cli
 * @returns {Promise<boolean>}
 */
export async function cliAvailable(cli) {
  const result = await runCli(cli, ['--version'], { timeoutMs: 20000 });
  return result.ok;
}

/**
 * 建一个本次导出专用的空目录（避免和目录里的旧产物混淆）
 * @param {string} baseDir
 * @param {string} prefix
 * @returns {string}
 */
export function makeExportDir(baseDir, prefix) {
  const dir = path.join(baseDir, `${prefix}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
