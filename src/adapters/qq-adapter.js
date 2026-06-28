/**
 * QQ 适配器 - 将 qchat-cli 导出的 JSON 转换为标准格式
 *
 * qchat-cli 导出格式参考:
 * - OneBot 11 消息格式: message_id, user_id, group_id, sender{nickname, card}, message[], time
 * - 消息段类型: text, image, face, record(语音), video, at, reply, json
 *
 * 用法:
 *   import { QQAdapter } from './adapters/qq-adapter.js';
 *   const adapter = new QQAdapter();
 *   const data = await adapter.load('path/to/qchat-export.json');
 */

import fs from 'fs';
import { createEmptyData, updateMeta, MESSAGE_TYPES, PLATFORMS } from '../core/schema.js';

export class QQAdapter {
  constructor() {
    this.platform = PLATFORMS.QQ;
  }

  /**
   * 从 qchat-cli 导出的 JSON 文件加载数据
   * @param {string} filePath - JSON 文件路径
   * @returns {Promise<UnifiedData>}
   */
  async load(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // qchat-cli 导出可能是数组或对象
    const messages = Array.isArray(raw) ? raw : (raw.messages || raw.data || []);

    const data = createEmptyData();
    const contactMap = new Map();

    for (const msg of messages) {
      // 解析 OneBot 11 消息段
      const content = this._parseMessageSegments(msg.message || msg.content);
      const type = this._detectMessageType(msg.message || msg.content);

      // 判断是否群聊
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
        chatId: chatId,
        chatName: chatName,
        sender: isSelf ? '我' : sender,
        isSelf: isSelf,
        timestamp: msg.time || msg.timestamp || 0,
        type: type,
        content: content
      };

      data.messages.push(standardMsg);

      // 更新联系人统计
      if (!contactMap.has(chatId)) {
        contactMap.set(chatId, {
          name: chatName,
          platform: this.platform,
          chatId: chatId,
          msgCount: 0,
          selfMsgCount: 0,
          lastActive: 0,
          isGroup: isGroup
        });
      }
      const contact = contactMap.get(chatId);
      contact.msgCount++;
      if (isSelf) contact.selfMsgCount++;
      if (standardMsg.timestamp > contact.lastActive) {
        contact.lastActive = standardMsg.timestamp;
      }
    }

    data.contacts = Array.from(contactMap.values());
    updateMeta(data);
    return data;
  }

  /**
   * 解析 OneBot 11 消息段数组为纯文本
   * @param {Array|String} segments - 消息段
   */
  _parseMessageSegments(segments) {
    if (typeof segments === 'string') return segments;
    if (!Array.isArray(segments)) return '';

    const parts = [];
    for (const seg of segments) {
      switch (seg.type) {
        case 'text':
          parts.push(seg.data?.text || '');
          break;
        case 'image':
          parts.push('[图片]');
          break;
        case 'face':
        case 'mface':
          parts.push('[表情]');
          break;
        case 'record':
          parts.push('[语音]');
          break;
        case 'video':
          parts.push('[视频]');
          break;
        case 'at':
          parts.push(`@${seg.data?.qq || ''}`);
          break;
        case 'reply':
          parts.push('[回复]');
          break;
        case 'json':
          parts.push('[JSON消息]');
          break;
        case 'forward':
          parts.push('[转发消息]');
          break;
        case 'file':
          parts.push(`[文件] ${seg.data?.file || ''}`);
          break;
        default:
          parts.push(`[${seg.type}]`);
      }
    }
    return parts.join('');
  }

  /**
   * 从消息段推断消息类型
   */
  _detectMessageType(segments) {
    if (typeof segments === 'string') return MESSAGE_TYPES.TEXT;
    if (!Array.isArray(segments) || segments.length === 0) return MESSAGE_TYPES.UNKNOWN;

    // 如果只有文本段，则为文本消息
    const types = new Set(segments.map(s => s.type));
    if (types.size === 1 && types.has('text')) return MESSAGE_TYPES.TEXT;
    if (types.has('image')) return MESSAGE_TYPES.IMAGE;
    if (types.has('record')) return MESSAGE_TYPES.VOICE;
    if (types.has('video')) return MESSAGE_TYPES.VIDEO;
    if (types.has('face') || types.has('mface')) return MESSAGE_TYPES.EMOJI;
    if (types.has('json')) return MESSAGE_TYPES.LINK;

    return MESSAGE_TYPES.TEXT;
  }

  /**
   * 直接调用 qchat-cli 命令导出数据
   * @param {Object} options - { target, type, format, output }
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
