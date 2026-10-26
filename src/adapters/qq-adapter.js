/**
 * QQ 适配器 - 加载已导出的 JSON 并转换为标准格式
 *
 * 支持三种输入：
 * 1. qce（qchat-cli）`export --format json` 产物 —— { session, messages[segments] }，推荐
 * 2. OneBot 11 消息数组 / { messages } / { data }
 * 3. 已是标准格式的 UnifiedData（直接返回）
 *
 * 解析逻辑在 core/parsers.js 中共享
 */

import fs from 'fs';
import { createEmptyData, updateMeta, MESSAGE_TYPES, PLATFORMS } from '../core/schema.js';
import {
  parseQQSegments,
  detectQQMessageType,
  isQceExport,
  parseQceExport
} from '../core/parsers.js';
import {
  QQ_ID_RE,
  ACCOUNT_RE,
  runCli,
  describeFailure,
  newestJsonIn,
  makeExportDir
} from '../core/cli-bridge.js';

export class QQAdapter {
  constructor() {
    this.platform = PLATFORMS.QQ;
  }

  /**
   * 从 JSON 文件加载数据
   * @param {string} filePath - JSON 文件路径
   * @param {{ selfId?: string|number, chatName?: string }} [opts] - selfId 用于判定哪些消息是自己发的
   * @returns {Promise<UnifiedData>}
   */
  async load(filePath, opts = {}) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 1) qce 导出格式（会话元信息 + 消息段）
    if (isQceExport(raw)) {
      return parseQceExport(raw, opts);
    }

    // 2) 已是标准格式
    if (raw && raw.meta && Array.isArray(raw.messages) &&
        raw.messages.length > 0 && raw.messages[0].platform) {
      return raw;
    }

    // 3) OneBot 11
    const messages = Array.isArray(raw) ? raw : (raw.messages || raw.data || []);

    const data = createEmptyData();
    const contactMap = new Map();

    for (const msg of messages) {
      const segments = msg.message || msg.content;
      const content = typeof segments === 'string' ? segments : parseQQSegments(segments);
      const type = typeof segments === 'string' ? MESSAGE_TYPES.TEXT : detectQQMessageType(segments);

      const isGroup = !!(msg.group_id || msg.groupId);
      const chatId = isGroup
        ? `group_${msg.group_id || msg.groupId}`
        : `private_${msg.user_id || msg.userId}`;
      const chatName = isGroup
        ? (msg.group_name || msg.groupName || `群${msg.group_id || ''}`)
        : (msg.sender?.nickname || msg.sender?.card || `QQ用户${msg.user_id || ''}`);

      const isSelf = msg.sub_type === 'send' || msg.post_type === 'send' ||
                     (msg.sender?.user_id === msg.self_id);
      const sender = msg.sender?.card || msg.sender?.nickname || '未知';

      // OneBot 的 time 是秒级数值；这里用 Number() 兜住个别实现给字符串的情况，
      // 否则字符串会混进 timestamp，后面的排序和年份统计全乱
      const timestamp = Number(msg.timestamp) || Number(msg.time) || 0;

      const standardMsg = {
        platform: this.platform,
        messageId: String(msg.message_id || msg.msgId || ''),
        chatId,
        chatName,
        sender: isSelf ? '我' : sender,
        isSelf,
        timestamp,
        type,
        content
      };

      data.messages.push(standardMsg);

      if (!contactMap.has(chatId)) {
        contactMap.set(chatId, {
          name: chatName, platform: this.platform, chatId,
          msgCount: 0, selfMsgCount: 0, lastActive: 0, isGroup
        });
      }
      const contact = contactMap.get(chatId);
      contact.msgCount++;
      if (isSelf) contact.selfMsgCount++;
      if (standardMsg.timestamp > contact.lastActive) contact.lastActive = standardMsg.timestamp;
    }

    data.contacts = Array.from(contactMap.values());
    updateMeta(data);
    return data;
  }

  /**
   * 调用 qce（qchat-cli）导出数据
   *
   * 实际命令（qchat-cli ≥ 0.1.0）：
   *   qce [--account <name>] export <群号|QQ号> --format json -o <目录>
   * 注意旧版 Ember 里写的是 `qchat-cli export --target ...`——二进制名和参数形式都不对。
   *
   * @param {Object} options
   * @param {string} options.target - 群号或好友 QQ 号
   * @param {string} [options.account] - qce 账号名（多账号时用）
   * @param {string} [options.cli] - CLI 可执行名，默认 qce
   * @param {string|number} [options.selfId] - 自己的 QQ 号；不给就自动探测
   * @param {number} [options.limit] - 最多导出多少条（0 = 全部）
   * @param {string} [options.outputDir] - 导出目录（默认 output/temp）
   * @returns {Promise<UnifiedData>}
   */
  async export(options = {}) {
    const cli = options.cli || 'qce';
    const run = options.runner || runCli;   // 可注入，便于在没有 CLI 的环境里测试命令拼装
    const account = options.account ? String(options.account).trim() : '';
    const target = String(options.target || '').trim();

    if (account && !ACCOUNT_RE.test(account)) {
      throw new Error(`账号名不合法: ${account}（只允许字母、数字、下划线和连字符）`);
    }
    if (!QQ_ID_RE.test(target)) {
      throw new Error('需要指定群号或 QQ 号（5-12 位数字），用 --qq-target 传入');
    }

    const outDir = makeExportDir(options.outputDir || 'output/temp', 'qq-export');
    const args = [];
    if (account) args.push('--account', account);
    args.push('export', target, '--format', 'json', '-o', outDir);
    if (options.limit) args.push('--limit', String(Number(options.limit)));

    const result = await run(cli, args);
    if (!result.ok) {
      throw new Error(`qce 导出失败: ${describeFailure(result)}`);
    }

    const file = newestJsonIn(outDir);
    if (!file) {
      throw new Error(`qce 没有产出 JSON（目录: ${outDir}）`);
    }

    const selfId = options.selfId || await this.detectSelfId(cli, account, run);
    return this.load(file, { selfId, chatName: options.chatName });
  }

  /**
   * 反查当前账号自己的 QQ 号：`qce [--account x] login --test` 会打印
   * “用户: 昵称 (1245581875)”，这是唯一能从 CLI 侧拿到的自身身份。
   *
   * 群聊导出里没有 self_id，没有它就分不出哪些消息是自己发的 —— 所以这一步不是可选的锦上添花。
   *
   * @param {string} cli
   * @param {string} account
   * @param {Function} [run] - 执行器（默认 runCli）
   * @returns {Promise<string|null>}
   */
  async detectSelfId(cli, account, run = runCli) {
    const args = [];
    if (account) args.push('--account', account);
    args.push('login', '--test');

    const result = await run(cli, args, { timeoutMs: 30000 });
    if (!result.ok) return null;

    const matched = result.stdout.match(/用户[:：]\s*(.+?)\s*\((\d{5,12})\)/);
    return matched ? matched[2] : null;
  }
}
