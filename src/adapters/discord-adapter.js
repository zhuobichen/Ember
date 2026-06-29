import fs from 'fs';
import { createEmptyData, updateMeta, MESSAGE_TYPES, PLATFORMS } from '../core/schema.js';

export class DiscordAdapter {
  constructor() {
    this.platform = PLATFORMS.DISCORD;
  }

  async load(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return this._parseRawData(raw);
  }

  _parseRawData(raw) {
    const data = createEmptyData();
    data.meta.platforms = [this.platform];
    const contactMap = new Map();

    const exports = Array.isArray(raw) ? raw : (raw.exports ? raw.exports : [raw]);

    for (const exp of exports) {
      const guild = exp.guild || {};
      const channel = exp.channel || {};
      const messages = exp.messages || channel.messages || [];

      const guildName = guild.name || 'DM';
      const guildId = guild.id || 'dm';
      const channelName = channel.name || '私聊';
      const channelId = channel.id || '';
      const isGroup = !!guild.id || channel.type === 0 || channel.type === 'GuildTextChat';

      const chatId = isGroup ? `${guildId}_${channelId}` : `dm_${channelId}`;
      const chatName = isGroup ? `${guildName} / ${channelName}` : (channel.recipients?.map(r => r.name).join(', ') || channelName);

      for (const msg of messages) {
        const type = this._detectMessageType(msg);
        const content = this._parseContent(msg, type);

        if (!content && type === MESSAGE_TYPES.TEXT) continue;

        const sender = msg.author?.name || msg.author?.username || '未知';
        const isSelf = msg.author?.isSelf || false;

        let timestamp = 0;
        if (msg.timestamp) {
          const ts = new Date(msg.timestamp).getTime();
          if (!isNaN(ts)) timestamp = Math.floor(ts / 1000);
        }

        const standardMsg = {
          platform: this.platform,
          messageId: String(msg.id || ''),
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
            name: chatName,
            platform: this.platform,
            chatId,
            msgCount: 0,
            selfMsgCount: 0,
            lastActive: 0,
            isGroup
          });
        }
        const contact = contactMap.get(chatId);
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
    if (msg.attachments && msg.attachments.length > 0) {
      const first = msg.attachments[0];
      if (first?.contentType?.startsWith('image/')) return MESSAGE_TYPES.IMAGE;
      if (first?.contentType?.startsWith('video/')) return MESSAGE_TYPES.VIDEO;
      if (first?.contentType?.startsWith('audio/')) return MESSAGE_TYPES.VOICE;
      return MESSAGE_TYPES.FILE;
    }
    if (msg.embeds && msg.embeds.length > 0) {
      return MESSAGE_TYPES.LINK;
    }
    if (msg.type === 'Default' || msg.type === 0 || !msg.type) {
      return MESSAGE_TYPES.TEXT;
    }
    return MESSAGE_TYPES.UNKNOWN;
  }

  _parseContent(msg, type) {
    switch (type) {
      case MESSAGE_TYPES.TEXT:
        return msg.content || '';
      case MESSAGE_TYPES.IMAGE: {
        let text = msg.content || '';
        const imgCount = (msg.attachments || []).filter(a => a.contentType?.startsWith('image/')).length;
        const imgText = imgCount > 0 ? `[图片 x${imgCount}]` : '[图片]';
        return text ? `${imgText} ${text}` : imgText;
      }
      case MESSAGE_TYPES.VIDEO: {
        let text = msg.content || '';
        const videoCount = (msg.attachments || []).filter(a => a.contentType?.startsWith('video/')).length;
        const videoText = videoCount > 0 ? `[视频 x${videoCount}]` : '[视频]';
        return text ? `${videoText} ${text}` : videoText;
      }
      case MESSAGE_TYPES.VOICE: {
        let text = msg.content || '';
        return text ? `[语音] ${text}` : '[语音]';
      }
      case MESSAGE_TYPES.FILE: {
        let text = msg.content || '';
        const files = (msg.attachments || []).map(a => a.fileName || a.name || '').filter(Boolean);
        const fileText = files.length > 0 ? `[文件] ${files.join(', ')}` : '[文件]';
        return text ? `${fileText} ${text}` : fileText;
      }
      case MESSAGE_TYPES.LINK: {
        let text = msg.content || '';
        const embeds = msg.embeds || [];
        const embedTexts = embeds.map(e => {
          if (e.title && e.url) return `[嵌入] ${e.title} - ${e.url}`;
          if (e.title) return `[嵌入] ${e.title}`;
          if (e.description) return `[嵌入] ${e.description.substring(0, 100)}`;
          return '[嵌入]';
        });
        const allEmbeds = embedTexts.join('\n');
        return text ? `${text}\n${allEmbeds}` : allEmbeds;
      }
      default:
        return msg.content || '[未知消息]';
    }
  }
}
