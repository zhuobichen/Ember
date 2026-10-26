/**
 * 共享消息解析器 - 微信/QQ/飞书消息类型映射与内容提取
 *
 * extractor.js 和 adapters/ 共同复用，消除重复代码
 */

import { MESSAGE_TYPES, PLATFORMS } from './schema.js';

// ==================== 微信消息类型映射 ====================
export const WECHAT_TYPE_MAP = {
  1: MESSAGE_TYPES.TEXT,    3: MESSAGE_TYPES.IMAGE,   34: MESSAGE_TYPES.VOICE,
  43: MESSAGE_TYPES.VIDEO,  47: MESSAGE_TYPES.EMOJI,  49: MESSAGE_TYPES.LINK,
  10000: MESSAGE_TYPES.SYSTEM, 10002: MESSAGE_TYPES.UNKNOWN
};

// ==================== 飞书消息类型映射 ====================
export const FEISHU_TYPE_MAP = {
  text: MESSAGE_TYPES.TEXT,    post: MESSAGE_TYPES.TEXT,
  image: MESSAGE_TYPES.IMAGE,  file: MESSAGE_TYPES.FILE,
  audio: MESSAGE_TYPES.VOICE,  video: MESSAGE_TYPES.VIDEO,
  sticker: MESSAGE_TYPES.EMOJI, interactive: MESSAGE_TYPES.UNKNOWN,
  share_chat: MESSAGE_TYPES.LINK, share_user: MESSAGE_TYPES.LINK
};

// ==================== 微信消息解析 ====================

/**
 * 从 weflow-cli 导出格式或标准格式解析微信消息
 * @param {Object} raw - 原始数据
 * @param {{ chatName?: string, chatId?: string }} [opts] - 会话名提示（weflow-v1 信封里没有会话名）
 * @returns {Object|null} 标准格式 data 或 null
 */
export function parseWechatRaw(raw, opts = {}) {
  // 如果已经是标准格式，直接返回
  if (raw.meta && raw.messages && Array.isArray(raw.messages) &&
      raw.messages.length > 0 && raw.messages[0].platform) {
    return raw;
  }

  const data = {
    meta: { generatedAt: new Date().toISOString(), platforms: [PLATFORMS.WECHAT], totalMessages: 0, timeRange: { start: 0, end: 0 } },
    messages: [],
    contacts: []
  };

  const contactMap = new Map();
  // weflow-v1 信封（{ schema: 'weflow-message/v1', messages: [...] }）里只有消息、
  // 没有会话名 —— 会话名由调用方从导出文件名给出，这里统一包成“单个 chat”的形状。
  const chats = isWeflowEnvelope(raw)
    ? [{ name: opts.chatName, id: opts.chatId, messages: raw.messages }]
    : (Array.isArray(raw) ? [{ messages: raw }] : (raw.chats || [raw]));

  for (const chat of chats) {
    const chatName = chat.name || opts.chatName || chat.nickName || chat.strNickName || '未知';
    const chatId = chat.id || chat.username || chat.strTalker || chatName;
    const messages = chat.messages || chat.msgList || chat;
    let msgCount = 0, selfMsgCount = 0, lastActive = 0;

    for (const msg of messages) {
      const type = WECHAT_TYPE_MAP[msg.localType || msg.type] || MESSAGE_TYPES.UNKNOWN;
      if (type === MESSAGE_TYPES.SYSTEM) continue;

      let content = '';
      switch (type) {
        case MESSAGE_TYPES.TEXT:
          content = msg.parsedContent || msg.content || '';
          break;
        case MESSAGE_TYPES.IMAGE: content = '[图片]'; break;
        case MESSAGE_TYPES.VOICE: content = '[语音]'; break;
        case MESSAGE_TYPES.VIDEO: content = '[视频]'; break;
        case MESSAGE_TYPES.EMOJI: content = '[表情]'; break;
        case MESSAGE_TYPES.LINK:
          content = msg.appTitle ? `[链接] ${msg.appTitle}` : '[链接]';
          if (msg.appDescription) content += ` - ${msg.appDescription}`;
          break;
        default:
          content = msg.parsedContent || msg.content || '[未知消息]';
      }

      const isSelf = msg.isSend === 1 || msg.isSend === true;
      data.messages.push({
        platform: PLATFORMS.WECHAT,
        messageId: String(msg.localId || msg.local_id || msg.serverId || ''),
        chatId: String(chatId),
        chatName,
        sender: isSelf ? '我' : (msg.senderNickname || chatName),
        isSelf,
        timestamp: msg.createTime || msg.create_time || 0,
        type,
        content
      });

      msgCount++;
      if (isSelf) selfMsgCount++;
      if (data.messages[data.messages.length - 1].timestamp > lastActive)
        lastActive = data.messages[data.messages.length - 1].timestamp;
    }

    if (msgCount > 0) {
      contactMap.set(String(chatId), {
        name: chatName, platform: PLATFORMS.WECHAT, chatId: String(chatId),
        msgCount, selfMsgCount, lastActive, isGroup: chat.isGroup || false
      });
    }
  }

  data.contacts = Array.from(contactMap.values());
  updateMeta(data);
  return data;
}

// ==================== QQ 消息解析 ====================

/**
 * 解析 QQ OneBot 消息段
 * @param {Array} segments - 消息段数组
 * @returns {string} 提取的文本内容
 */
export function parseQQSegments(segments) {
  if (!Array.isArray(segments)) return '';
  const parts = [];
  for (const seg of segments) {
    switch (seg.type) {
      case 'text': parts.push(seg.data?.text || ''); break;
      case 'face': parts.push(`[表情]`); break;
      case 'image': parts.push(`[图片]`); break;
      case 'record': parts.push(`[语音]`); break;
      case 'video': parts.push(`[视频]`); break;
      case 'at': parts.push(`@${seg.data?.qq || ''}`); break;
      case 'reply': parts.push(`[回复]`); break;
      case 'forward': parts.push(`[转发消息]`); break;
      case 'json': parts.push(`[JSON消息]`); break;
      case 'xml': parts.push(`[XML消息]`); break;
      default: parts.push(`[${seg.type}]`); break;
    }
  }
  return parts.join('').trim();
}

/**
 * 检测 QQ 消息段的消息类型
 * @param {Array} segments - 消息段数组
 * @returns {string} MESSAGE_TYPES 中的值
 */
export function detectQQMessageType(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return MESSAGE_TYPES.UNKNOWN;
  if (segments.length === 1 && segments[0].type === 'text') return MESSAGE_TYPES.TEXT;
  for (const seg of segments) {
    if (seg.type === 'image') return MESSAGE_TYPES.IMAGE;
    if (seg.type === 'record') return MESSAGE_TYPES.VOICE;
    if (seg.type === 'video') return MESSAGE_TYPES.VIDEO;
    if (seg.type === 'face') return MESSAGE_TYPES.EMOJI;
    if (seg.type === 'reply' || seg.type === 'json' || seg.type === 'xml') return MESSAGE_TYPES.LINK;
  }
  return MESSAGE_TYPES.TEXT;
}

// ==================== weflow-cli 数据契约 ====================

/**
 * 判断是否为 weflow-cli 的 weflow-v1 信封
 * 形态: { schema: 'weflow-message/v1', source: 'weflow-cli', generatedAt, messages: [...] }
 * 旧版 raw 契约直接就是消息数组，不走这里。
 * @param {any} raw
 * @returns {boolean}
 */
export function isWeflowEnvelope(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  return raw.schema === 'weflow-message/v1' ||
    (raw.source === 'weflow-cli' && Array.isArray(raw.messages));
}

// ==================== qce（qchat-cli）导出格式 ====================

/**
 * 判断是否为 qce `export --format json` 的产物
 * 形态: { session: { type, id, name }, exportTime, messageCount, messages: [...] }
 * @param {any} raw
 * @returns {boolean}
 */
export function isQceExport(raw) {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw) &&
    !!raw.session && Array.isArray(raw.messages);
}

/**
 * 解析 qce 的 `time` 字段（形如 "2026/8/30 15:21:49"）为秒级时间戳
 * 正常情况下用不到 —— qce 同时给了数值型 `timestamp`，这里只是兜底。
 * @param {string} text
 * @returns {number} 秒级时间戳，解析失败返回 0
 */
export function parseQceTimeString(text) {
  if (typeof text !== 'string') return 0;
  const matched = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
  if (!matched) return 0;
  const ms = new Date(
    Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]),
    Number(matched[4]), Number(matched[5]), Number(matched[6])
  ).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

/**
 * 解析 qce 导出格式为标准化数据
 *
 * 与 OneBot 11 的三处实质差异（旧适配器正是在这里错位）：
 *   - `time` 是格式化字符串、`timestamp` 才是秒级数值 → 时间必须取 timestamp；
 *   - 顶层没有 `group_id`/`user_id`，会话身份在 `session.{type,id,name}`；
 *   - 没有 `self_id`，自己发的消息要用“当前账号 QQ 号”（selfId）比对 sender.id 才认得出。
 *
 * @param {Object} raw - qce 导出的原始 JSON
 * @param {{ selfId?: string|number, chatName?: string }} [opts]
 * @returns {Object} 标准格式 data
 */
export function parseQceExport(raw, opts = {}) {
  const session = raw.session || {};
  const isGroup = session.type === 'group';
  const sessionId = session.id === undefined || session.id === null ? '' : String(session.id);
  const chatId = `${isGroup ? 'group' : 'private'}_${sessionId || 'unknown'}`;
  const chatName = session.name || opts.chatName ||
    (isGroup ? `群${sessionId}` : `QQ用户${sessionId}`);
  const selfId = opts.selfId === undefined || opts.selfId === null ? '' : String(opts.selfId);

  const data = {
    meta: { generatedAt: new Date().toISOString(), platforms: [PLATFORMS.QQ], totalMessages: 0, timeRange: { start: 0, end: 0 } },
    messages: [],
    contacts: []
  };

  let selfMsgCount = 0;
  let lastActive = 0;

  for (const msg of raw.messages) {
    const segments = Array.isArray(msg.segments) ? msg.segments : null;
    const content = segments ? parseQQSegments(segments) : String(msg.content || '');
    const type = segments ? detectQQMessageType(segments) : MESSAGE_TYPES.TEXT;
    const senderId = msg.sender && msg.sender.id !== undefined && msg.sender.id !== null
      ? String(msg.sender.id) : '';
    const senderName = (msg.sender && (msg.sender.card || msg.sender.name)) || '未知';

    // isSelf：有 selfId 精确比对；私聊里“不是对方就是我”可以安全退化；
    // 群聊缺 selfId 时无法可靠判定 —— 宁可标成非本人，也不编造
    let isSelf = false;
    if (selfId) {
      isSelf = senderId === selfId;
    } else if (!isGroup && sessionId) {
      isSelf = senderId !== sessionId;
    }

    const timestamp = Number(msg.timestamp) || parseQceTimeString(msg.time) || 0;

    data.messages.push({
      platform: PLATFORMS.QQ,
      messageId: String(msg.messageId !== undefined && msg.messageId !== null ? msg.messageId : ''),
      chatId,
      chatName,
      sender: isSelf ? '我' : senderName,
      isSelf,
      timestamp,
      type,
      content,
      rawContent: msg.rawMessage || undefined
    });

    if (isSelf) selfMsgCount++;
    if (timestamp > lastActive) lastActive = timestamp;
  }

  if (data.messages.length > 0) {
    data.contacts.push({
      name: chatName, platform: PLATFORMS.QQ, chatId,
      msgCount: data.messages.length, selfMsgCount, lastActive, isGroup
    });
  }

  updateMeta(data);
  return data;
}

// ==================== 飞书消息解析 ====================

/**
 * 解析飞书消息内容为文本
 * @param {Object} msgBody - 消息体
 * @param {string} msgType - 消息类型
 * @returns {string} 提取的文本内容
 */
export function parseFeishuContent(msgBody, msgType) {
  if (!msgBody) return '';
  try {
    const content = typeof msgBody === 'string' ? JSON.parse(msgBody) : msgBody;
    switch (msgType) {
      case 'text': return content.text || '';
      case 'post': {
        const parts = [];
        for (const lang of Object.values(content)) {
          if (Array.isArray(lang)) {
            for (const para of lang) {
              if (Array.isArray(para)) {
                for (const elem of para) {
                  if (elem.tag === 'text') parts.push(elem.text);
                  else if (elem.tag === 'at') parts.push(`@${elem.user_id || ''}`);
                  else if (elem.tag === 'link') parts.push(`[${elem.text || '链接'}]`);
                }
              }
            }
            break;
          }
        }
        return parts.join('');
      }
      case 'image': return '[图片]';
      case 'file': return `[文件: ${content.file_name || ''}]`;
      case 'audio': return '[语音]';
      case 'video': return '[视频]';
      case 'sticker': return '[表情]';
      case 'interactive': return '[卡片消息]';
      case 'share_chat': return `[群名片: ${content.chat_name || ''}]`;
      case 'share_user': return `[用户名片: ${content.user_name || ''}]`;
      default: return `[${msgType}]`;
    }
  } catch {
    return '';
  }
}

// ==================== 工具函数 ====================

/**
 * 更新数据的元信息
 */
function updateMeta(data) {
  data.meta.totalMessages = data.messages.length;
  data.meta.platforms = [...new Set(data.messages.map(m => m.platform))];
  if (data.messages.length > 0) {
    const timestamps = data.messages.map(m => m.timestamp);
    data.meta.timeRange.start = Math.min(...timestamps);
    data.meta.timeRange.end = Math.max(...timestamps);
  }
  return data;
}
