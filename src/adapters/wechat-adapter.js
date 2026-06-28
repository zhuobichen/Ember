/**
 * 微信适配器 - 将 weflow-cli 导出的 JSON 转换为标准格式
 *
 * weflow-cli 导出格式参考:
 * - 消息字段: localId, serverId, localType, createTime, isSend, senderUsername, content, parsedContent, appTitle...
 * - 消息类型: 1=文本, 3=图片, 34=语音, 43=视频, 47=表情, 49=AppMsg, 10000=系统
 *
 * 用法:
 *   import { WechatAdapter } from './adapters/wechat-adapter.js';
 *   const adapter = new WechatAdapter();
 *   const data = await adapter.load('path/to/weflow-export.json');
 */

import fs from 'fs';
import { createEmptyData, updateMeta, MESSAGE_TYPES, PLATFORMS } from '../core/schema.js';

// weflow-cli 消息类型映射
const WECHAT_TYPE_MAP = {
  1: MESSAGE_TYPES.TEXT,
  3: MESSAGE_TYPES.IMAGE,
  34: MESSAGE_TYPES.VOICE,
  43: MESSAGE_TYPES.VIDEO,
  47: MESSAGE_TYPES.EMOJI,
  49: MESSAGE_TYPES.LINK,
  10000: MESSAGE_TYPES.SYSTEM,
  10002: MESSAGE_TYPES.UNKNOWN
};

export class WechatAdapter {
  constructor() {
    this.platform = PLATFORMS.WECHAT;
  }

  /**
   * 从 weflow-cli 导出的 JSON 文件加载数据
   * 也支持已转换为标准格式的数据（如提取器输出）
   * @param {string} filePath - JSON 文件路径
   * @returns {Promise<UnifiedData>}
   */
  async load(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 如果已经是标准格式（提取器输出），直接返回
    if (raw.meta && raw.messages && Array.isArray(raw.messages) &&
        raw.messages.length > 0 && raw.messages[0].platform) {
      return raw;
    }

    // weflow 导出可能是数组（单聊天）或对象（多聊天）
    const chats = Array.isArray(raw) ? [{ messages: raw }] : (raw.chats || [raw]);

    const data = createEmptyData();
    const contactMap = new Map();

    for (const chat of chats) {
      const chatName = chat.name || chat.nickName || chat.strNickName || '未知';
      const chatId = chat.id || chat.username || chat.strTalker || chatName;
      const messages = chat.messages || chat.msgList || chat;

      let msgCount = 0;
      let selfMsgCount = 0;
      let lastActive = 0;

      for (const msg of messages) {
        const type = WECHAT_TYPE_MAP[msg.localType || msg.type] || MESSAGE_TYPES.UNKNOWN;

        // 系统消息跳过
        if (type === MESSAGE_TYPES.SYSTEM) continue;

        // 解析内容
        let content = '';
        switch (type) {
          case MESSAGE_TYPES.TEXT:
            content = msg.parsedContent || msg.content || '';
            break;
          case MESSAGE_TYPES.IMAGE:
            content = '[图片]';
            break;
          case MESSAGE_TYPES.VOICE:
            content = '[语音]';
            break;
          case MESSAGE_TYPES.VIDEO:
            content = '[视频]';
            break;
          case MESSAGE_TYPES.EMOJI:
            content = '[表情]';
            break;
          case MESSAGE_TYPES.LINK:
            content = msg.appTitle ? `[链接] ${msg.appTitle}` : '[链接]';
            if (msg.appDescription) content += ` - ${msg.appDescription}`;
            break;
          default:
            content = msg.parsedContent || msg.content || '[未知消息]';
        }

        const isSelf = msg.isSend === 1 || msg.isSend === true;
        const sender = isSelf ? '我' : (msg.senderNickname || chatName);

        const standardMsg = {
          platform: this.platform,
          messageId: String(msg.localId || msg.local_id || msg.serverId || ''),
          chatId: String(chatId),
          chatName: chatName,
          sender: sender,
          isSelf: isSelf,
          timestamp: msg.createTime || msg.create_time || 0,
          type: type,
          content: content
        };

        data.messages.push(standardMsg);
        msgCount++;
        if (isSelf) selfMsgCount++;
        if (standardMsg.timestamp > lastActive) lastActive = standardMsg.timestamp;
      }

      if (msgCount > 0) {
        contactMap.set(String(chatId), {
          name: chatName,
          platform: this.platform,
          chatId: String(chatId),
          msgCount: msgCount,
          selfMsgCount: selfMsgCount,
          lastActive: lastActive,
          isGroup: chat.isGroup || false
        });
      }
    }

    data.contacts = Array.from(contactMap.values());
    updateMeta(data);
    return data;
  }

  /**
   * 直接调用 weflow-cli 命令导出数据
   * @param {Object} options - { talker, format, output }
   */
  async export(options = {}) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const outputFile = options.output || `./temp/wechat-export-${Date.now()}.json`;
    const cmd = `weflow-cli chat export --talker "${options.talker || ''}" --format json --output "${outputFile}"`;

    try {
      await execAsync(cmd);
      return await this.load(outputFile);
    } catch (err) {
      throw new Error(`weflow-cli 导出失败: ${err.message}`);
    }
  }
}
