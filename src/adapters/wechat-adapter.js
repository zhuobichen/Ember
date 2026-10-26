/**
 * 微信适配器 - 加载已导出的 JSON 并转换为标准格式
 *
 * 支持三种输入：
 * 1. weflow-cli 导出的消息数组（raw 契约，默认）
 * 2. weflow-cli 的 weflow-v1 信封（{ schema: 'weflow-message/v1', messages: [...] }）
 * 3. 提取器输出的标准格式（直接返回）
 *
 * 解析逻辑已抽取到 core/parsers.js 中共享
 */

import fs from 'fs';
import path from 'path';
import { PLATFORMS } from '../core/schema.js';
import { parseWechatRaw, isWeflowEnvelope } from '../core/parsers.js';
import { runCli, describeFailure, newestJsonIn, makeExportDir } from '../core/cli-bridge.js';

export class WechatAdapter {
  constructor() {
    this.platform = PLATFORMS.WECHAT;
  }

  /**
   * 从 JSON 文件加载数据
   * @param {string} filePath - JSON 文件路径
   * @param {{ chatName?: string, chatId?: string }} [opts] - 会话名提示（信封格式里没有会话名）
   * @returns {Promise<UnifiedData>}
   */
  async load(filePath, opts = {}) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // weflow-cli 的文件名固定是 `<talker>_messages.json`，会话名可以从文件名还原
    const fromFileName = path.basename(filePath).replace(/_messages\.json$/i, '');
    const chatName = opts.chatName || (isWeflowEnvelope(raw) ? fromFileName : undefined);

    return parseWechatRaw(raw, { chatName, chatId: opts.chatId });
  }

  /**
   * 调用 weflow-cli 导出数据
   *
   * 实际命令（weflow-cli 1.13+）：
   *   weflow-cli export <talker> json --json --output <目录>
   * 旧版 Ember 里写的是 `weflow-cli chat export --talker ... --format json --output <文件>`——
   * `chat` 现在是 RAG 问答子命令，`--output` 收的是目录。
   *
   * 加 `--json` 让 CLI 直接回一行机器可读结果（含产物绝对路径），省得猜文件名。
   *
   * @param {Object} options
   * @param {string} options.talker - wxid / 昵称 / 备注 / 序号
   * @param {string} [options.cli] - CLI 可执行名，默认 weflow-cli
   * @param {number} [options.limit] - 最多导出多少条（0 = 全部）
   * @param {string} [options.contract] - raw | weflow-v1
   * @param {string} [options.outputDir] - 导出目录（默认 output/temp）
   * @returns {Promise<UnifiedData>}
   */
  async export(options = {}) {
    const cli = options.cli || 'weflow-cli';
    const run = options.runner || runCli;   // 可注入，便于在没有 CLI 的环境里测试命令拼装
    const talker = String(options.talker || '').trim();
    if (!talker) {
      throw new Error('需要指定微信会话（wxid / 昵称 / 备注），用 --wx-talker 传入');
    }

    const outDir = makeExportDir(options.outputDir || 'output/temp', 'wechat-export');
    const args = ['export', talker, 'json', '--json', '--output', outDir];
    if (options.limit) args.push('--limit', String(Number(options.limit)));
    if (options.contract) args.push('--contract', String(options.contract));

    const result = await run(cli, args);
    const payload = parseJsonResult(result.stdout);

    if (payload && payload.success === false) {
      throw new Error(`weflow-cli 导出失败: ${payload.error || payload.code || '未知原因'}`);
    }
    if (!result.ok) {
      throw new Error(`weflow-cli 导出失败: ${describeFailure(result)}`);
    }

    const file = (payload && payload.path) || newestJsonIn(outDir);
    if (!file || !fs.existsSync(file)) {
      throw new Error(`weflow-cli 没有产出 JSON（目录: ${outDir}）`);
    }

    return this.load(file, { chatName: options.chatName || talker });
  }
}

/**
 * weflow-cli 的 --json 结果可能混在其它输出里，取最后一段能解析的对象
 * @param {string} stdout
 * @returns {Object|null}
 */
function parseJsonResult(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.lastIndexOf('{');
    if (start === -1) return null;
    try {
      return JSON.parse(text.slice(start));
    } catch {
      return null;
    }
  }
}
