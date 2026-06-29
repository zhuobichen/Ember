import fs from 'fs';
import { createEmptyData, updateMeta, MESSAGE_TYPES, PLATFORMS } from '../core/schema.js';

const TELEGRAM_TYPE_MAP = {
  message: MESSAGE_TYPES.TEXT,
  photo: MESSAGE_TYPES.IMAGE,
  voice_message: MESSAGE_TYPES.VOICE,
  video_message: MESSAGE_TYPES.VIDEO,
  video: MESSAGE_TYPES.VIDEO,
  document: MESSAGE_TYPES.FILE,
  sticker: MESSAGE_TYPES.EMOJI,
  animation: MESSAGE_TYPES.VIDEO,
  audio: MESSAGE_TYPES.VOICE,
  poll: MESSAGE_TYPES.UNKNOWN,
  location: MESSAGE_TYPES.UNKNOWN,
  contact: MESSAGE_TYPES.UNKNOWN
};

export class TelegramAdapter {
  constructor() {
    this.platform = PLATFORMS.TELEGRAM;
  }

  async load(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return this._parseRawData(raw);
  }

  _parseRawData(raw) {
    const data = createEmptyData();
    data.meta.platforms = [this.platform];
    const contactMap = new Map();

    const chats = raw.chats?.list || raw.chats || (raw.messages ? [raw] : []) || [];

    for (const chat of chats) {
      const chatId = chat.id || chat.chat_id || '';
      const chatName = chat.name || chat.title || `聊天${chatId}`;
      const isGroup = chat.type === 'supergroup' || chat.type === 'group' || chat.type === 'channel';
      const messages = chat.messages || [];

      for (const msg of messages) {
        if (msg.type && msg.type !== 'message') continue;

        const msgType = this._detectMessageType(msg);
        const type = TELEGRAM_TYPE_MAP[msgType] || MESSAGE_TYPES.TEXT;

        const content = this._parseContent(msg, type);
        if (!content && type === MESSAGE_TYPES.TEXT) continue;

        const sender = msg.from || msg.sender_name || '未知';
        const isSelf = msg.from_id?.includes('user') && msg.out === true;

        let timestamp = 0;
        if (msg.date) {
          const ts = new Date(msg.date).getTime();
          if (!isNaN(ts)) timestamp = Math.floor(ts / 1000);
        }

        const standardMsg = {
          platform: this.platform,
          messageId: String(msg.id || ''),
          chatId: String(chatId),
          chatName,
          sender: isSelf ? '我' : sender,
          isSelf,
          timestamp,
          type,
          content
        };

        data.messages.push(standardMsg);

        if (!contactMap.has(String(chatId))) {
          contactMap.set(String(chatId), {
            name: chatName,
            platform: this.platform,
            chatId: String(chatId),
            msgCount: 0,
            selfMsgCount: 0,
            lastActive: 0,
            isGroup
          });
        }
        const contact = contactMap.get(String(chatId));
        contact.msgCount++;
        if (isSelf) contact.selfMsgCount++;
        if (timestamp > contact.lastActive) contact.lastActive = timestamp;
      }
    }

    data.contacts = Array.from(contactMap.values());
    updateMeta(data);
    return data;
  }

  _detectMessageType(msg) {
    if (msg.photo) return 'photo';
    if (msg.voice_message) return 'voice_message';
    if (msg.video_message) return 'video_message';
    if (msg.video) return 'video';
    if (msg.document) return 'document';
    if (msg.sticker) return 'sticker';
    if (msg.animation) return 'animation';
    if (msg.audio) return 'audio';
    if (msg.poll) return 'poll';
    if (msg.location) return 'location';
    if (msg.contact) return 'contact';
    return 'message';
  }

  _parseContent(msg, type) {
    switch (type) {
      case MESSAGE_TYPES.TEXT: {
        if (typeof msg.text === 'string') return msg.text;
        if (Array.isArray(msg.text)) {
          return msg.text.map(part => {
            if (typeof part === 'string') return part;
            if (part.type === 'text') return part.text || '';
            if (part.type === 'link') return part.text || part.href || '[链接]';
            if (part.type === 'mention') return part.text || `@${part.user || ''}`;
            if (part.type === 'bold') return part.text || '';
            if (part.type === 'italic') return part.text || '';
            if (part.type === 'code') return part.text || '';
            if (part.type === 'pre') return part.text || '';
            return part.text || '';
          }).join('');
        }
        return '';
      }
      case MESSAGE_TYPES.IMAGE: {
        let caption = '';
        if (msg.caption) {
          caption = typeof msg.caption === 'string' ? msg.caption :
            (Array.isArray(msg.caption) ? msg.caption.map(p => typeof p === 'string' ? p : (p.text || '')).join('') : '');
        }
        return caption ? `[图片] ${caption}` : '[图片]';
      }
      case MESSAGE_TYPES.VOICE:
        return '[语音]';
      case MESSAGE_TYPES.VIDEO: {
        let caption = '';
        if (msg.caption) {
          caption = typeof msg.caption === 'string' ? msg.caption :
            (Array.isArray(msg.caption) ? msg.caption.map(p => typeof p === 'string' ? p : (p.text || '')).join('') : '');
        }
        return caption ? `[视频] ${caption}` : '[视频]';
      }
      case MESSAGE_TYPES.FILE:
        return `[文件] ${msg.file_name || msg.document?.file_name || ''}`;
      case MESSAGE_TYPES.EMOJI:
        return `[表情] ${msg.sticker?.emoji || ''}`;
      default:
        return msg.text || '[未知消息]';
    }
  }
}
