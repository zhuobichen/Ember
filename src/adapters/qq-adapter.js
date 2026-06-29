/**
 * QQ 适配器 - 加载已导出的 JSON 并转换为标准格式
 *
 * 支持 OneBot 11 消息格式
 * 解析逻辑已抽取到 core/parsers.js 中共享
 */

import fs from 'fs';
import { createEmptyData, updateMeta, MESSAGE_TYPES, PLATFORMS } from '../core/schema.js';
import { parseQQSegments, detectQQMessageType } from '../core/parsers.js';

export class QQAdapter {
  constructor() {
    this.platform = PLATFORMS.QQ;
  }

  /**
   * 从 JSON 文件加载数据
   * @param {string} filePath - JSON 文件路径
   * @returns {Promise<UnifiedData>}
   */
  async load(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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

      const standardMsg = {
        platform: this.platform,
        messageId: String(msg.message_id || msg.msgId || ''),
        chatId,
        chatName,
        sender: isSelf ? '我' : sender,
        isSelf,
        timestamp: msg.time || msg.timestamp || 0,
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
   * 直接调用 qchat-cli 命令导出数据
   */
  async export(options = {}) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const outputFile = options.output || `./temp/qq-export-${Date.now()}.json`;
    const cmd = `qchat-cli export --target "${options.target || ''}" --type ${options.type || 'private'} --format json --output "${outputFile}"`;

    try {
      await execAsync(cmd);
      return await this.load(outputFile);
    } catch (err) {
      throw new Error(`qchat-cli 导出失败: ${err.message}`);
    }
  }
}
