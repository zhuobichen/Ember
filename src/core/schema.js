/**
 * 一个人的纪念碑 - 标准数据格式定义
 * 所有平台的聊天记录统一转换为此格式
 */

/**
 * 单条消息的标准格式
 * @typedef {Object} Message
 * @property {string} platform - 来源平台: wechat | qq | feishu
 * @property {string} messageId - 平台内唯一消息ID
 * @property {string} chatId - 聊天会话ID（联系人或群）
 * @property {string} chatName - 聊天对象名称（昵称/群名）
 * @property {string} sender - 发送者名称
 * @property {boolean} isSelf - 是否为自己发送
 * @property {number} timestamp - Unix 时间戳（秒）
 * @property {string} type - 消息类型: text | image | voice | video | link | system | emoji
 * @property {string} content - 消息文本内容（非文本类型为描述）
 * @property {string} [rawContent] - 原始内容（可选，用于深度分析）
 */

/**
 * 联系人/聊天对象
 * @typedef {Object} Contact
 * @property {string} name - 昵称/群名
 * @property {string} platform - 平台
 * @property {string} chatId - 会话ID
 * @property {number} msgCount - 消息总数
 * @property {number} selfMsgCount - 自己发的消息数
 * @property {number} lastActive - 最后活跃时间戳
 * @property {boolean} isGroup - 是否群聊
 */

/**
 * 统一数据格式
 * @typedef {Object} UnifiedData
 * @property {Object} meta - 元数据
 * @property {string} meta.generatedAt - 生成时间 ISO
 * @property {string[]} meta.platforms - 涉及平台
 * @property {number} meta.totalMessages - 消息总数
 * @property {Object} meta.timeRange - 时间范围
 * @property {number} meta.timeRange.start - 最早消息时间戳
 * @property {number} meta.timeRange.end - 最晚消息时间戳
 * @property {Message[]} messages - 所有消息
 * @property {Contact[]} contacts - 所有联系人
 */

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VOICE: 'voice',
  VIDEO: 'video',
  LINK: 'link',
  SYSTEM: 'system',
  EMOJI: 'emoji',
  FILE: 'file',
  UNKNOWN: 'unknown'
};

export const PLATFORMS = {
  WECHAT: 'wechat',
  QQ: 'qq',
  FEISHU: 'feishu',
  // 网搜资料平台类型
  WEB: 'web',       // 网络公开内容（演讲、语录、文章）
  SOCIAL: 'social',  // 社交互动（问答、对话、评论）
  MEDIA: 'media',    // 媒体报道（新闻、传记、史料）
  BOOK: 'book'       // 书籍出版（著作、文献）
};

/**
 * 创建空的标准数据容器
 */
export function createEmptyData() {
  return {
    meta: {
      generatedAt: new Date().toISOString(),
      platforms: [],
      totalMessages: 0,
      timeRange: { start: 0, end: 0 }
    },
    messages: [],
    contacts: []
  };
}

/**
 * 验证消息格式是否合法
 */
export function validateMessage(msg) {
  const required = ['platform', 'chatId', 'sender', 'isSelf', 'timestamp', 'type', 'content'];
  for (const field of required) {
    if (msg[field] === undefined || msg[field] === null) {
      return { valid: false, error: `Missing field: ${field}` };
    }
  }
  if (!Object.values(PLATFORMS).includes(msg.platform)) {
    return { valid: false, error: `Invalid platform: ${msg.platform}` };
  }
  if (!Object.values(MESSAGE_TYPES).includes(msg.type)) {
    return { valid: false, error: `Invalid type: ${msg.type}` };
  }
  return { valid: true };
}

/**
 * 更新数据的元信息（消息数、时间范围等）
 */
export function updateMeta(data) {
  data.meta.totalMessages = data.messages.length;
  data.meta.platforms = [...new Set(data.messages.map(m => m.platform))];

  if (data.messages.length > 0) {
    const timestamps = data.messages.map(m => m.timestamp);
    data.meta.timeRange.start = Math.min(...timestamps);
    data.meta.timeRange.end = Math.max(...timestamps);
  }

  return data;
}
