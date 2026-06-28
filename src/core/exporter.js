/**
 * 集成导出器 - 统一调用 weflow-cli / lark-cli / qchat-cli 导出聊天记录
 *
 * 核心功能：
 * 1. 自动检测 CLI 工具是否安装
 * 2. 一键导出微信/QQ/飞书聊天记录
 * 3. 自动转换为标准格式并合并
 *
 * 使用方式：
 *   import { IntegratedExporter } from './core/exporter.js';
 *   const exporter = new IntegratedExporter();
 *
 *   // 导出全部平台
 *   const data = await exporter.exportAll({ startTime, endTime });
 *
 *   // 导出单个平台
 *   const wechatData = await exporter.exportWechat({ talker: 'wxid_xxx' });
 *   const feishuData = await exporter.exportFeishu({ chatId: 'oc_xxx' });
 *   const qqData = await exporter.exportQQ({ groupId: 123456 });
 *
 *   // 交互式选择
 *   const data = await exporter.exportInteractive();
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WechatAdapter } from '../adapters/wechat-adapter.js';
import { QQAdapter } from '../adapters/qq-adapter.js';
import { FeishuAdapter } from '../adapters/feishu-adapter.js';
import { DataMerger } from './merge.js';

const execAsync = promisify(exec);

export class IntegratedExporter {
  constructor() {
    this.wechatAdapter = new WechatAdapter();
    this.qqAdapter = new QQAdapter();
    this.feishuAdapter = new FeishuAdapter();
    this.merger = new DataMerger();
    this.tempDir = path.join(process.cwd(), 'output', 'temp');

    // 检测 weflow-cli 本地安装路径
    this.weflowPath = null;
    const localPaths = [
      'E:\\CodeProject\\weflow-cli\\cli.cjs',
      path.join(process.cwd(), '..', 'weflow-cli', 'cli.cjs'),
      path.join(process.cwd(), 'node_modules', '.bin', 'weflow-cli')
    ];
    for (const p of localPaths) {
      if (fs.existsSync(p)) {
        this.weflowPath = p;
        break;
      }
    }
  }

  /**
   * 获取 weflow-cli 命令
   */
  get weflowCommand() {
    return this.weflowPath || 'weflow-cli';
  }

  /**
   * 检测 CLI 工具是否可用
   */
  async checkTool(name) {
    // weflow-cli 特殊处理：先检查本地路径
    if (name === 'weflow-cli' && this.weflowPath) {
      return true;
    }
    try {
      await execAsync(`${name} --version`, { timeout: 5000 });
      return true;
    } catch {
      try {
        await execAsync(`${name} --help`, { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * 检测所有工具状态
   */
  async checkAllTools() {
    const status = {
      wechat: await this.checkTool('weflow-cli'),
      feishu: await this.checkTool('lark-cli'),
      qq: await this.checkTool('qchat-cli')
    };
    return status;
  }

  // ========== 微信导出 ==========

  /**
   * 导出微信聊天记录
   * @param {Object} options
   * @param {string} [options.talker] - 指定聊天对象 wxid，不指定则导出所有
   * @param {string} [options.format] - 导出格式 json/html/csv，默认 json
   * @param {number} [options.limit] - 消息数量限制
   */
  async exportWechat(options = {}) {
    console.log('  [微信] 开始导出...');
    const format = options.format || 'json';
    fs.mkdirSync(this.tempDir, { recursive: true });

    // 如果传入了已导出的文件路径，直接加载
    if (options.file) {
      console.log(`  [微信] 从文件加载: ${options.file}`);
      return this.wechatAdapter.load(options.file);
    }

    // 获取会话列表
    let sessions = [];
    if (!options.talker) {
      console.log('  [微信] 获取会话列表...');
      try {
        const { stdout } = await execAsync(`"${this.weflowCommand}" sessions --format json`, {
          maxBuffer: 10 * 1024 * 1024,
          timeout: 30000
        });
        const data = JSON.parse(stdout);
        sessions = data.items || data.sessions || data || [];
        if (!Array.isArray(sessions)) sessions = [];
        console.log(`  [微信] 找到 ${sessions.length} 个会话`);
      } catch (err) {
        console.warn(`  [微信] 获取会话列表失败: ${err.message}`);
        console.warn('  [微信] 请先运行 weflow-cli init 初始化数据库');
        return null;
      }
    } else {
      sessions = [{ talkerId: options.talker, talkerName: options.talker }];
    }

    // 导出每个会话的消息
    const allFiles = [];
    for (const session of sessions) {
      const talker = session.talkerId || session.wxid || session.username;
      if (!talker) continue;

      const outputFile = path.join(this.tempDir, `wechat_${talker}_${Date.now()}.json`);
      const cmdParts = [`"${this.weflowCommand}"`, 'export', talker, format];

      if (options.limit) cmdParts.push('--limit', options.limit);

      try {
        console.log(`  [微信] 导出: ${session.talkerName || talker}`);
        const { stdout } = await execAsync(cmdParts.join(' '), {
          maxBuffer: 100 * 1024 * 1024,
          timeout: 60000,
          cwd: process.cwd()
        });

        // weflow-cli 可能直接输出 JSON 到 stdout
        let jsonData;
        try {
          jsonData = JSON.parse(stdout);
        } catch {
          // 如果不是 JSON，可能是输出到了文件
          if (fs.existsSync(outputFile)) {
            jsonData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
          } else {
            continue;
          }
        }

        // 写入临时文件供 adapter 加载
        fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2));
        allFiles.push(outputFile);
      } catch (err) {
        console.warn(`  [微信] 导出 ${talker} 失败: ${err.message}`);
      }
    }

    // 合并所有导出的数据
    if (allFiles.length === 0) {
      console.warn('  [微信] 未导出任何数据');
      return null;
    }

    console.log(`  [微信] 成功导出 ${allFiles.length} 个会话`);
    const dataList = [];
    for (const file of allFiles) {
      try {
        const data = await this.wechatAdapter.load(file);
        dataList.push(data);
      } catch (err) {
        console.warn(`  [微信] 解析 ${file} 失败: ${err.message}`);
      }
    }

    if (dataList.length === 0) return null;
    if (dataList.length === 1) return dataList[0];

    return this.merger.merge(dataList);
  }

  // ========== 飞书导出 ==========

  /**
   * 导出飞书聊天记录
   * @param {Object} options
   * @param {string} [options.chatId] - 指定聊天 ID，不指定则导出所有
   * @param {string} [options.startTime] - 开始时间 ISO 8601
   * @param {string} [options.endTime] - 结束时间 ISO 8601
   * @param {string} [options.file] - 已导出的 JSON 文件路径
   */
  async exportFeishu(options = {}) {
    console.log('  [飞书] 开始导出...');

    // 如果传入了已导出的文件路径，直接加载
    if (options.file) {
      console.log(`  [飞书] 从文件加载: ${options.file}`);
      return this.feishuAdapter.load(options.file);
    }

    // 检查登录状态
    try {
      const { stdout } = await execAsync('lark-cli auth status --format json', {
        timeout: 10000
      });
      const auth = JSON.parse(stdout);
      if (auth.expiresAt) {
        const expiry = new Date(auth.expiresAt);
        if (expiry < new Date()) {
          console.warn('  [飞书] 用户 Token 已过期，使用 Bot 身份');
          console.warn('  [飞书] 如需完整数据，请运行: lark-cli auth login');
        } else {
          console.log('  [飞书] 登录状态正常');
        }
      }
    } catch {
      console.warn('  [飞书] 无法获取登录状态，请先运行: lark-cli auth login');
    }

    // 使用 FeishuAdapter 的 export 方法
    return this.feishuAdapter.export({
      chatId: options.chatId,
      startTime: options.startTime,
      endTime: options.endTime,
      outputDir: this.tempDir
    });
  }

  // ========== QQ 导出 ==========

  /**
   * 导出 QQ 聊天记录
   * @param {Object} options
   * @param {number|string} [options.groupId] - 群号
   * @param {number|string} [options.userId] - 私信用户 QQ 号
   * @param {string} [options.file] - 已导出的 JSON 文件路径
   */
  async exportQQ(options = {}) {
    console.log('  [QQ] 开始导出...');

    // 如果传入了已导出的文件路径，直接加载
    if (options.file) {
      console.log(`  [QQ] 从文件加载: ${options.file}`);
      return this.qqAdapter.load(options.file);
    }

    const isAvailable = await this.checkTool('qchat-cli');
    if (!isAvailable) {
      console.warn('  [QQ] qchat-cli 未安装或不可用');
      console.warn('  [QQ] 请安装 OneBot 协议客户端（如 go-cqhttp / NapCat / Lagrange）');
      console.warn('  [QQ] 或使用 --qq-file <path> 从已导出的文件加载');
      return null;
    }

    // 通过 qchat-cli 导出
    const target = options.groupId ? `--group ${options.groupId}` : `--user ${options.userId}`;
    const outputFile = path.join(this.tempDir, `qq_${options.groupId || options.userId}_${Date.now()}.json`);

    try {
      const cmd = `qchat-cli export ${target} --format json --output "${outputFile}"`;
      console.log(`  [QQ] 执行: ${cmd}`);
      await execAsync(cmd, { maxBuffer: 100 * 1024 * 1024, timeout: 60000 });

      if (fs.existsSync(outputFile)) {
        return this.qqAdapter.load(outputFile);
      }
    } catch (err) {
      console.warn(`  [QQ] 导出失败: ${err.message}`);
    }

    return null;
  }

  // ========== 一键导出全部 ==========

  /**
   * 导出所有平台的聊天记录并合并
   * @param {Object} options
   * @param {boolean} [options.wechat] - 是否导出微信
   * @param {boolean} [options.feishu] - 是否导出飞书
   * @param {boolean} [options.qq] - 是否导出 QQ
   * @param {string} [options.startTime] - 飞书开始时间
   * @param {string} [options.endTime] - 飞书结束时间
   */
  async exportAll(options = {}) {
    console.log('===== 开始多平台聊天记录导出 =====\n');

    // 检查工具状态
    const toolStatus = await this.checkAllTools();
    console.log('工具状态:');
    for (const [name, available] of Object.entries(toolStatus)) {
      console.log(`  ${name}: ${available ? '✓ 可用' : '✗ 不可用'}`);
    }
    console.log('');

    const dataList = [];

    // 微信
    if (options.wechat !== false && toolStatus.wechat) {
      try {
        const data = await this.exportWechat(options.wechatOptions || {});
        if (data) dataList.push(data);
      } catch (err) {
        console.warn(`微信导出失败: ${err.message}`);
      }
    }

    // 飞书
    if (options.feishu !== false && toolStatus.feishu) {
      try {
        const data = await this.exportFeishu({
          startTime: options.startTime,
          endTime: options.endTime,
          chatId: options.feishuChatId
        });
        if (data) dataList.push(data);
      } catch (err) {
        console.warn(`飞书导出失败: ${err.message}`);
      }
    }

    // QQ
    if (options.qq !== false && toolStatus.qq) {
      try {
        const data = await this.exportQQ(options.qqOptions || {});
        if (data) dataList.push(data);
      } catch (err) {
        console.warn(`QQ 导出失败: ${err.message}`);
      }
    }

    if (dataList.length === 0) {
      console.log('\n未导出任何数据。请检查 CLI 工具是否安装并已登录。');
      return null;
    }

    // 合并数据
    console.log(`\n===== 合并 ${dataList.length} 个平台数据 =====`);
    const merged = this.merger.merge(dataList);
    console.log(`合并完成: ${merged.messages.length} 条消息, ${merged.contacts.length} 个联系人`);
    return merged;
  }

  /**
   * 清理临时文件
   */
  cleanTemp() {
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.tempDir, file));
        }
      }
      console.log(`  已清理 ${files.length} 个临时文件`);
    }
  }
}
