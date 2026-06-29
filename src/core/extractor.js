/**
 * 统一消息提取器 - 微信 / 飞书 / QQ 三平台消息直接提取
 *
 * 完全自包含，不依赖外部 CLI 工具：
 * - 微信：内置 WechatDB 模块，直接解密读取本地数据库（3.x/4.x）
 *         或从已导出的 JSON 文件加载
 * - 飞书：直接调用飞书开放平台 API（需 app_id + app_secret）
 *         或通过 lark-cli（fallback）
 * - QQ：直接调用 OneBot HTTP API（需 OneBot 客户端运行中）
 * - QQ空间：通过 QQ空间 HTTP API 提取说说/日志（需 cookie）
 *
 * 用法：
 *   import { MessageExtractor } from './core/extractor.js';
 *   const extractor = new MessageExtractor();
 *
 *   // 微信（直接读数据库，不依赖 weflow-cli）
 *   const wxData = await extractor.extractWechat({
 *     dbPath: 'C:/.../MSG0.db', keyHex: 'abc123...', wxid: 'wxid_xxx'
 *   });
 *   // 或从文件加载
 *   const wxData2 = await extractor.extractWechat({ file: 'export.json' });
 *
 *   // 飞书（直接调 API）
 *   const fsData = await extractor.extractFeishu({
 *     appId: 'cli_xxx', appSecret: 'xxx', chatId: 'oc_xxx'
 *   });
 *
 *   // QQ 聊天（直接调 OneBot）
 *   const qqData = await extractor.extractQQ({
 *     baseUrl: 'http://localhost:5700', groupId: 123456
 *   });
 *
 *   // QQ空间（说说/日志）
 *   const qzoneData = await extractor.extractQQZone({
 *     uin: '123456', cookie: 'xxx', gtk: '12345'
 *   });
 *
 *   // 一键提取全部
 *   const allData = await extractor.extractAll(config);
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createEmptyData, updateMeta, MESSAGE_TYPES, PLATFORMS } from './schema.js';
import { WechatDB } from './wechat-db.js';
import { WECHAT_TYPE_MAP, FEISHU_TYPE_MAP, parseQQSegments, detectQQMessageType, parseFeishuContent } from './parsers.js';

const execAsync = promisify(exec);

export class MessageExtractor {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'output', 'temp');
    this.wechatDB = null;
  }

  // ============================================================
  //  微信消息提取（内置 WechatDB，不依赖 weflow-cli）
  // ============================================================

  /**
   * 提取微信消息
   * @param {Object} opts
   * @param {string} [opts.file] - 已导出的 JSON 文件路径
   * @param {string} [opts.dbPath] - 微信数据库路径（MSG0.db 或已解密的 .db）
   * @param {string} [opts.keyHex] - 数据库密钥（64位 hex，3.x/4.x 加密库需要）
   * @param {string} [opts.wxid] - 当前登录的 wxid
   * @param {boolean} [opts.is4x] - 是否为 4.x 格式数据库
   * @param {string} [opts.talker] - 指定聊天对象 wxid，不传则提取所有
   * @param {number} [opts.limit] - 每个会话消息数量限制
   */
  async extractWechat(opts = {}) {
    console.log('  [微信] 开始提取...');

    // 方式1：从已导出的 JSON 文件加载
    if (opts.file) {
      console.log(`  [微信] 从文件加载: ${opts.file}`);
      const raw = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
      return this._parseWechatMessages(raw);
    }

    // 方式2：直接读取微信数据库（内置解密）
    if (!opts.dbPath) {
      throw new Error('微信提取需要 dbPath 参数（数据库路径），或 file 参数（已导出文件）');
    }

    if (!fs.existsSync(opts.dbPath)) {
      throw new Error(`数据库文件不存在: ${opts.dbPath}`);
    }

    this.wechatDB = new WechatDB();
    console.log(`  [微信] 数据库: ${opts.dbPath}`);

    // 判断是已解密还是需要解密
    let openResult;
    if (opts.keyHex) {
      // 需要解密
      console.log(`  [微信] ${opts.is4x ? '4.x' : '3.x'} 格式，正在解密...`);
      openResult = opts.is4x
        ? await this.wechatDB.open4x(opts.dbPath, opts.keyHex, opts.wxid)
        : await this.wechatDB.open(opts.dbPath, opts.keyHex, opts.wxid);
    } else {
      // 已解密的数据库
      console.log('  [微信] 已解密数据库，直接打开...');
      openResult = await this.wechatDB.openRaw(opts.dbPath, opts.wxid);
    }

    if (!openResult.success) {
      throw new Error(openResult.error);
    }
    console.log('  [微信] 数据库打开成功');

    // 加载联系人昵称（需要密钥解密 MicroMsg.db）
    if (opts.keyHex) {
      const contactResult = await this.wechatDB.loadContactNames(opts.keyHex, null, opts.is4x);
      if (contactResult.success) {
        console.log(`  [微信] 已加载 ${contactResult.count} 个联系人昵称`);
      } else {
        console.warn(`  [微信] 联系人昵称加载失败: ${contactResult.error}`);
      }
    }

    // 获取会话列表
    let talkers = [];
    if (opts.talker) {
      talkers = [opts.talker];
    } else {
      const sessionResult = await this.wechatDB.getSessions();
      if (!sessionResult.success) {
        throw new Error(sessionResult.error);
      }
      talkers = sessionResult.sessions.map(s => s.username);
      console.log(`  [微信] 找到 ${talkers.length} 个会话`);
    }

    // 提取每个会话的消息
    const allMessages = [];
    const contactMap = new Map();
    const limit = opts.limit || 0;

    for (const talker of talkers) {
      const msgResult = await this.wechatDB.getMessages(talker, limit);
      if (!msgResult.success || msgResult.messages.length === 0) continue;

      const chatName = this.wechatDB.getDisplayName(talker);
      console.log(`  [微信] ${chatName} (${talker}): ${msgResult.messages.length} 条消息`);

      for (const msg of msgResult.messages) {
        const type = WECHAT_TYPE_MAP[msg.localType] || MESSAGE_TYPES.UNKNOWN;
        if (type === MESSAGE_TYPES.SYSTEM) continue;

        const isSelf = msg.isSend === 1;
        const senderName = isSelf ? '我' : chatName;

        allMessages.push({
          platform: PLATFORMS.WECHAT,
          messageId: String(msg.localId || msg.serverId || ''),
          chatId: talker,
          chatName,
          sender: senderName,
          isSelf,
          timestamp: msg.createTime || 0,
          type,
          content: msg.parsedContent || msg.content || ''
        });

        if (!contactMap.has(talker)) {
          contactMap.set(talker, {
            name: chatName, platform: PLATFORMS.WECHAT, chatId: talker,
            msgCount: 0, selfMsgCount: 0, lastActive: 0,
            isGroup: talker.includes('@chatroom')
          });
        }
        const contact = contactMap.get(talker);
        contact.msgCount++;
        if (isSelf) contact.selfMsgCount++;
        if (msg.createTime > contact.lastActive) contact.lastActive = msg.createTime;
      }
    }

    this.wechatDB.close();

    if (allMessages.length === 0) {
      console.warn('  [微信] 未提取到消息');
      return null;
    }

    const data = createEmptyData();
    data.meta.platforms = [PLATFORMS.WECHAT];
    data.messages = allMessages.sort((a, b) => a.timestamp - b.timestamp);
    data.contacts = Array.from(contactMap.values());
    updateMeta(data);
    console.log(`  [微信] 共提取 ${allMessages.length} 条消息`);
    return data;
  }

  /**
   * 解析微信消息（weflow-cli JSON 格式 → 标准格式）
   */
  /**
   * 解析微信消息（weflow-cli JSON 格式 → 标准格式）
   * 委托给共享解析器 parsers.js
   */
  _parseWechatMessages(raw) {
    return parseWechatRaw(raw);
  }

  // ============================================================
  //  飞书消息提取（直接调用飞书开放平台 API）
  // ============================================================

  /**
   * 提取飞书消息
   * @param {Object} opts
   * @param {string} opts.appId - 飞书应用 app_id
   * @param {string} opts.appSecret - 飞书应用 app_secret
   * @param {string} [opts.chatId] - 指定聊天 ID，不传则获取所有
   * @param {string} [opts.startTime] - 开始时间 ISO 8601
   * @param {string} [opts.endTime] - 结束时间 ISO 8601
   * @param {string} [opts.file] - 已导出的 JSON 文件路径
   */
  async extractFeishu(opts = {}) {
    console.log('  [飞书] 开始提取...');

    // 方式1：从已导出的 JSON 文件加载
    if (opts.file) {
      console.log(`  [飞书] 从文件加载: ${opts.file}`);
      const raw = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
      return this._parseFeishuMessages(raw);
    }

    // 方式2：直接调用飞书 API
    if (!opts.appId || !opts.appSecret) {
      // 方式3：通过 lark-cli 获取（如果已安装）
      const larkAvailable = await this._checkTool('lark-cli');
      if (larkAvailable) {
        console.log('  [飞书] 通过 lark-cli 提取（未提供 appId/appSecret）');
        return this._extractFeishuViaLarkCLI(opts);
      }
      throw new Error('飞书提取需要 appId + app_secret，或已安装 lark-cli，或提供 file 参数');
    }

    // 获取 tenant_access_token
    console.log('  [飞书] 获取 access_token...');
    const token = await this._getFeishuToken(opts.appId, opts.appSecret);

    // 获取群聊列表
    let chatList = [];
    if (opts.chatId) {
      chatList = [{ chat_id: opts.chatId, name: '指定聊天' }];
    } else {
      console.log('  [飞书] 获取群聊列表...');
      chatList = await this._getFeishuChats(token);
    }
    console.log(`  [飞书] 找到 ${chatList.length} 个聊天`);

    // 获取每个聊天的消息
    const allMessages = [];
    for (const chat of chatList) {
      console.log(`  [飞书] 提取消息: ${chat.name || chat.chat_id}`);
      const messages = await this._getFeishuMessages(token, chat.chat_id, opts.startTime, opts.endTime);
      allMessages.push(...messages);
    }

    const rawData = { items: allMessages, chat_list: chatList };
    return this._parseFeishuMessages(rawData);
  }

  async _getFeishuToken(appId, appSecret) {
    const resp = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    const data = await resp.json();
    if (data.code !== 0) throw new Error(`获取飞书 token 失败: ${data.msg}`);
    return data.tenant_access_token;
  }

  async _getFeishuChats(token) {
    const chats = [];
    let pageToken = null;
    do {
      const url = new URL('https://open.feishu.cn/open-apis/im/v1/chats');
      url.searchParams.set('page_size', '100');
      if (pageToken) url.searchParams.set('page_token', pageToken);
      const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await resp.json();
      if (data.code !== 0) { console.warn(`获取群聊列表失败: ${data.msg}`); break; }
      chats.push(...(data.data?.items || []));
      pageToken = data.data?.page_token;
      if (!data.data?.has_more) break;
    } while (pageToken);

    return chats.map(c => ({
      chat_id: c.chat_id,
      name: c.name || '未命名聊天',
      chat_type: c.chat_type || 'group'
    }));
  }

  async _getFeishuMessages(token, chatId, startTime, endTime) {
    const messages = [];
    let pageToken = null;
    let page = 0;
    do {
      const url = new URL('https://open.feishu.cn/open-apis/im/v1/messages');
      url.searchParams.set('container_id_type', 'chat');
      url.searchParams.set('container_id', chatId);
      url.searchParams.set('page_size', '50');
      url.searchParams.set('sort_type', 'ByCreateTime');
      if (startTime) url.searchParams.set('start_time', startTime);
      if (endTime) url.searchParams.set('end_time', endTime);
      if (pageToken) url.searchParams.set('page_token', pageToken);

      const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await resp.json();
      if (data.code !== 0) {
        console.warn(`  [飞书] 获取消息失败: ${data.msg}`);
        break;
      }
      messages.push(...(data.data?.items || []));
      pageToken = data.data?.page_token;
      page++;
      if (page % 10 === 0) console.log(`  [飞书] 已获取 ${messages.length} 条消息...`);
      if (!data.data?.has_more) break;
    } while (pageToken);

    return messages;
  }

  async _extractFeishuViaLarkCLI(opts) {
    // 通过 lark-cli 获取（fallback）
    const args = ['lark-cli im +chat-messages-list', '--page-size 50', '--page-all', '--format json'];
    if (opts.chatId) args.push(`--chat-id "${opts.chatId}"`);
    if (opts.startTime) args.push(`--start "${opts.startTime}"`);
    if (opts.endTime) args.push(`--end "${opts.endTime}"`);

    try {
      const { stdout } = await execAsync(args.join(' '), { maxBuffer: 100 * 1024 * 1024, timeout: 120000 });
      const data = JSON.parse(stdout);
      const items = data.items || data.data?.items || [];
      return this._parseFeishuMessages({ items, chat_list: [] });
    } catch (err) {
      throw new Error(`lark-cli 提取失败: ${err.message}`);
    }
  }

  /**
   * 解析飞书消息（飞书 API 格式 → 标准格式）
   */
  _parseFeishuMessages(raw) {
    const data = createEmptyData();
    data.meta.platforms = [PLATFORMS.FEISHU];
    const contactMap = new Map();

    const messages = raw.items || raw.messages || raw.data?.items || (Array.isArray(raw) ? raw : []);
    const chatList = raw.chat_list || raw.chats || [];
    const chatNameMap = new Map();
    for (const chat of chatList) {
      chatNameMap.set(chat.chat_id, chat.name || '未命名聊天');
    }

    for (const msg of messages) {
      const msgType = msg.message_type || msg.msg_type || 'text';
      const type = FEISHU_TYPE_MAP[msgType] || MESSAGE_TYPES.UNKNOWN;
      if (type === MESSAGE_TYPES.SYSTEM) continue;

      // 解析内容（使用共享解析器）
      const rawContent = msg.body?.content || msg.content || '';
      let content = parseFeishuContent(rawContent, msgType);
      if (!content) content = rawContent || `[${msgType}]`;

      const sender = msg.sender?.name || msg.sender?.id || '未知';
      const isSelf = msg.sender?.id_type === 'app' || false;
      const chatId = msg.chat_id || '';
      const chatName = chatNameMap.get(chatId) || msg.chat_name || '飞书聊天';

      // 时间戳
      let timestamp = 0;
      const timeStr = msg.create_time || msg.create_time_str;
      if (timeStr) {
        if (/^\d+$/.test(String(timeStr))) timestamp = parseInt(timeStr);
        else timestamp = Math.floor(new Date(timeStr).getTime() / 1000);
      }

      data.messages.push({
        platform: PLATFORMS.FEISHU,
        messageId: msg.message_id || '',
        chatId, chatName,
        sender: isSelf ? '我' : sender,
        isSelf, timestamp, type, content
      });

      if (!contactMap.has(chatId)) {
        contactMap.set(chatId, {
          name: chatName, platform: PLATFORMS.FEISHU, chatId,
          msgCount: 0, selfMsgCount: 0, lastActive: 0, isGroup: true
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

  // ============================================================
  //  QQ 消息提取（直接调用 OneBot HTTP API）
  // ============================================================

  /**
   * 提取 QQ 消息
   * @param {Object} opts
   * @param {string} [opts.baseUrl] - OneBot HTTP API 地址（默认 http://localhost:5700）
   * @param {number} [opts.groupId] - 群号
   * @param {number} [opts.userId] - 私信用户 QQ 号
   * @param {string} [opts.file] - 已导出的 JSON 文件路径
   * @param {number} [opts.messageCount] - 每个聊天获取的消息数（默认 1000）
   */
  async extractQQ(opts = {}) {
    console.log('  [QQ] 开始提取...');

    // 方式1：从已导出的 JSON 文件加载
    if (opts.file) {
      console.log(`  [QQ] 从文件加载: ${opts.file}`);
      const raw = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
      return this._parseQQMessages(raw);
    }

    // 方式2：直接调用 OneBot HTTP API
    const baseUrl = opts.baseUrl || 'http://localhost:5700';
    const messageCount = opts.messageCount || 1000;

    // 测试连接
    try {
      const resp = await fetch(`${baseUrl}/get_login_info`);
      const data = await resp.json();
      if (data.retcode !== 0) throw new Error('OneBot 返回错误');
      console.log(`  [QQ] 已连接 OneBot (账号: ${data.data?.user_id})`);
    } catch (err) {
      throw new Error(`无法连接 OneBot API (${baseUrl}): ${err.message}。请确保 OneBot 客户端正在运行`);
    }

    const allMessages = [];

    if (opts.groupId) {
      // 获取指定群消息
      console.log(`  [QQ] 获取群 ${opts.groupId} 消息...`);
      const msgs = await this._getQQGroupMessages(baseUrl, opts.groupId, messageCount);
      allMessages.push(...msgs);
    } else if (opts.userId) {
      // 获取指定好友消息
      console.log(`  [QQ] 获取好友 ${opts.userId} 消息...`);
      const msgs = await this._getQQPrivateMessages(baseUrl, opts.userId, messageCount);
      allMessages.push(...msgs);
    } else {
      // 获取所有群消息
      console.log('  [QQ] 获取群列表...');
      const groups = await this._getQQGroupList(baseUrl);
      console.log(`  [QQ] 找到 ${groups.length} 个群`);

      for (const group of groups) {
        console.log(`  [QQ] 获取群消息: ${group.group_name} (${group.group_id})`);
        const msgs = await this._getQQGroupMessages(baseUrl, group.group_id, messageCount);
        allMessages.push(...msgs);
      }

      // 获取所有好友消息
      console.log('  [QQ] 获取好友列表...');
      const friends = await this._getQQFriendList(baseUrl);
      console.log(`  [QQ] 找到 ${friends.length} 个好友`);

      for (const friend of friends) {
        const msgs = await this._getQQPrivateMessages(baseUrl, friend.user_id, messageCount);
        allMessages.push(...msgs);
      }
    }

    return this._parseQQMessages(allMessages);
  }

  async _getQQGroupList(baseUrl) {
    const resp = await fetch(`${baseUrl}/get_group_list`);
    const data = await resp.json();
    return data.data || [];
  }

  async _getQQFriendList(baseUrl) {
    const resp = await fetch(`${baseUrl}/get_friend_list`);
    const data = await resp.json();
    return data.data || [];
  }

  async _getQQGroupMessages(baseUrl, groupId, count) {
    const messages = [];
    let messageId = 0;

    for (let i = 0; i < Math.ceil(count / 20); i++) {
      try {
        const resp = await fetch(`${baseUrl}/get_group_msg_history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ group_id: groupId, message_id: messageId, count: 20 })
        });
        const data = await resp.json();
        if (data.retcode !== 0 || !data.data || data.data.length === 0) break;

        messages.push(...data.data);
        messageId = data.data[data.data.length - 1].message_id;

        if (messages.length >= count) break;
        if (data.data.length < 20) break;
      } catch {
        break;
      }
    }

    return messages;
  }

  async _getQQPrivateMessages(baseUrl, userId, count) {
    const messages = [];
    let messageId = 0;

    for (let i = 0; i < Math.ceil(count / 20); i++) {
      try {
        const resp = await fetch(`${baseUrl}/get_friend_msg_history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, message_id: messageId, count: 20 })
        });
        const data = await resp.json();
        if (data.retcode !== 0 || !data.data || data.data.length === 0) break;

        messages.push(...data.data);
        messageId = data.data[data.data.length - 1].message_id;

        if (messages.length >= count) break;
        if (data.data.length < 20) break;
      } catch {
        break;
      }
    }

    return messages;
  }

  /**
   * 解析 QQ 消息（OneBot 11 格式 → 标准格式）
   */
  _parseQQMessages(raw) {
    const data = createEmptyData();
    data.meta.platforms = [PLATFORMS.QQ];
    const contactMap = new Map();

    const messages = Array.isArray(raw) ? raw : (raw.messages || raw.data || []);

    for (const msg of messages) {
      // 解析 OneBot 11 消息段
      const segments = msg.message || msg.content;
      const content = this._parseQQSegments(segments);
      const type = this._detectQQMessageType(segments);

      const isGroup = !!(msg.group_id || msg.groupId);
      const chatId = isGroup
        ? `group_${msg.group_id || msg.groupId}`
        : `private_${msg.user_id || msg.userId}`;
      const chatName = isGroup
        ? (msg.group_name || `群${msg.group_id || ''}`)
        : (msg.sender?.nickname || msg.sender?.card || `QQ用户${msg.user_id || ''}`);

      const isSelf = msg.sub_type === 'send' || msg.post_type === 'send' ||
                     (msg.sender?.user_id === msg.self_id);
      const sender = msg.sender?.card || msg.sender?.nickname || '未知';

      data.messages.push({
        platform: PLATFORMS.QQ,
        messageId: String(msg.message_id || msg.msgId || ''),
        chatId, chatName,
        sender: isSelf ? '我' : sender,
        isSelf, timestamp: msg.time || msg.timestamp || 0,
        type, content
      });

      if (!contactMap.has(chatId)) {
        contactMap.set(chatId, {
          name: chatName, platform: PLATFORMS.QQ, chatId,
          msgCount: 0, selfMsgCount: 0, lastActive: 0, isGroup
        });
      }
      const contact = contactMap.get(chatId);
      contact.msgCount++;
      if (isSelf) contact.selfMsgCount++;
      const ts = msg.time || msg.timestamp || 0;
      if (ts > contact.lastActive) contact.lastActive = ts;
    }

    data.contacts = Array.from(contactMap.values());
    updateMeta(data);
    return data;
  }

  _parseQQSegments(segments) {
    if (typeof segments === 'string') return segments;
    return parseQQSegments(segments);
  }

  _detectQQMessageType(segments) {
    if (typeof segments === 'string') return MESSAGE_TYPES.TEXT;
    return detectQQMessageType(segments);
  }

  // ============================================================
  //  QQ空间消息提取（说说/日志/留言）
  // ============================================================

  /**
   * 提取 QQ空间 内容
   * @param {Object} opts
   * @param {string} [opts.file] - 已导出的 JSON 文件路径
   * @param {string} [opts.uin] - QQ 号
   * @param {string} [opts.cookie] - 登录 cookie（从浏览器获取）
   * @param {string} [opts.gtk] - g_tk 参数（从 cookie 计算）
   * @param {number} [opts.shuoshuoCount] - 说说获取数量（默认 100）
   * @param {number} [opts.blogCount] - 日志获取数量（默认 50）
   */
  async extractQQZone(opts = {}) {
    console.log('  [QQ空间] 开始提取...');

    // 方式1：从已导出的 JSON 文件加载
    if (opts.file) {
      console.log(`  [QQ空间] 从文件加载: ${opts.file}`);
      const raw = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
      return this._parseQQZoneData(raw);
    }

    // 方式2：通过 QQ空间 HTTP API 提取
    if (!opts.uin || !opts.cookie) {
      throw new Error('QQ空间提取需要 uin（QQ号）和 cookie 参数，或 file 参数从已导出文件加载');
    }

    // 自动计算 g_tk
    const gtk = opts.gtk || this._calcGtk(opts.cookie);
    console.log(`  [QQ空间] QQ号: ${opts.uin}, g_tk: ${gtk}`);

    const allItems = [];

    // 1. 提取说说
    try {
      console.log('  [QQ空间] 提取说说...');
      const shuoshuo = await this._getQQZoneShuoshuo(opts.uin, opts.cookie, gtk, opts.shuoshuoCount || 100);
      console.log(`  [QQ空间] 说说: ${shuoshuo.length} 条`);
      allItems.push(...shuoshuo);
    } catch (err) {
      console.warn(`  [QQ空间] 说说提取失败: ${err.message}`);
    }

    // 2. 提取日志
    try {
      console.log('  [QQ空间] 提取日志...');
      const blogs = await this._getQQZoneBlogs(opts.uin, opts.cookie, gtk, opts.blogCount || 50);
      console.log(`  [QQ空间] 日志: ${blogs.length} 篇`);
      allItems.push(...blogs);
    } catch (err) {
      console.warn(`  [QQ空间] 日志提取失败: ${err.message}`);
    }

    if (allItems.length === 0) {
      console.warn('  [QQ空间] 未提取到内容');
      return null;
    }

    return this._parseQQZoneData(allItems);
  }

  /**
   * 获取 QQ空间说说
   */
  async _getQQZoneShuoshuo(uin, cookie, gtk, count) {
    const items = [];
    let pos = 0;
    const pageSize = 20;

    while (items.length < count) {
      const url = `https://user.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msglist_v6?` +
        `uin=${uin}&fhost=&qzreferrer=https%3A%2F%2Fuser.qzone.qq.com%2F${uin}&start=${pos}&num=${pageSize}&replynum=100&g_tk=${gtk}&code_version=1&format=json&need_private_comment=1`;

      const resp = await fetch(url, {
        headers: {
          'Cookie': cookie,
          'Referer': `https://user.qzone.qq.com/${uin}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const text = await resp.text();
      // QQ空间 API 返回的可能是 JSONP 包裹
      const jsonStr = text.replace(/^_Callback\(/, '').replace(/\);?$/, '');
      const data = JSON.parse(jsonStr);

      if (data.code !== 0 || !data.msglist || data.msglist.length === 0) break;

      for (const msg of data.msglist) {
        items.push({
          type: 'shuoshuo',
          uin: uin,
          content: msg.content || '',
          createTime: msg.created_time || 0,
          commentCount: msg.commentlist?.length || 0,
          comments: (msg.commentlist || []).map(c => ({
            sender: c.uin,
            name: c.name,
            content: c.content,
            time: c.create_time
          })),
          pictures: (msg.pic || []).map(p => p.url1 || p.url2 || ''),
          forwardContent: msg.rt_con?.content || ''
        });
      }

      pos += pageSize;
      if (data.msglist.length < pageSize) break;
      // 避免请求过快
      await new Promise(r => setTimeout(r, 500));
    }

    return items.slice(0, count);
  }

  /**
   * 获取 QQ空间日志
   */
  async _getQQZoneBlogs(uin, cookie, gtk, count) {
    const items = [];
    const url = `https://user.qzone.qq.com/proxy/domain/b.qzone.qq.com/cgi-bin/blognew/get_blog_list?` +
      `uin=${uin}&blogtype=0&categorynum=20&num=${count}&g_tk=${gtk}&format=json`;

    const resp = await fetch(url, {
      headers: {
        'Cookie': cookie,
        'Referer': `https://user.qzone.qq.com/${uin}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const text = await resp.text();
    const jsonStr = text.replace(/^_Callback\(/, '').replace(/\);?$/, '');
    const data = JSON.parse(jsonStr);

    if (data.code !== 0 || !data.data?.list) return items;

    for (const blog of data.data.list) {
      items.push({
        type: 'blog',
        uin: uin,
        title: blog.title || '',
        content: blog.summary || '',
        blogId: blog.blogid,
        createTime: blog.pubtime || 0,
        categoryName: blog.categoryname || '',
        commentCount: blog.commentnum || 0,
        readCount: blog.accessnum || 0
      });
    }

    return items;
  }

  /**
   * 从 cookie 计算 g_tk
   */
  _calcGtk(cookie) {
    const match = cookie.match(/skey=([^;]+)/);
    if (!match) return '0';
    const skey = match[1];
    let hash = 5381;
    for (let i = 0; i < skey.length; i++) {
      hash += (hash << 5) + skey.charCodeAt(i);
    }
    return String(hash & 0x7fffffff);
  }

  /**
   * 解析 QQ空间数据为标准格式
   */
  _parseQQZoneData(raw) {
    const data = createEmptyData();
    data.meta.platforms = [PLATFORMS.QQ];
    const items = Array.isArray(raw) ? raw : (raw.items || raw.data || []);

    for (const item of items) {
      if (item.type === 'shuoshuo') {
        // 说说作为本人发送的消息
        let content = item.content || '';
        if (item.forwardContent) content += `\n[转发] ${item.forwardContent}`;
        if (item.pictures && item.pictures.length > 0) {
          content += `\n[图片 x${item.pictures.length}]`;
        }

        data.messages.push({
          platform: PLATFORMS.QQ,
          messageId: `qzone_ss_${item.createTime}`,
          chatId: 'qzone_shuoshuo',
          chatName: 'QQ空间说说',
          sender: '我',
          isSelf: true,
          timestamp: item.createTime || 0,
          type: MESSAGE_TYPES.TEXT,
          content
        });

        // 评论作为他人消息
        for (const comment of (item.comments || [])) {
          data.messages.push({
            platform: PLATFORMS.QQ,
            messageId: `qzone_cmt_${comment.time}_${comment.sender}`,
            chatId: 'qzone_shuoshuo',
            chatName: 'QQ空间说说',
            sender: comment.name || `QQ用户${comment.sender}`,
            isSelf: false,
            timestamp: comment.time || 0,
            type: MESSAGE_TYPES.TEXT,
            content: comment.content || ''
          });
        }
      } else if (item.type === 'blog') {
        // 日志作为本人发送的消息
        const content = item.title ? `《${item.title}》\n${item.content || ''}` : (item.content || '');
        data.messages.push({
          platform: PLATFORMS.QQ,
          messageId: `qzone_blog_${item.blogId}`,
          chatId: 'qzone_blog',
          chatName: 'QQ空间日志',
          sender: '我',
          isSelf: true,
          timestamp: item.createTime || 0,
          type: MESSAGE_TYPES.TEXT,
          content
        });
      }
    }

    // 构建联系人
    const contactMap = new Map();
    for (const msg of data.messages) {
      if (!contactMap.has(msg.chatId)) {
        contactMap.set(msg.chatId, {
          name: msg.chatName, platform: PLATFORMS.QQ, chatId: msg.chatId,
          msgCount: 0, selfMsgCount: 0, lastActive: 0, isGroup: false
        });
      }
      const c = contactMap.get(msg.chatId);
      c.msgCount++;
      if (msg.isSelf) c.selfMsgCount++;
      if (msg.timestamp > c.lastActive) c.lastActive = msg.timestamp;
    }
    data.contacts = Array.from(contactMap.values());
    updateMeta(data);
    return data;
  }

  // ============================================================
  //  Telegram 消息提取
  // ============================================================

  /**
   * 提取 Telegram 消息
   * @param {Object} opts
   * @param {string} opts.file - 已导出的 JSON 文件路径
   */
  async extractTelegram(opts = {}) {
    console.log('  [Telegram] 开始提取...');

    if (!opts.file) {
      throw new Error('Telegram 提取需要 file 参数（已导出的 JSON 文件路径）');
    }

    console.log(`  [Telegram] 从文件加载: ${opts.file}`);
    const raw = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
    return this._parseTelegramMessages(raw);
  }

  _parseTelegramMessages(raw) {
    const data = createEmptyData();
    data.meta.platforms = [PLATFORMS.TELEGRAM];
    const contactMap = new Map();

    const chats = raw.chats?.list || raw.chats || (raw.messages ? [raw] : []) || [];

    for (const chat of chats) {
      const chatId = String(chat.id || chat.chat_id || '');
      const chatName = chat.name || chat.title || `聊天${chatId}`;
      const isGroup = chat.type === 'supergroup' || chat.type === 'group' || chat.type === 'channel';
      const messages = chat.messages || [];

      for (const msg of messages) {
        if (msg.type && msg.type !== 'message') continue;

        const msgType = this._detectTelegramMessageType(msg);
        const type = this._mapTelegramType(msgType);
        const content = this._parseTelegramContent(msg, type);
        if (!content && type === MESSAGE_TYPES.TEXT) continue;

        const sender = msg.from || msg.sender_name || '未知';
        const isSelf = msg.out === true;

        let timestamp = 0;
        if (msg.date) {
          const ts = new Date(msg.date).getTime();
          if (!isNaN(ts)) timestamp = Math.floor(ts / 1000);
        }

        data.messages.push({
          platform: PLATFORMS.TELEGRAM,
          messageId: String(msg.id || ''),
          chatId,
          chatName,
          sender: isSelf ? '我' : sender,
          isSelf,
          timestamp,
          type,
          content
        });

        if (!contactMap.has(chatId)) {
          contactMap.set(chatId, {
            name: chatName, platform: PLATFORMS.TELEGRAM, chatId,
            msgCount: 0, selfMsgCount: 0, lastActive: 0, isGroup
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
    console.log(`  [Telegram] 共提取 ${data.messages.length} 条消息`);
    return data;
  }

  _detectTelegramMessageType(msg) {
    if (msg.photo) return 'photo';
    if (msg.voice_message) return 'voice_message';
    if (msg.video_message) return 'video_message';
    if (msg.video) return 'video';
    if (msg.document) return 'document';
    if (msg.sticker) return 'sticker';
    if (msg.animation) return 'animation';
    if (msg.audio) return 'audio';
    return 'message';
  }

  _mapTelegramType(msgType) {
    const map = {
      message: MESSAGE_TYPES.TEXT,
      photo: MESSAGE_TYPES.IMAGE,
      voice_message: MESSAGE_TYPES.VOICE,
      video_message: MESSAGE_TYPES.VIDEO,
      video: MESSAGE_TYPES.VIDEO,
      document: MESSAGE_TYPES.FILE,
      sticker: MESSAGE_TYPES.EMOJI,
      animation: MESSAGE_TYPES.VIDEO,
      audio: MESSAGE_TYPES.VOICE
    };
    return map[msgType] || MESSAGE_TYPES.TEXT;
  }

  _parseTelegramContent(msg, type) {
    switch (type) {
      case MESSAGE_TYPES.TEXT: {
        if (typeof msg.text === 'string') return msg.text;
        if (Array.isArray(msg.text)) {
          return msg.text.map(part => {
            if (typeof part === 'string') return part;
            return part.text || '';
          }).join('');
        }
        return '';
      }
      case MESSAGE_TYPES.IMAGE: {
        const caption = this._extractTelegramCaption(msg);
        return caption ? `[图片] ${caption}` : '[图片]';
      }
      case MESSAGE_TYPES.VOICE:
        return '[语音]';
      case MESSAGE_TYPES.VIDEO: {
        const caption = this._extractTelegramCaption(msg);
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

  _extractTelegramCaption(msg) {
    if (!msg.caption) return '';
    if (typeof msg.caption === 'string') return msg.caption;
    if (Array.isArray(msg.caption)) {
      return msg.caption.map(p => typeof p === 'string' ? p : (p.text || '')).join('');
    }
    return '';
  }

  // ============================================================
  //  Discord 消息提取
  // ============================================================

  /**
   * 提取 Discord 消息
   * @param {Object} opts
   * @param {string} opts.file - 已导出的 JSON 文件路径
   */
  async extractDiscord(opts = {}) {
    console.log('  [Discord] 开始提取...');

    if (!opts.file) {
      throw new Error('Discord 提取需要 file 参数（已导出的 JSON 文件路径）');
    }

    console.log(`  [Discord] 从文件加载: ${opts.file}`);
    const raw = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
    return this._parseDiscordMessages(raw);
  }

  _parseDiscordMessages(raw) {
    const data = createEmptyData();
    data.meta.platforms = [PLATFORMS.DISCORD];
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
        const type = this._detectDiscordMessageType(msg);
        const content = this._parseDiscordContent(msg, type);
        if (!content && type === MESSAGE_TYPES.TEXT) continue;

        const sender = msg.author?.name || msg.author?.username || '未知';
        const isSelf = msg.author?.isSelf || false;

        let timestamp = 0;
        if (msg.timestamp) {
          const ts = new Date(msg.timestamp).getTime();
          if (!isNaN(ts)) timestamp = Math.floor(ts / 1000);
        }

        data.messages.push({
          platform: PLATFORMS.DISCORD,
          messageId: String(msg.id || ''),
          chatId,
          chatName,
          sender: isSelf ? '我' : sender,
          isSelf,
          timestamp,
          type,
          content
        });

        if (!contactMap.has(chatId)) {
          contactMap.set(chatId, {
            name: chatName, platform: PLATFORMS.DISCORD, chatId,
            msgCount: 0, selfMsgCount: 0, lastActive: 0, isGroup
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
    console.log(`  [Discord] 共提取 ${data.messages.length} 条消息`);
    return data;
  }

  _detectDiscordMessageType(msg) {
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
    return MESSAGE_TYPES.TEXT;
  }

  _parseDiscordContent(msg, type) {
    switch (type) {
      case MESSAGE_TYPES.TEXT:
        return msg.content || '';
      case MESSAGE_TYPES.IMAGE: {
        const text = msg.content || '';
        const imgCount = (msg.attachments || []).filter(a => a.contentType?.startsWith('image/')).length;
        const imgText = imgCount > 0 ? `[图片 x${imgCount}]` : '[图片]';
        return text ? `${imgText} ${text}` : imgText;
      }
      case MESSAGE_TYPES.VIDEO: {
        const text = msg.content || '';
        const videoCount = (msg.attachments || []).filter(a => a.contentType?.startsWith('video/')).length;
        const videoText = videoCount > 0 ? `[视频 x${videoCount}]` : '[视频]';
        return text ? `${videoText} ${text}` : videoText;
      }
      case MESSAGE_TYPES.VOICE: {
        const text = msg.content || '';
        return text ? `[语音] ${text}` : '[语音]';
      }
      case MESSAGE_TYPES.FILE: {
        const text = msg.content || '';
        const files = (msg.attachments || []).map(a => a.fileName || a.name || '').filter(Boolean);
        const fileText = files.length > 0 ? `[文件] ${files.join(', ')}` : '[文件]';
        return text ? `${fileText} ${text}` : fileText;
      }
      case MESSAGE_TYPES.LINK: {
        const text = msg.content || '';
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

  // ============================================================
  //  微博消息提取
  // ============================================================

  /**
   * 提取微博消息
   * @param {Object} opts
   * @param {string} opts.file - 已导出的 JSON 文件路径
   */
  async extractWeibo(opts = {}) {
    console.log('  [微博] 开始提取...');

    if (!opts.file) {
      throw new Error('微博提取需要 file 参数（已导出的 JSON 文件路径）');
    }

    console.log(`  [微博] 从文件加载: ${opts.file}`);
    const raw = JSON.parse(fs.readFileSync(opts.file, 'utf-8'));
    return this._parseWeiboMessages(raw);
  }

  _parseWeiboMessages(raw) {
    const data = createEmptyData();
    data.meta.platforms = [PLATFORMS.WEIBO];
    const contactMap = new Map();

    const weibos = raw.weibos || raw.data || raw.statuses || (Array.isArray(raw) ? raw : []) || [];

    for (const weibo of weibos) {
      const weiboId = String(weibo.id || weibo.mid || weibo.bid || '');
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
        platform: PLATFORMS.WEIBO,
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
          name: chatName, platform: PLATFORMS.WEIBO, chatId,
          msgCount: 0, selfMsgCount: 0, lastActive: 0, isGroup: false
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
            platform: PLATFORMS.WEIBO,
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
              name: commentChatName, platform: PLATFORMS.WEIBO, chatId: commentChatId,
              msgCount: 0, selfMsgCount: 0, lastActive: 0, isGroup: true
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
            platform: PLATFORMS.WEIBO,
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
              name: repostChatName, platform: PLATFORMS.WEIBO, chatId: repostChatId,
              msgCount: 0, selfMsgCount: 0, lastActive: 0, isGroup: true
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
    console.log(`  [微博] 共提取 ${data.messages.length} 条消息`);
    return data;
  }

  // ============================================================
  //  一键提取全部
  // ============================================================

  /**
   * 提取所有平台消息
   * @param {Object} config
   * @param {Object} [config.wechat] - 微信配置 { file, dbPath, keyHex, wxid, is4x, talker, limit }
   * @param {Object} [config.feishu] - 飞书配置 { appId, appSecret, chatId, file }
   * @param {Object} [config.qq] - QQ 配置 { baseUrl, groupId, userId, file }
   * @param {Object} [config.qqzone] - QQ空间配置 { uin, cookie, gtk, file }
   * @param {Object} [config.telegram] - Telegram 配置 { file }
   * @param {Object} [config.discord] - Discord 配置 { file }
   * @param {Object} [config.weibo] - 微博配置 { file }
   */
  async extractAll(config = {}) {
    console.log('===== 多平台消息提取 =====\n');
    const dataList = [];

    if (config.wechat) {
      try {
        const data = await this.extractWechat(config.wechat);
        if (data) { dataList.push(data); console.log(`  [微信] ✓ ${data.messages.length} 条消息\n`); }
      } catch (err) { console.warn(`  [微信] ✗ ${err.message}\n`); }
    }

    if (config.feishu) {
      try {
        const data = await this.extractFeishu(config.feishu);
        if (data) { dataList.push(data); console.log(`  [飞书] ✓ ${data.messages.length} 条消息\n`); }
      } catch (err) { console.warn(`  [飞书] ✗ ${err.message}\n`); }
    }

    if (config.qq) {
      try {
        const data = await this.extractQQ(config.qq);
        if (data) { dataList.push(data); console.log(`  [QQ] ✓ ${data.messages.length} 条消息\n`); }
      } catch (err) { console.warn(`  [QQ] ✗ ${err.message}\n`); }
    }

    if (config.qqzone) {
      try {
        const data = await this.extractQQZone(config.qqzone);
        if (data) { dataList.push(data); console.log(`  [QQ空间] ✓ ${data.messages.length} 条消息\n`); }
      } catch (err) { console.warn(`  [QQ空间] ✗ ${err.message}\n`); }
    }

    if (config.telegram) {
      try {
        const data = await this.extractTelegram(config.telegram);
        if (data) { dataList.push(data); console.log(`  [Telegram] ✓ ${data.messages.length} 条消息\n`); }
      } catch (err) { console.warn(`  [Telegram] ✗ ${err.message}\n`); }
    }

    if (config.discord) {
      try {
        const data = await this.extractDiscord(config.discord);
        if (data) { dataList.push(data); console.log(`  [Discord] ✓ ${data.messages.length} 条消息\n`); }
      } catch (err) { console.warn(`  [Discord] ✗ ${err.message}\n`); }
    }

    if (config.weibo) {
      try {
        const data = await this.extractWeibo(config.weibo);
        if (data) { dataList.push(data); console.log(`  [微博] ✓ ${data.messages.length} 条消息\n`); }
      } catch (err) { console.warn(`  [微博] ✗ ${err.message}\n`); }
    }

    if (dataList.length === 0) {
      console.log('未提取到任何数据。');
      return null;
    }

    if (dataList.length === 1) return dataList[0];
    return this._mergeData(dataList);
  }

  // ============================================================
  //  工具方法
  // ============================================================

  async _checkTool(name) {
    try { await execAsync(`${name} --version`, { timeout: 5000 }); return true; }
    catch { try { await execAsync(`${name} --help`, { timeout: 5000 }); return true; } catch { return false; } }
  }

  _mergeData(dataList) {
    const merged = createEmptyData();
    const contactMap = new Map();

    for (const data of dataList) {
      merged.messages.push(...data.messages);
      for (const contact of data.contacts) {
        if (!contactMap.has(contact.chatId)) {
          contactMap.set(contact.chatId, { ...contact });
        } else {
          const existing = contactMap.get(contact.chatId);
          existing.msgCount += contact.msgCount;
          existing.selfMsgCount += contact.selfMsgCount;
          if (contact.lastActive > existing.lastActive) existing.lastActive = contact.lastActive;
        }
      }
      for (const p of data.meta.platforms) {
        if (!merged.meta.platforms.includes(p)) merged.meta.platforms.push(p);
      }
    }

    merged.messages.sort((a, b) => a.timestamp - b.timestamp);
    merged.contacts = Array.from(contactMap.values());
    updateMeta(merged);
    return merged;
  }

  cleanTemp() {
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        if (file.endsWith('.json')) fs.unlinkSync(path.join(this.tempDir, file));
      }
    }
  }
}
