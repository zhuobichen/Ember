/**
 * 飞书适配器 - 通过 lark-cli 获取飞书消息并转换为标准格式
 *
 * lark-cli 已全局安装（npm install -g @larksuite/cli）
 * 核心命令:
 *   lark-cli im chats list --page-all          → 获取所有群聊列表
 *   lark-cli im +chat-messages-list --chat-id <id> --start <iso> --end <iso> --page-all
 *                                               → 获取指定聊天消息
 *   lark-cli im +messages-search --query <kw>   → 搜索消息
 *
 * 消息格式参考飞书开放平台 IM API:
 *   消息体: { message_id, chat_id, chat_name, sender{id,name}, create_time, message_type, body }
 *   消息类型: text, post, image, file, audio, video, sticker, interactive, share_chat, share_user
 *
 * 用法:
 *   import { FeishuAdapter } from './adapters/feishu-adapter.js';
 *   const adapter = new FeishuAdapter();
 *   const data = await adapter.export({ startTime: '2023-01-01', endTime: '2024-01-01' });
 *   // 或从已导出的 JSON 加载
 *   const data = await adapter.load('path/to/feishu-export.json');
 */

import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createEmptyData, updateMeta, MESSAGE_TYPES, PLATFORMS } from '../core/schema.js';

const execAsync = promisify(exec);

// 飞书消息类型映射
const FEISHU_TYPE_MAP = {
  text: MESSAGE_TYPES.TEXT,
  post: MESSAGE_TYPES.TEXT,       // 富文本，按文本处理
  image: MESSAGE_TYPES.IMAGE,
  file: MESSAGE_TYPES.FILE,
  audio: MESSAGE_TYPES.VOICE,
  video: MESSAGE_TYPES.VIDEO,
  sticker: MESSAGE_TYPES.EMOJI,
  interactive: MESSAGE_TYPES.UNKNOWN,  // 卡片消息
  share_chat: MESSAGE_TYPES.LINK,      // 分享群聊
  share_user: MESSAGE_TYPES.LINK,      // 分享用户
  system: MESSAGE_TYPES.SYSTEM
};

export class FeishuAdapter {
  constructor() {
    this.platform = PLATFORMS.FEISHU;
    this.cliCommand = 'lark-cli';
  }

  /**
   * 从 lark-cli 导出的 JSON 文件加载数据
   * @param {string} filePath - JSON 文件路径
   * @returns {Promise<UnifiedData>}
   */
  async load(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return this._parseRawData(raw);
  }

  /**
   * 通过 lark-cli 直接导出数据
   * @param {Object} options
   * @param {string} options.startTime - 开始时间 ISO 8601 (如 '2023-01-01T00:00:00+08:00')
   * @param {string} options.endTime - 结束时间 ISO 8601
   * @param {string} [options.chatId] - 指定聊天 ID（不指定则获取所有群聊）
   * @param {string} [options.outputDir] - 临时输出目录
   * @returns {Promise<UnifiedData>}
   */
  async export(options = {}) {
    const outputDir = options.outputDir || './temp';
    fs.mkdirSync(outputDir, { recursive: true });

    let chatList = [];

    // 如果指定了 chatId，只获取该聊天；否则获取所有群聊
    if (options.chatId) {
      chatList = [{ chat_id: options.chatId, name: '指定聊天' }];
    } else {
      console.log('  [飞书] 获取群聊列表...');
      chatList = await this._getChatList(outputDir);
      console.log(`  [飞书] 找到 ${chatList.length} 个聊天`);
    }

    // 获取每个聊天的消息
    const allMessages = [];
    for (const chat of chatList) {
      console.log(`  [飞书] 获取聊天消息: ${chat.name || chat.chat_id}`);
      const messages = await this._getChatMessages(chat.chat_id, options.startTime, options.endTime, outputDir);
      allMessages.push(...messages);
    }

    // 合并并转换为标准格式
    const rawData = { items: allMessages, chat_list: chatList };
    return this._parseRawData(rawData);
  }

  /**
   * 获取群聊列表
   */
  async _getChatList(outputDir) {
    const outputFile = `${outputDir}/feishu-chats-${Date.now()}.json`;
    const cmd = `${this.cliCommand} im chats list --page-all --page-limit 50 --format json`;

    try {
      const { stdout } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });
      const data = JSON.parse(stdout);

      // 飞书返回格式: { items: [{ chat_id, name, description, chat_type, ... }] }
      const items = data.items || data.data?.items || [];
      return items.map(c => ({
        chat_id: c.chat_id,
        name: c.name || c.avatar?.name || '未命名聊天',
        chat_type: c.chat_type || 'group',
        owner_id: c.owner_id,
        member_count: c.member_count || 0
      }));
    } catch (err) {
      console.warn(`  [飞书] 获取群聊列表失败: ${err.message}`);
      return [];
    }
  }

  /**
   * 获取指定聊天的消息
   */
  async _getChatMessages(chatId, startTime, endTime, outputDir) {
    const args = [
      `${this.cliCommand} im +chat-messages-list`,
      `--chat-id "${chatId}"`,
      '--page-size 50',
      '--page-all',
      '--page-limit 100',
      '--sort asc',
      '--format json'
    ];

    if (startTime) args.push(`--start "${startTime}"`);
    if (endTime) args.push(`--end "${endTime}"`);

    const cmd = args.join(' ');

    try {
      const { stdout } = await execAsync(cmd, { maxBuffer: 100 * 1024 * 1024 });
      const data = JSON.parse(stdout);

      // 飞书返回格式: { items: [{ message_id, chat_id, sender, create_time, message_type, body }] }
      const items = data.items || data.data?.items || [];
      return items;
    } catch (err) {
      console.warn(`  [飞书] 获取聊天 ${chatId} 消息失败: ${err.message}`);
      return [];
    }
  }

  /**
   * 将飞书原始消息数据解析为标准格式
   */
  _parseRawData(raw) {
    const data = createEmptyData();
    const contactMap = new Map();

    // 支持多种输入格式
    const messages = raw.items || raw.messages || raw.data?.items || (Array.isArray(raw) ? raw : []);
    const chatList = raw.chat_list || raw.chats || [];

    // 构建 chatId → chatName 映射
    const chatNameMap = new Map();
    for (const chat of chatList) {
      chatNameMap.set(chat.chat_id, chat.name || '未命名聊天');
    }

    for (const msg of messages) {
      const msgType = msg.message_type || msg.msg_type || 'text';
      const type = FEISHU_TYPE_MAP[msgType] || MESSAGE_TYPES.UNKNOWN;

      // 系统消息跳过
      if (type === MESSAGE_TYPES.SYSTEM) continue;

      // 解析内容
      const content = this._parseMessageContent(msg, type);

      // 解析发送者
      const sender = msg.sender?.name || msg.sender?.id || '未知';
      const isSelf = msg.sender?.id_type === 'app' || false; // 简化判断

      const chatId = msg.chat_id || '';
      const chatName = chatNameMap.get(chatId) || msg.chat_name || '飞书聊天';

      const timestamp = this._parseTimestamp(msg.create_time || msg.create_time_str);

      const standardMsg = {
        platform: this.platform,
        messageId: msg.message_id || '',
        chatId: chatId,
        chatName: chatName,
        sender: isSelf ? '我' : sender,
        isSelf: isSelf,
        timestamp: timestamp,
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
          isGroup: true // 飞书聊天默认按群聊处理
        });
      }
      const contact = contactMap.get(chatId);
      contact.msgCount++;
      if (isSelf) contact.selfMsgCount++;
      if (timestamp > contact.lastActive) contact.lastActive = timestamp;
    }

    data.contacts = Array.from(contactMap.values());
    updateMeta(data);
    return data;
  }

  /**
   * 解析飞书消息内容
   * 飞书消息体格式: { body: { content: '{"text":"消息内容"}' } }
   * content 是 JSON 字符串，结构因消息类型而异
   */
  _parseMessageContent(msg, type) {
    const rawContent = msg.body?.content || msg.content || '';

    switch (type) {
      case MESSAGE_TYPES.TEXT:
        return this._parseTextContent(rawContent);

      case MESSAGE_TYPES.IMAGE:
        return '[图片]';

      case MESSAGE_TYPES.VOICE:
        return '[语音]';

      case MESSAGE_TYPES.VIDEO:
        return '[视频]';

      case MESSAGE_TYPES.EMOJI:
        return '[表情]';

      case MESSAGE_TYPES.FILE:
        return this._parseFileContent(rawContent);

      case MESSAGE_TYPES.LINK:
        return this._parseShareContent(rawContent);

      default:
        // 尝试提取文本
        return this._parseTextContent(rawContent) || '[未知消息]';
    }
  }

  /**
   * 解析文本消息内容
   * 飞书文本消息 content: {"text":"消息内容"}
   * 富文本(post) content: {"title":"标题","content":[[{"tag":"text","text":"段落"}]]}
   */
  _parseTextContent(rawContent) {
    if (!rawContent) return '';

    try {
      const parsed = JSON.parse(rawContent);

      // 纯文本
      if (parsed.text) return parsed.text;

      // 富文本 post
      if (parsed.content && Array.isArray(parsed.content)) {
        const parts = [];
        for (const paragraph of parsed.content) {
          if (Array.isArray(paragraph)) {
            for (const node of paragraph) {
              if (node.tag === 'text') parts.push(node.text || '');
              else if (node.tag === 'a') parts.push(node.text || node.href || '[链接]');
              else if (node.tag === 'at') parts.push(`@${node.user_name || node.user_id || ''}`);
              else if (node.tag === 'img') parts.push('[图片]');
            }
            parts.push('\n');
          }
        }
        return parts.join('').trim();
      }

      return rawContent;
    } catch {
      // 不是 JSON，直接返回原文
      return rawContent;
    }
  }

  /**
   * 解析文件消息
   */
  _parseFileContent(rawContent) {
    try {
      const parsed = JSON.parse(rawContent);
      return `[文件] ${parsed.file_name || ''}`;
    } catch {
      return '[文件]';
    }
  }

  /**
   * 解析分享消息
   */
  _parseShareContent(rawContent) {
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed.title) return `[分享] ${parsed.title}`;
      if (parsed.user_name) return `[分享用户] ${parsed.user_name}`;
      if (parsed.chat_name) return `[分享群聊] ${parsed.chat_name}`;
      return '[分享]';
    } catch {
      return '[分享]';
    }
  }

  /**
   * 解析飞书时间戳
   * 飞书 create_time 可能是字符串形式的秒级时间戳，或 ISO 8601
   */
  _parseTimestamp(timeStr) {
    if (!timeStr) return 0;

    // 纯数字（秒级时间戳）
    if (/^\d+$/.test(timeStr)) {
      return parseInt(timeStr);
    }

    // ISO 8601
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      return Math.floor(date.getTime() / 1000);
    }

    return 0;
  }
}
