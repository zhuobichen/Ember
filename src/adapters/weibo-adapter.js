import fs from 'fs';
import { createEmptyData, updateMeta, MESSAGE_TYPES, PLATFORMS } from '../core/schema.js';

export class WeiboAdapter {
  constructor() {
    this.platform = PLATFORMS.WEIBO;
  }

  async load(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return this._parseRawData(raw);
  }

  _parseRawData(raw) {
    const data = createEmptyData();
    data.meta.platforms = [this.platform];
    const contactMap = new Map();

    const weibos = raw.weibos || raw.data || raw.statuses || (Array.isArray(raw) ? raw : []) || [];

    for (const weibo of weibos) {
      const weiboId = weibo.id || weibo.mid || weibo.bid || '';
      const weiboText = weibo.text || weibo.content || weibo.status_content || '';
      const createdAt = weibo.created_at || weibo.createTime || weibo.timestamp || '';
      const isSelf = weibo.isSelf || weibo.is_self || false;
      const userName = weibo.user?.screen_name || weibo.user?.name || weibo.userName || '我';

      let timestamp = 0;
      if (createdAt) {
        if (typeof createdAt === 'number') {
          timestamp = createdAt > 1e12 ? Math.floor(createdAt / 1000) : createdAt;
        } else {
          const ts = new Date(createdAt).getTime();
          if (!isNaN(ts)) timestamp = Math.floor(ts / 1000);
        }
      }

      let content = weiboText;
      if (weibo.pics && weibo.pics.length > 0) {
        content += `\n[图片 x${weibo.pics.length}]`;
      }
      if (weibo.retweeted_status) {
        const rt = weibo.retweeted_status;
        const rtUser = rt.user?.screen_name || rt.user?.name || '';
        const rtText = rt.text || rt.content || '';
        content += `\n[转发] @${rtUser}: ${rtText}`;
      }

      const chatId = 'weibo_posts';
      const chatName = '我的微博';

      data.messages.push({
        platform: this.platform,
        messageId: `weibo_${weiboId}`,
        chatId,
        chatName,
        sender: isSelf ? '我' : userName,
        isSelf,
        timestamp,
        type: MESSAGE_TYPES.TEXT,
        content
      });

      if (!contactMap.has(chatId)) {
        contactMap.set(chatId, {
          name: chatName,
          platform: this.platform,
          chatId,
          msgCount: 0,
          selfMsgCount: 0,
          lastActive: 0,
          isGroup: false
        });
      }
      const contact = contactMap.get(chatId);
      contact.msgCount++;
      if (isSelf) contact.selfMsgCount++;
      if (timestamp > contact.lastActive) contact.lastActive = timestamp;

      if (weibo.comments && weibo.comments.length > 0) {
        for (const comment of weibo.comments) {
          const commentId = comment.id || '';
          const commentText = comment.text || comment.content || '';
          const commentTime = comment.created_at || comment.create_time || '';
          const commentUser = comment.user?.screen_name || comment.user?.name || comment.commenter || '匿名';

          let commentTimestamp = 0;
          if (commentTime) {
            if (typeof commentTime === 'number') {
              commentTimestamp = commentTime > 1e12 ? Math.floor(commentTime / 1000) : commentTime;
            } else {
              const ts = new Date(commentTime).getTime();
              if (!isNaN(ts)) commentTimestamp = Math.floor(ts / 1000);
            }
          }

          const commentChatId = `weibo_comments_${weiboId}`;
          const commentChatName = `微博评论 (${weiboId.substring(0, 8)})`;

          data.messages.push({
            platform: this.platform,
            messageId: `weibo_comment_${commentId}`,
            chatId: commentChatId,
            chatName: commentChatName,
            sender: commentUser,
            isSelf: false,
            timestamp: commentTimestamp,
            type: MESSAGE_TYPES.TEXT,
            content: commentText
          });

          if (!contactMap.has(commentChatId)) {
            contactMap.set(commentChatId, {
              name: commentChatName,
              platform: this.platform,
              chatId: commentChatId,
              msgCount: 0,
              selfMsgCount: 0,
              lastActive: 0,
              isGroup: true
            });
          }
          const cContact = contactMap.get(commentChatId);
          cContact.msgCount++;
          if (commentTimestamp > cContact.lastActive) cContact.lastActive = commentTimestamp;
        }
      }

      if (weibo.reposts && weibo.reposts.length > 0) {
        for (const repost of weibo.reposts) {
          const repostId = repost.id || '';
          const repostText = repost.text || repost.content || '';
          const repostTime = repost.created_at || repost.create_time || '';
          const repostUser = repost.user?.screen_name || repost.user?.name || '匿名';

          let repostTimestamp = 0;
          if (repostTime) {
            if (typeof repostTime === 'number') {
              repostTimestamp = repostTime > 1e12 ? Math.floor(repostTime / 1000) : repostTime;
            } else {
              const ts = new Date(repostTime).getTime();
              if (!isNaN(ts)) repostTimestamp = Math.floor(ts / 1000);
            }
          }

          const repostChatId = `weibo_reposts_${weiboId}`;
          const repostChatName = `微博转发 (${weiboId.substring(0, 8)})`;

          data.messages.push({
            platform: this.platform,
            messageId: `weibo_repost_${repostId}`,
            chatId: repostChatId,
            chatName: repostChatName,
            sender: repostUser,
            isSelf: false,
            timestamp: repostTimestamp,
            type: MESSAGE_TYPES.TEXT,
            content: repostText
          });

          if (!contactMap.has(repostChatId)) {
            contactMap.set(repostChatId, {
              name: repostChatName,
              platform: this.platform,
              chatId: repostChatId,
              msgCount: 0,
              selfMsgCount: 0,
              lastActive: 0,
              isGroup: true
            });
          }
          const rContact = contactMap.get(repostChatId);
          rContact.msgCount++;
          if (repostTimestamp > rContact.lastActive) rContact.lastActive = repostTimestamp;
        }
      }
    }

    data.contacts = Array.from(contactMap.values());
    updateMeta(data);
    return data;
  }
}
