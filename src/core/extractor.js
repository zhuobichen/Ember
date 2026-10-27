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
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createEmptyData, updateMeta, MESSAGE_TYPES, PLATFORMS } from './schema.js';
import { WechatDB } from './wechat-db.js';
import { WECHAT_TYPE_MAP, FEISHU_TYPE_MAP, parseQQSegments, detectQQMessageType, parseFeishuContent, parseWechatRaw } from './parsers.js';

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
      // weflow-cli export 产出的是一个数组，字段是 senderDisplay / createTime / parsedContent，
      // 老解析器认不出来（会把会话名和发言人都变成"未知"），这里单独处理
      if (Array.isArray(raw) && raw.length > 0 && raw[0] && 'senderDisplay' in raw[0]) {
        return this._parseWechatExportArray(raw, opts);
      }
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
  /**
   * 解析 weflow-cli export 的数组格式
   *
   * 每条形如 { localId, serverId, localType, createTime, isSend,
   *           senderUsername, senderDisplay, content, rawContent, parsedContent }
   * 会话名不在文件里，从文件名或 opts 取。
   */
  _parseWechatExportArray(arr, opts = {}) {
    const data = createEmptyData();
    data.meta.platforms = [PLATFORMS.WECHAT];
    const base = opts.file ? path.basename(opts.file).replace(/_messages\.json$/i, '') : 'wechat';
    const chatId = opts.talker || base;
    const chatName = opts.chatName || chatId;

    const typeOf = (lt) => ({
      1: MESSAGE_TYPES.TEXT,
      3: MESSAGE_TYPES.IMAGE,
      34: MESSAGE_TYPES.VOICE,
      43: MESSAGE_TYPES.VIDEO,
      47: MESSAGE_TYPES.EMOJI,
      49: MESSAGE_TYPES.LINK
    }[lt] || MESSAGE_TYPES.TEXT);

    for (const m of arr) {
      const content = m.parsedContent || m.content || '';
      if (!content) continue;
      data.messages.push({
        platform: PLATFORMS.WECHAT,
        messageId: String(m.serverId || m.localId || ''),
        chatId,
        chatName,
        sender: m.senderDisplay || m.senderUsername || '未知',
        isSelf: Number(m.isSend) === 1,
        timestamp: Number(m.createTime) || 0,
        type: typeOf(Number(m.localType)),
        content
      });
    }

    const senders = new Set(data.messages.map((m) => m.sender));
    data.meta.totalMessages = data.messages.length;
    const times = data.messages.map((m) => m.timestamp).filter((t) => t > 0);
    data.meta.timeRange = { start: Math.min(...times, 0), end: Math.max(...times, 0) };
    data.contacts = [{
      id: chatId,
      chatId,
      name: chatName,
      platform: PLATFORMS.WECHAT,
      messageCount: data.messages.length,
      senderCount: senders.size,
      messageCountBySender: {}
    }];
    console.log(`  [微信] ${chatName}: ${data.messages.length} 条，${senders.size} 个发言人`);
    return data;
  }
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
    // 通过 lark-cli 获取
    //
    // 注意：新版 lark-cli 的 +chat-messages-list **必须**带 --chat-id（或 --user-id），
    // 不带会直接返回 invalid_argument。所以先列会话，再逐个会话拉消息。
    try {
      const { stdout: chatOut } = await execAsync(
        'lark-cli im +chat-list --as user --format json',
        { maxBuffer: 32 * 1024 * 1024, timeout: 120000 }
      );
      const chatJson = JSON.parse(chatOut);
      const chats = chatJson.data?.chats || chatJson.chats || [];
      if (chats.length === 0) throw new Error('lark-cli 没有返回任何会话');

      const items = [];
      const chatList = [];
      for (const chat of chats) {
        const chatId = chat.chat_id || chat.open_chat_id;
        const chatName = chat.name || chat.chat_name || '未命名聊天';
        if (!chatId) continue;
        if (opts.chatId && chatId !== opts.chatId) continue;
        chatList.push({ chat_id: chatId, name: chatName });

        const parts = [
          'lark-cli im +chat-messages-list',
          `--chat-id "${chatId}"`,
          '--as user',
          '--page-size 50',
          '--page-all',
          '--order asc',
          '--format json'
        ];
        if (opts.startTime) parts.push(`--start "${opts.startTime}"`);
        if (opts.endTime) parts.push(`--end "${opts.endTime}"`);

        try {
          const { stdout } = await execAsync(parts.join(' '), {
            maxBuffer: 100 * 1024 * 1024,
            timeout: 180000
          });
          const data = JSON.parse(stdout);
          const list = data.data?.messages || data.items || data.data?.items || [];
          console.log(`  [飞书] ${chatName}: ${list.length} 条`);
          for (const m of list) {
            items.push({ ...m, chat_id: chatId, _chat_name: chatName });
          }
        } catch (e) {
          console.warn(`  [飞书] ${chatName} 拉取失败: ${String(e.message).split('\n')[0]}`);
        }
      }

      return this._parseFeishuMessages({ items, chat_list: chatList });
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
    // cookie 可以不给：qce qzone login 会把登录态写到 qchat-cli/.qzone-cookie，
    // 这里按常见位置自动找一次，省得每次手工复制（cookie 很长）
    let cookie = opts.cookie;
    let cookieSource = '参数传入';
    if (!cookie) {
      // 优先用「按身份分开存档」的那份：qce qzone login 除了写 .qzone-cookie，
      // 还会按 QQ 号写 .qzone-cookie.<uin>，所以多个号的空间登录态可以并存。
      const qzDirs = [
        path.join(process.cwd(), 'qchat-cli'),
        path.join(process.cwd(), '..', 'qchat-cli')
      ];
      const candidates = [];
      if (opts.uin) {
        for (const d of qzDirs) candidates.push(path.join(d, `.qzone-cookie.${opts.uin}`));
      }
      for (const d of qzDirs) candidates.push(path.join(d, '.qzone-cookie'));
      candidates.push(path.join(os.homedir(), '.qzone-cookie'));

      const found = candidates.find((p) => {
        try { return fs.statSync(p).isFile(); } catch { return false; }
      });
      if (found) {
        cookie = fs.readFileSync(found, 'utf-8').trim();
        cookieSource = found;
      }
    }

    if (!opts.uin || !cookie) {
      throw new Error(
        'QQ空间提取需要 uin（QQ号）+ cookie。cookie 可以让 qce 帮你生成：\n' +
        '  cd qchat-cli && qce qzone login\n' +
        '生成后本工具会自动读取 qchat-cli/.qzone-cookie；也可以用 --qzone-cookie 直接传。'
      );
    }
    console.log(`  [QQ空间] cookie 来源: ${cookieSource}`);

    // 自动计算 g_tk
    const gtk = opts.gtk || this._calcGtk(cookie);
    console.log(`  [QQ空间] QQ号: ${opts.uin}, g_tk: ${gtk}`);

    const allItems = [];

    // 1. 提取说说
    try {
      console.log('  [QQ空间] 提取说说...');
      const shuoshuo = await this._getQQZoneShuoshuo(opts.uin, cookie, gtk, opts.shuoshuoCount || 100);
      console.log(`  [QQ空间] 说说: ${shuoshuo.length} 条`);
      allItems.push(...shuoshuo);

      // 0 条最常见的两个原因：这个号确实没发过说说，或者网页登录态过期了。
      // cookie 过期没有任何前置信号，只能在这里给个可操作的提示。
      if (shuoshuo.length === 0) {
        console.warn(`  [QQ空间] 说说 0 条（接口 code=${this._lastQzCode ?? '未知'}）`);
        console.warn('  [QQ空间] 若之前能取到，多半是空间登录态过期了，重新扫码：');
        console.warn('  [QQ空间]   cd qchat-cli && qce qzone login');
      }
    } catch (err) {
      console.warn(`  [QQ空间] 说说提取失败: ${err.message}`);
      console.warn('  [QQ空间] 若是登录态问题，重新扫码：cd qchat-cli && qce qzone login');
    }

    // 2. 提取日志（接口已基本下线，失败不影响说说）
    try {
      console.log('  [QQ空间] 提取日志...');
      const blogs = await this._getQQZoneBlogs(opts.uin, cookie, gtk, opts.blogCount || 50);
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
    const seenTids = new Set();
    let pos = 0;
    const pageSize = 20;

    while (items.length < count) {
      // 分页参数是 pos：用 start= 时接口会忽略它、每次返回第一页，
      // 结果就是同一批说说被重复抓 N 遍（实测 start=0 与 start=20 返回完全相同）
      const url = `https://user.qzone.qq.com/proxy/domain/taotao.qq.com/cgi-bin/emotion_cgi_msglist_v6?` +
        `uin=${uin}&fhost=&qzreferrer=https%3A%2F%2Fuser.qzone.qq.com%2F${uin}&pos=${pos}&num=${pageSize}&replynum=100&g_tk=${gtk}&code_version=1&format=json&need_private_comment=1`;

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
      this._lastQzCode = data.code;   // 0 = 正常；其它值用于提示 cookie 是否过期

      if (data.code !== 0 || !data.msglist || data.msglist.length === 0) break;

      let added = 0;
      for (const msg of data.msglist) {
        // 相邻页会重叠，按 tid 去重；tid 也是稳定的消息标识
        const tid = String(msg.tid || '');
        if (tid && seenTids.has(tid)) continue;
        if (tid) seenTids.add(tid);
        added++;

        items.push({
          type: 'shuoshuo',
          uin: uin,
          tid,
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
      if (data.msglist.length < pageSize || added === 0) break;
      // 避免请求过快
      await new Promise(r => setTimeout(r, 500));
    }

    return items.slice(0, count);
  }

  /**
   * 获取 QQ空间日志
   *
   * 参数照 qzone-go（qchat-cli 的上游实现）的写法，几个关键点：
   *   - `uin` 是「登录者自己」，目标空间放 `hostUin`；
   *   - 参数名是 camelCase（hostUin / blogType / sortType / absType / reqInfo）；
   *   - `reqInfo=1`；用 `reqInfo=7` 会被要求「统计年份」而返回 -4003；
   *   - 返回是 JSONP（`_Callback({...})`），条目在 `data.list`，字段也是 camelCase。
   * 之前用 `get_blog_list?uin=...` 那套是 404 + -4003，才误判成接口下线。
   */
  async _getQQZoneBlogs(uin, cookie, gtk, count) {
    const items = [];
    const pageSize = 15;
    let pos = 0;

    while (items.length < count) {
      const params = new URLSearchParams({
        hostUin: String(uin),
        uin: String(uin),
        blogType: '0',
        cateName: '',
        cateHex: '',
        reqInfo: '1',
        pos: String(pos),
        num: String(pageSize),
        sortType: '0',
        absType: '1',
        source: '0',
        rand: String(Math.random()),
        ref: 'qzone',
        verbose: '1',
        g_tk: String(gtk)
      });

      const resp = await fetch(
        `https://user.qzone.qq.com/proxy/domain/b.qzone.qq.com/cgi-bin/blognew/get_abs?${params}`,
        {
          headers: {
            'Cookie': cookie,
            'Referer': `https://user.qzone.qq.com/${uin}`,
            'Origin': 'https://user.qzone.qq.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      // 空间接口返回的是 GBK，直接 text() 会把中文错误信息解成乱码
      const buf = Buffer.from(await resp.arrayBuffer());
      let text;
      try {
        text = new TextDecoder('gbk').decode(buf);
      } catch {
        text = buf.toString('utf8');
      }

      const body = text.replace(/^_Callback\(/, '').replace(/\);?\s*$/, '').trim();
      if (!body) {
        console.log('  [QQ空间] 日志接口返回空，跳过');
        break;
      }

      let data;
      try {
        data = JSON.parse(body);
      } catch {
        console.log('  [QQ空间] 日志接口返回的不是 JSON，跳过');
        break;
      }

      if (data.code !== 0) {
        const reason = data.message ? ` code=${data.code} ${data.message}` : ` code=${data.code}`;
        console.log(`  [QQ空间] 日志接口不可用（${reason.trim()}），跳过`);
        break;
      }

      const list = data.data?.list || [];
      for (const blog of list) {
        items.push({
          type: 'blog',
          uin: uin,
          title: blog.title || '',
          content: blog.abstract || '',
          blogId: blog.blogId,
          createTime: this._parseQzDateTime(blog.pubTime),
          categoryName: blog.cate || '',
          commentCount: blog.commentNum || 0
        });
      }

      if (list.length < pageSize) break;
      pos += pageSize;
      await new Promise((r) => setTimeout(r, 400));
    }

    return items.slice(0, count);
  }

  /**
   * 把空间返回的 "2012-07-11 12:09" 转成秒级时间戳
   * @param {string} text
   * @returns {number}
   */
  _parseQzDateTime(text) {
    if (!text) return 0;
    const m = String(text).match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (!m) return 0;
    const ms = new Date(
      Number(m[1]), Number(m[2]) - 1, Number(m[3]),
      Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0)
    ).getTime();
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
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
          // tid 是空间说说的稳定标识；退回到 createTime 时，同一秒发的两条会被当成同一条
          messageId: `qzone_ss_${item.tid || item.createTime}`,
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
            messageId: `qzone_cmt_${item.tid || item.createTime}_${comment.time}_${comment.sender}`,
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
  //  一键提取全部
  // ============================================================

  /**
   * 提取所有平台消息
   * @param {Object} config
   * @param {Object} [config.wechat] - 微信配置 { file, dbPath, keyHex, wxid, is4x, talker, limit }
   * @param {Object} [config.feishu] - 飞书配置 { appId, appSecret, chatId, file }
   * @param {Object} [config.qq] - QQ 配置 { baseUrl, groupId, userId, file }
   * @param {Object} [config.qqzone] - QQ空间配置 { uin, cookie, gtk, file }
   */
  // ============================================================
  //  贴吧 / 知乎
  //
  //  这两个站没有可用 CLI：贴吧 PC 接口要逐请求 sign，知乎要 x-zse-96 签名。
  //  所以走「已登录浏览器取 HTML → 本地解析」，实现在 zhaowen-skill 仓库：
  //    zhaowen-skill/tieba/scripts/{tieba.ps1,tieba.mjs}
  //    zhaowen-skill/zhihu/scripts/{zhihu.ps1,zhihu.mjs}
  //  这里只负责调用它、把结果映射成统一 schema。cookie 全程不经过本模块。
  // ============================================================

  /** 定位 zhaowen-skill 仓库（可用 ZHAOWEN_SKILLS 环境变量覆盖） */
  _skillsRoot() {
    const fromEnv = process.env.ZHAOWEN_SKILLS;
    if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
    const candidates = [
      path.join(process.cwd(), '..', 'zhaowen-skill'),
      path.join(process.cwd(), 'zhaowen-skill'),
      path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..', '..', 'zhaowen-skill')
    ];
    for (const c of candidates) {
      try { if (fs.statSync(c).isDirectory()) return c; } catch {}
    }
    throw new Error('找不到 zhaowen-skill 仓库，请设置环境变量 ZHAOWEN_SKILLS 指向它');
  }

  /** 跑 skill 里的脚本，把 stdout 当 JSON 解析 */
  async _runSkillJson(scriptRelPath, args) {
    const script = path.join(this._skillsRoot(), scriptRelPath);
    if (!fs.existsSync(script)) throw new Error(`脚本不存在: ${script}`);
    // 用 pwsh（PS7）：PS 5.1 会按 GBK 读无 BOM 的脚本，中文会乱
    const shell = process.env.DSH_PWSH || 'pwsh';
    const quoted = args.map((a) => `"${String(a).replace(/"/g, '\\"')}"`).join(' ');
    const cmd = `"${shell}" -NoProfile -ExecutionPolicy Bypass -File "${script}" ${quoted}`;
    const { stdout } = await execAsync(cmd, {
      maxBuffer: 64 * 1024 * 1024,
      timeout: 300000,
      encoding: 'utf8'
    });
    const text = stdout.trim();
    if (!text) throw new Error('脚本没有输出');
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`脚本输出不是 JSON：${text.slice(0, 200)}`);
    }
  }

  /** 把贴吧的相对时间（刚刚/N分钟前/N小时前/N天前/MM-DD/YYYY-MM-DD）转成秒级时间戳 */
  _parseRelTime(text, nowSec = Math.floor(Date.now() / 1000)) {
    const t = String(text || '').trim();
    if (!t) return 0;
    let m;
    if (/^刚刚/.test(t)) return nowSec;
    if ((m = t.match(/^(\d+)\s*秒前/))) return nowSec - Number(m[1]);
    if ((m = t.match(/^(\d+)\s*分钟前/))) return nowSec - Number(m[1]) * 60;
    if ((m = t.match(/^(\d+)\s*小时前/))) return nowSec - Number(m[1]) * 3600;
    if ((m = t.match(/^(\d+)\s*天前/))) return nowSec - Number(m[1]) * 86400;
    if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) {
      return Math.floor(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() / 1000);
    }
    if ((m = t.match(/^(\d{1,2})-(\d{1,2})$/))) {
      const now = new Date();
      let d = new Date(now.getFullYear(), Number(m[1]) - 1, Number(m[2]));
      if (d.getTime() > Date.now()) d = new Date(now.getFullYear() - 1, Number(m[1]) - 1, Number(m[2]));
      return Math.floor(d.getTime() / 1000);
    }
    return 0;
  }

  /**
   * 提升贴吧数据
   * @param {Object} opts
   * @param {string} [opts.tid] - 帖子 ID（取楼层，推荐）
   * @param {string} [opts.kw] - 吧名（取帖子列表）
   * @param {string} [opts.file] - 已保存的 HTML，离线解析
   * @param {number} [opts.pages] - kw 模式下翻几页
   */
  async extractTieba(opts = {}) {
    console.log('  [贴吧] 开始提取...');
    const baseline = Math.floor(Date.now() / 1000);
    let chatId;
    let chatName;
    const messages = [];

    if (opts.tid || opts.file) {
      // 帖子 → 一层楼一条消息
      const args = ['thread'];
      if (opts.file) args.push('-Out', opts.file);
      else args.push('-Tid', String(opts.tid));
      args.push('-Json');
      const data = await this._runSkillJson(path.join('tieba', 'scripts', 'tieba.ps1'), args);
      const floors = data.楼层 || [];
      const tid = opts.tid || data.tid || 'file';
      chatId = `tieba_${tid}`;
      chatName = (data.标题 || `贴吧帖子 ${tid}`).trim();

      floors.forEach((f, i) => {
        messages.push({
          platform: PLATFORMS.TIEBA,
          // 用序号保证唯一：楼中楼的「楼层」可能为空，只用楼层会撞 id 被去重掉
          messageId: `${tid}_${i + 1}`,
          chatId,
          chatName,
          sender: f.作者 || '匿名',
          isSelf: false,
          timestamp: this._parseRelTime(f.时间, baseline),
          type: MESSAGE_TYPES.TEXT,
          content: f.地区 ? `${f.内容}\n[${f.地区}]` : f.内容
        });
      });
    } else if (opts.kw) {
      // 吧的帖子列表 → 一条帖子一条消息
      const args = ['posts', '-Kw', String(opts.kw), '-Json'];
      if (opts.pages) args.push('-Pages', String(opts.pages));
      const list = await this._runSkillJson(path.join('tieba', 'scripts', 'tieba.ps1'), args);
      chatId = `tieba_${opts.kw}`;
      chatName = `${opts.kw}吧`;
      for (const t of list) {
        messages.push({
          platform: PLATFORMS.TIEBA,
          messageId: `tieba_${t.tid}`,
          chatId,
          chatName,
          sender: t.作者 || '',
          isSelf: false,
          timestamp: 0,
          type: MESSAGE_TYPES.TEXT,
          content: `${t.置顶 ? '[置顶]' : ''}${t.精品 ? '[精品]' : ''}${t.title}（tid=${t.tid}）`
        });
      }
    } else {
      throw new Error('贴吧提取需要 --tieba-tid 或 --tieba-kw（或用 --tieba-file 离线解析）');
    }

    console.log(`  [贴吧] ${chatName}: ${messages.length} 条`);

    const data = createEmptyData();
    data.meta.platforms = [PLATFORMS.TIEBA];
    data.messages = messages;
    const times = messages.map((m) => m.timestamp).filter((t) => t > 0);
    data.meta.totalMessages = messages.length;
    data.meta.timeRange = { start: Math.min(...times, 0), end: Math.max(...times, 0) };
    data.contacts = [{
      id: chatId,
      chatId,
      name: chatName,
      platform: PLATFORMS.TIEBA,
      messageCount: messages.length,
      messageCountBySender: {}
    }];
    return data;
  }

  /**
   * 知乎问题：一条回答一条消息
   * @param {Object} opts
   * @param {string} [opts.qid] - 问题 ID
   * @param {string} [opts.file] - 已保存的 HTML
   */
  async extractZhihu(opts = {}) {
    console.log('  [知乎] 开始提取...');
    const args = ['question'];
    if (opts.file) args.push('-Out', opts.file);
    else if (opts.qid) args.push('-Id', String(opts.qid));
    else throw new Error('知乎提取需要 --zhihu-qid（或用 --zhihu-file 离线解析）');
    args.push('-Json');

    const q = await this._runSkillJson(path.join('zhihu', 'scripts', 'zhihu.ps1'), args);
    const chatId = `zhihu_${q.问题ID || opts.qid || 'file'}`;
    const chatName = (q.标题 || `知乎问题 ${q.问题ID}`).trim();
    const messages = [];

    if (q.详情) {
      messages.push({
        platform: PLATFORMS.ZHIHU,
        messageId: `${chatId}_detail`,
        chatId,
        chatName,
        sender: '问题',
        isSelf: false,
        timestamp: 0,
        type: MESSAGE_TYPES.TEXT,
        content: q.详情
      });
    }

    (q.答案 || []).forEach((a, i) => {
      messages.push({
        platform: PLATFORMS.ZHIHU,
        messageId: String(a.回答ID || `${chatId}_${i}`),
        chatId,
        chatName,
        sender: a.答主 || '匿名',
        isSelf: false,
        timestamp: a.时间 ? Math.floor(new Date(a.时间).getTime() / 1000) : 0,
        type: MESSAGE_TYPES.TEXT,
        content: a.内容
      });
    });

    console.log(`  [知乎] ${chatName}: ${messages.length} 条（首屏 ${(q.答案 || []).length} 条回答）`);

    const data = createEmptyData();
    data.meta.platforms = [PLATFORMS.ZHIHU];
    data.messages = messages;
    const times = messages.map((m) => m.timestamp).filter((t) => t > 0);
    data.meta.totalMessages = messages.length;
    data.meta.timeRange = { start: Math.min(...times, 0), end: Math.max(...times, 0) };
    data.contacts = [{
      id: chatId,
      chatId,
      name: chatName,
      platform: PLATFORMS.ZHIHU,
      messageCount: messages.length,
      messageCountBySender: {}
    }];
    return data;
  }

  // ============================================================
  //  B站
  //
  //  复用 zhaowen-mcp/bilibili 的 sources.ts（已实现 WBI 签名等），
  //  通过它的 cli.ts 以 tsx 运行，读 JSON 回来映射成统一消息。
  //  登录态用 BILI_COOKIE 环境变量；不给时只能取公开数据（热门/排行/搜索/视频详情）。
  // ============================================================

  /** 定位 zhaowen-mcp 仓库 */
  _mcpRoot() {
    const fromEnv = process.env.ZHAOWEN_MCP;
    if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
    const candidates = [
      path.join(process.cwd(), '..', 'zhaowen-mcp'),
      path.join(process.cwd(), 'zhaowen-mcp')
    ];
    for (const c of candidates) {
      try { if (fs.statSync(c).isDirectory()) return c; } catch {}
    }
    throw new Error('找不到 zhaowen-mcp 仓库，请设置环境变量 ZHAOWEN_MCP 指向它');
  }

  /**
   * 取 B站数据
   * @param {Object} opts
   * @param {string} opts.kind - history | favorites | popular | search | video | watchtime
   * @param {number} [opts.limit]
   * @param {string} [opts.kw] - kind=search 时的关键词
   * @param {string} [opts.bvid] - kind=video 时的稿件号
   */
  async extractBilibili(opts = {}) {
    const kind = opts.kind || 'history';
    console.log(`  [B站] 开始提取（${kind}）...`);

    const dir = path.join(this._mcpRoot(), 'bilibili');
    const tsx = path.join(dir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    if (!fs.existsSync(tsx)) throw new Error(`bilibili 的 tsx 未安装: ${tsx}`);

    const args = [tsx, path.join(dir, 'cli.ts'), kind];
    if (opts.limit) args.push('--limit', String(opts.limit));
    if (opts.kw) args.push('--kw', String(opts.kw));
    if (opts.bvid) args.push('--bvid', String(opts.bvid));

    const cmd = `"${process.execPath}" ${args.map((a) => `"${a}"`).join(' ')}`;
    const { stdout } = await execAsync(cmd, {
      cwd: dir,
      maxBuffer: 32 * 1024 * 1024,
      timeout: 180000,
      encoding: 'utf8'
    });
    const payload = JSON.parse(stdout);
    const items = payload.items || (payload.data ? [payload.data] : []);
    if (!items.length) {
      console.log('  [B站] 没有取到数据');
      return null;
    }

    const chatId = `bilibili_${kind}`;
    const chatName = {
      history: 'B站观看历史',
      favorites: 'B站收藏',
      popular: 'B站热门',
      search: `B站搜索 ${opts.kw || ''}`.trim(),
      video: 'B站视频',
      watchtime: 'B站观看时长'
    }[kind] || `B站 ${kind}`;

    const messages = items.map((it, i) => {
      const time = it.viewedAt || it.pubdate || it.pubTime || 0;
      const title = it.title || '';
      const up = it.up || it.author || '';
      const extra = [];
      if (up) extra.push(`UP: ${up}`);
      if (it.play != null) extra.push(`播放 ${it.play}`);
      if (it.progress != null && it.duration != null) extra.push(`进度 ${it.progress}/${it.duration}`);
      if (it.bvid) extra.push(it.bvid);
      return {
        platform: PLATFORMS.BILIBILI,
        messageId: it.bvid ? `${kind}_${it.bvid}` : `${chatId}_${i + 1}`,
        chatId,
        chatName,
        sender: up || 'B站',
        isSelf: false,
        timestamp: typeof time === 'number' ? time : Math.floor(new Date(time).getTime() / 1000) || 0,
        type: MESSAGE_TYPES.TEXT,
        content: [title, extra.join(' · ')].filter(Boolean).join('\n')
      };
    });

    console.log(`  [B站] ${chatName}: ${messages.length} 条`);

    const data = createEmptyData();
    data.meta.platforms = [PLATFORMS.BILIBILI];
    data.messages = messages;
    const times = messages.map((m) => m.timestamp).filter((t) => t > 0);
    data.meta.totalMessages = messages.length;
    data.meta.timeRange = { start: Math.min(...times, 0), end: Math.max(...times, 0) };
    data.contacts = [{
      id: chatId,
      chatId,
      name: chatName,
      platform: PLATFORMS.BILIBILI,
      messageCount: messages.length,
      messageCountBySender: {}
    }];
    return data;
  }

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

    if (config.tieba) {
      try {
        const data = await this.extractTieba(config.tieba);
        if (data) { dataList.push(data); console.log(`  [贴吧] ✓ ${data.messages.length} 条消息\n`); }
      } catch (err) { console.warn(`  [贴吧] ✗ ${err.message}\n`); }
    }

    if (config.zhihu) {
      try {
        const data = await this.extractZhihu(config.zhihu);
        if (data) { dataList.push(data); console.log(`  [知乎] ✓ ${data.messages.length} 条消息\n`); }
      } catch (err) { console.warn(`  [知乎] ✗ ${err.message}\n`); }
    }

    if (config.bilibili) {
      try {
        const data = await this.extractBilibili(config.bilibili);
        if (data) { dataList.push(data); console.log(`  [B站] ✓ ${data.messages.length} 条消息\n`); }
      } catch (err) { console.warn(`  [B站] ✗ ${err.message}\n`); }
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
        // 各源的联系人字段不统一：有的给 chatId，有的只给 id。
        // 只用 chatId 会让没有该字段的源全部折叠成同一个 undefined 键，
        // 表现为「消息都在、联系人只剩 1 个」。
        const key = contact.chatId || contact.id || contact.name;
        if (!contactMap.has(key)) {
          contactMap.set(key, { ...contact });
        } else {
          const existing = contactMap.get(key);
          existing.msgCount = (existing.msgCount || 0) + (contact.msgCount || contact.messageCount || 0);
          existing.selfMsgCount = (existing.selfMsgCount || 0) + (contact.selfMsgCount || 0);
          if ((contact.lastActive || 0) > (existing.lastActive || 0)) existing.lastActive = contact.lastActive;
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
