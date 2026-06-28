/**
 * 微信数据库读取器 - 自包含模块（从 weflow-cli 抽离核心逻辑）
 *
 * 不依赖 weflow-cli CLI，直接读取微信本地数据库：
 * - 3.x: MSG0.db (SQLCipher 3 加密，PBKDF2-SHA1 64000次)
 * - 4.x: MSG0.db (SQLCipher 4 加密，PBKDF2-SHA512 256000次)
 * - 4.x NT: message_0.db (需 Python sqlcipher3，通过 nt_decrypt.py)
 *
 * 依赖：
 * - Node.js 22+ (node:sqlite)
 * - lz4 (npm install lz4)
 * - Python 3 + sqlcipher3 (仅 4.x NT 格式需要)
 *
 * 用法：
 *   import { WechatDB } from './core/wechat-db.js';
 *   const db = new WechatDB();
 *
 *   // 3.x / 4.x MSG0.db
 *   await db.open('C:/.../Msg/Multi/MSG0.db', '密钥hex', 'wxid_xxx');
 *   const sessions = await db.getSessions();
 *   const messages = await db.getMessages('wxid_xxx', 1000);
 *   db.close();
 *
 *   // 已解密的数据库（跳过解密）
 *   await db.openRaw('path/to/decrypted.db', 'wxid_xxx');
 */

import crypto from 'crypto';
import { existsSync, readFileSync, readdirSync, unlinkSync, mkdirSync, writeFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import os from 'os';
import { DatabaseSync } from 'node:sqlite';
import lz4 from 'lz4';

const PAGE_SIZE = 4096;
const KEY_SIZE = 32;
const DEFAULT_ITER = 64000;
const RESERVED_LEN = 48;
const SQLITE_HEADER = 'SQLite format 3\x00';

export class WechatDB {
  constructor() {
    this.db = null;
    this.contactDb = null;
    this.tempDir = '';
    this.tempFiles = new Map();
    this.pageKey = null;
    this.opened = false;
    this.wxid = '';
    this.wxDirRoot = '';
    this.contactMap = new Map(); // wxid -> { nickname, remark }
  }

  // ================================================================
  //  数据库解密（3.x 格式）
  // ================================================================

  /**
   * 解密 3.x 数据库到临时文件
   * 加密格式：PBKDF2-HMAC-SHA1 64000次, AES-256-CBC, 页大小4096
   */
  decryptToTemp(dbPath, keyHex) {
    const cached = this.tempFiles.get(dbPath);
    if (cached && existsSync(cached)) return cached;

    const password = Buffer.from(keyHex, 'hex');
    const blist = readFileSync(dbPath);
    const salt = blist.subarray(0, 16);

    this.pageKey = crypto.pbkdf2Sync(password, salt, DEFAULT_ITER, KEY_SIZE, 'sha1');

    if (!this.tempDir) {
      this.tempDir = join(os.tmpdir(), 'cyber_urn_wechat_decrypt');
      if (!existsSync(this.tempDir)) mkdirSync(this.tempDir, { recursive: true });
    }

    const tempPath = join(this.tempDir, basename(dbPath) + '.decrypted.db');
    const output = [];
    output.push(Buffer.from(SQLITE_HEADER));

    for (let i = 0; i < blist.length; i += PAGE_SIZE) {
      if (i === 0) {
        const pageData = blist.subarray(16, i + PAGE_SIZE);
        this._decryptPage(pageData, output);
      } else {
        const pageData = blist.subarray(i, Math.min(i + PAGE_SIZE, blist.length));
        this._decryptPage(pageData, output);
      }
    }

    writeFileSync(tempPath, Buffer.concat(output));
    this.tempFiles.set(dbPath, tempPath);
    return tempPath;
  }

  _decryptPage(pageData, output) {
    if (pageData.length === 0) return;
    if (pageData.length <= RESERVED_LEN) {
      output.push(pageData);
      return;
    }
    const encryptedLen = pageData.length - RESERVED_LEN;
    const encryptedData = pageData.subarray(0, encryptedLen);
    const reserved = pageData.subarray(encryptedLen);
    const iv = reserved.subarray(0, 16);
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.pageKey, iv);
      decipher.setAutoPadding(false);
      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
      output.push(decrypted);
      output.push(reserved);
    } catch {
      output.push(pageData);
    }
  }

  // ================================================================
  //  数据库解密（4.x 格式）
  // ================================================================

  /**
   * 解密 4.x 数据库（多组参数尝试）
   * WCDB/SQLCipher 4: PBKDF2-HMAC-SHA512 256000次, 保留区80字节
   */
  _decryptPages4x(blist, pageKey, salt, reserveLen, outputPath) {
    const output = [];
    output.push(Buffer.from(SQLITE_HEADER));

    for (let i = 0; i < blist.length; i += PAGE_SIZE) {
      const pageData = blist.subarray(i, Math.min(i + PAGE_SIZE, blist.length));
      if (pageData.length === 0) continue;

      if (i === 0) {
        const encryptedLen = pageData.length - 16 - reserveLen;
        if (encryptedLen <= 0) { output.push(pageData.subarray(16)); continue; }
        const encryptedData = pageData.subarray(16, 16 + encryptedLen);
        const reserved = pageData.subarray(16 + encryptedLen);
        const iv = reserved.subarray(0, 16);
        try {
          const decipher = crypto.createDecipheriv('aes-256-cbc', pageKey, iv);
          decipher.setAutoPadding(false);
          const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
          output.push(decrypted);
          output.push(reserved);
        } catch { throw new Error('解密失败'); }
      } else {
        const encryptedLen = pageData.length - reserveLen;
        if (encryptedLen <= 0) { output.push(pageData); continue; }
        const encryptedData = pageData.subarray(0, encryptedLen);
        const reserved = pageData.subarray(encryptedLen);
        const iv = reserved.subarray(0, 16);
        try {
          const decipher = crypto.createDecipheriv('aes-256-cbc', pageKey, iv);
          decipher.setAutoPadding(false);
          const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
          output.push(decrypted);
          output.push(reserved);
        } catch { throw new Error('解密失败'); }
      }
    }
    writeFileSync(outputPath, Buffer.concat(output));
  }

  // ================================================================
  //  打开数据库
  // ================================================================

  /**
   * 打开 3.x 数据库
   */
  async open(dbPath, keyHex, wxid) {
    if (this.opened) this.close();
    if (!existsSync(dbPath)) return { success: false, error: `数据库不存在: ${dbPath}` };
    if (!keyHex || keyHex.length !== 64) return { success: false, error: '密钥格式错误，需要64位hex' };

    this.wxid = wxid || '';
    try { this.wxDirRoot = dirname(dirname(dirname(dirname(dbPath)))); } catch { this.wxDirRoot = ''; }

    try {
      const tempPath = this.decryptToTemp(dbPath, keyHex);
      this.db = new DatabaseSync(tempPath);
      this.opened = true;
      return { success: true };
    } catch (e) {
      return { success: false, error: `打开3.x数据库失败: ${e.message}` };
    }
  }

  /**
   * 打开 4.x 数据库
   */
  async open4x(dbPath, keyHex, wxid) {
    if (this.opened) this.close();
    if (!existsSync(dbPath)) return { success: false, error: `数据库不存在: ${dbPath}` };
    if (!keyHex || keyHex.length !== 64) return { success: false, error: '密钥格式错误' };

    this.wxid = wxid || '';
    try { this.wxDirRoot = dirname(dirname(dirname(dirname(dbPath)))); } catch { this.wxDirRoot = ''; }

    const password = Buffer.from(keyHex, 'hex');
    const blist = readFileSync(dbPath);
    const salt = blist.subarray(0, 16);

    const configs = [
      { sha: 'sha512', iters: 256000, reserve: 80 },
      { sha: 'sha512', iters: 256000, reserve: 48 },
      { sha: 'sha1', iters: 64000, reserve: 48 },
      { sha: 'sha512', iters: 64000, reserve: 80 },
      { sha: 'sha256', iters: 256000, reserve: 80 },
    ];

    if (!this.tempDir) {
      this.tempDir = join(os.tmpdir(), 'cyber_urn_wechat_4x');
      if (!existsSync(this.tempDir)) mkdirSync(this.tempDir, { recursive: true });
    }

    for (const cfg of configs) {
      try {
        const pageKey = crypto.pbkdf2Sync(password, salt, cfg.iters, KEY_SIZE, cfg.sha);
        const tempPath = join(this.tempDir, basename(dbPath) + '.4x_decrypted.db');
        this._decryptPages4x(blist, pageKey, salt, cfg.reserve, tempPath);
        this.db = new DatabaseSync(tempPath);
        this.opened = true;
        this.tempFiles.set(dbPath, tempPath);
        return { success: true };
      } catch { /* 尝试下一组 */ }
    }

    // 尝试原始密钥
    for (const reserve of [80, 48]) {
      try {
        const tempPath = join(this.tempDir, basename(dbPath) + '.4x_raw.db');
        this._decryptPages4x(blist, password, salt, reserve, tempPath);
        this.db = new DatabaseSync(tempPath);
        this.opened = true;
        this.tempFiles.set(dbPath, tempPath);
        return { success: true };
      } catch { /* 尝试下一组 */ }
    }

    return {
      success: false,
      error: '4.x解密失败。可能原因：密钥不正确、数据库版本不匹配。\n解决方案：使用 python scripts/nt_decrypt.py 或 weflow-cli dbkey 提取密钥'
    };
  }

  /**
   * 直接打开已解密的数据库
   */
  async openRaw(dbPath, wxid) {
    if (this.opened) this.close();
    if (!existsSync(dbPath)) return { success: false, error: `数据库不存在: ${dbPath}` };
    this.wxid = wxid || '';
    try {
      this.db = new DatabaseSync(dbPath);
      this.opened = true;
      return { success: true };
    } catch (e) {
      return { success: false, error: `打开数据库失败: ${e.message}` };
    }
  }

  // ================================================================
  //  查询接口
  // ================================================================

  /**
   * 获取会话列表
   */
  async getSessions() {
    if (!this.db) return { success: false, error: '数据库未打开' };
    try {
      const stmt = this.db.prepare(`
        SELECT m.StrTalker as username, MAX(m.CreateTime) as lastTimestamp,
          (SELECT m2.StrContent FROM MSG m2 WHERE m2.StrTalker = m.StrTalker
           ORDER BY m2.CreateTime DESC LIMIT 1) as summary
        FROM MSG m WHERE m.StrTalker != ''
        GROUP BY m.StrTalker ORDER BY lastTimestamp DESC LIMIT 500
      `);
      const rows = stmt.all();
      return {
        success: true,
        sessions: rows.map(r => ({
          username: r.username || '',
          type: (r.username || '').includes('@chatroom') ? 1 : 0,
          summary: r.summary || '',
          lastTimestamp: r.lastTimestamp || 0,
          displayName: r.username || ''
        }))
      };
    } catch (e) {
      return { success: false, error: `获取会话失败: ${e.message}` };
    }
  }

  /**
   * 获取消息列表
   */
  async getMessages(talker, limit = 0, offset = 0) {
    if (!this.db) return { success: false, error: '数据库未打开' };
    try {
      let rows;
      const sql = `SELECT localId, CAST(MsgSvrID AS TEXT) as MsgSvrID, Type, SubType, IsSender,
        CreateTime, StrTalker, StrContent, CompressContent, BytesExtra
        FROM MSG WHERE StrTalker = ? ORDER BY CreateTime DESC`;

      if (limit > 0) {
        rows = this.db.prepare(sql + ' LIMIT ? OFFSET ?').all(talker, limit, offset);
      } else {
        rows = this.db.prepare(sql).all(talker);
      }

      return { success: true, messages: rows.map(r => this._processMessage(r)) };
    } catch (e) {
      return { success: false, error: `获取消息失败: ${e.message}` };
    }
  }

  /**
   * 获取联系人列表
   */
  async getContacts() {
    if (!this.db) return { success: false, error: '数据库未打开' };
    try {
      const rows = this.db.prepare('SELECT UsrName as username FROM Name2ID ORDER BY UsrName LIMIT 500').all();
      return { success: true, contacts: rows.map(r => ({ username: r.username || '', displayName: r.username || '' })) };
    } catch (e) {
      return { success: false, error: `获取联系人失败: ${e.message}` };
    }
  }

  /**
   * 从 MicroMsg.db 加载联系人昵称/备注
   * 需要数据库密钥来解密 MicroMsg.db
   * @param {string} microMsgPath - MicroMsg.db 路径（可选，自动推导）
   * @param {string} keyHex - 数据库密钥
   * @param {boolean} is4x - 是否 4.x 格式
   */
  async loadContactNames(keyHex, microMsgPath, is4x = false) {
    if (!keyHex) return { success: false, error: '需要密钥来解密 MicroMsg.db' };

    // 自动推导 MicroMsg.db 路径
    if (!microMsgPath && this.wxDirRoot && this.wxid) {
      microMsgPath = join(this.wxDirRoot, this.wxid, 'Msg', 'MicroMsg.db');
    }
    if (!microMsgPath || !existsSync(microMsgPath)) {
      return { success: false, error: `MicroMsg.db 不存在: ${microMsgPath}` };
    }

    try {
      // 创建临时 WechatDB 实例来打开 MicroMsg.db
      const tempDb = new WechatDB();
      let openRes;
      if (is4x) {
        openRes = await tempDb.open4x(microMsgPath, keyHex, this.wxid);
      } else {
        openRes = await tempDb.open(microMsgPath, keyHex, this.wxid);
      }

      if (!openRes.success) {
        return { success: false, error: `打开 MicroMsg.db 失败: ${openRes.error}` };
      }

      // 查询 contact 表
      try {
        const rows = tempDb.db.prepare(`
          SELECT UserName, NickName, Remark, Alias
          FROM Contact
          WHERE NickName != '' OR Remark != ''
        `).all();

        this.contactMap.clear();
        for (const row of rows) {
          const displayName = row.Remark || row.NickName || row.Alias || row.UserName;
          this.contactMap.set(row.UserName, {
            nickname: row.NickName || '',
            remark: row.Remark || '',
            alias: row.Alias || '',
            displayName
          });
        }

        // 关闭临时数据库
        tempDb.close();
        this.contactDb = null;
        return { success: true, count: rows.length };
      } catch (e) {
        tempDb.close();
        return { success: false, error: `查询 contact 表失败: ${e.message}` };
      }
    } catch (e) {
      return { success: false, error: `加载联系人失败: ${e.message}` };
    }
  }

  /**
   * 获取联系人显示名称
   */
  getDisplayName(wxid) {
    const contact = this.contactMap.get(wxid);
    if (contact) return contact.displayName;
    // 特殊账号处理
    const specialNames = {
      'filehelper': '文件传输助手',
      'newsapp': '腾讯新闻',
      'notifymessage': '通知消息',
      'weixin': '微信团队',
      'fmessage': '朋友推荐消息',
      'qqmail': 'QQ邮箱提醒',
      'qqsafe': 'QQ安全中心',
      'floatbottle': '漂流瓶',
      'medianote': '语音记事本',
      'filetransfer': '文件传输助手'
    };
    if (specialNames[wxid]) return specialNames[wxid];
    if (wxid.endsWith('@chatroom')) return wxid.replace('@chatroom', '');
    return wxid;
  }

  // ================================================================
  //  消息解析
  // ================================================================

  _processMessage(row) {
    const localType = Number(row.Type) || 0;
    const isSend = Number(row.IsSender) || 0;
    const strContent = String(row.StrContent ?? '');
    const compressContent = row.CompressContent;
    const bytesExtra = row.BytesExtra;
    let parsedContent = '';
    let appTitle, appDescription, appUrl;

    switch (localType) {
      case 1: {
        // 文本消息，但可能是XML（公众号推送如mmreader）
        if (strContent.startsWith('<?xml') || strContent.startsWith('<msg')) {
          if (strContent.includes('<mmreader')) {
            // 腾讯新闻/公众号推送：提取标题
            const titles = [];
            const titleRegex = /<title[^>]*>([^<]+)<\/title>/g;
            let match;
            while ((match = titleRegex.exec(strContent)) !== null && titles.length < 5) {
              titles.push(match[1]);
            }
            if (titles.length > 0) {
              parsedContent = `[公众号推送] ${titles.join('；')}`;
            } else {
              parsedContent = '[公众号推送]';
            }
          } else {
            const titleMatch = strContent.match(/<title[^>]*>([^<]+)<\/title>/);
            parsedContent = titleMatch ? `[XML消息] ${titleMatch[1]}` : '[XML消息]';
          }
        } else {
          parsedContent = strContent;
        }
        break;
      }
      case 3: {
        const fileName = this._parseBytesExtraImage(bytesExtra);
        parsedContent = fileName ? `[图片: ${fileName}]` : '[图片]';
        break;
      }
      case 34: parsedContent = '[语音]'; break;
      case 43: parsedContent = '[视频]'; break;
      case 47: parsedContent = strContent ? `[表情: ${strContent}]` : '[表情]'; break;
      case 49: {
        const xml = this._decompressLZ4(compressContent);
        if (xml) {
          const info = this._parseAppMsgXml(xml);
          appTitle = info.title; appDescription = info.description; appUrl = info.url;
          parsedContent = this._formatAppMsg(info);
        } else if (strContent.startsWith('<?xml') || strContent.startsWith('<msg')) {
          // 尝试从 XML 中提取标题（公众号推送等）
          const titleMatch = strContent.match(/<title[^>]*>([^<]+)<\/title>/);
          const descMatch = strContent.match(/<desc[^>]*>([^<]+)<\/desc>/);
          if (titleMatch && titleMatch[1]) {
            parsedContent = `[分享] ${titleMatch[1]}`;
            if (descMatch && descMatch[1]) parsedContent += ` ${descMatch[1]}`;
            appTitle = titleMatch[1];
            appDescription = descMatch ? descMatch[1] : '';
          } else {
            parsedContent = '[公众号消息]';
          }
        } else if (strContent) {
          parsedContent = strContent;
        } else {
          parsedContent = '[链接/文件]';
        }
        break;
      }
      case 50: parsedContent = '[语音通话]'; break;
      case 37: parsedContent = '[朋友推荐]'; break; // 好友验证/推荐
      case 10000: parsedContent = strContent.replace(/\n/g, ' '); break;
      default:
        // 未知类型，内容为XML时标记
        if (strContent.startsWith('<?xml') || strContent.startsWith('<msg')) {
          parsedContent = '[未知消息类型]';
        } else {
          parsedContent = strContent || `[消息类型${localType}]`;
        }
    }

    return {
      localId: Number(row.localId) || 0,
      serverId: String(row.MsgSvrID ?? ''),
      localType,
      createTime: Number(row.CreateTime) || 0,
      isSend,
      senderUsername: isSend ? '' : (row.StrTalker || ''),
      content: strContent,
      rawContent: strContent,
      parsedContent,
      appTitle, appDescription, appUrl
    };
  }

  _toBuffer(data) {
    if (!data || data.length === 0) return null;
    if (Buffer.isBuffer(data)) return data;
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  _decompressLZ4(data) {
    const buf = this._toBuffer(data);
    if (!buf) return null;
    try {
      const outBuf = Buffer.alloc(buf.length * 256);
      const size = lz4.decodeBlock(buf, outBuf);
      return outBuf.subarray(0, size).toString('utf8');
    } catch { return null; }
  }

  _parseBytesExtraImage(data) {
    const buf = this._toBuffer(data);
    if (!buf) return undefined;
    try {
      const str = buf.toString('utf8');
      const match = str.match(/<img_file_name>([^<]+)<\/img_file_name>/);
      return match ? match[1] : undefined;
    } catch { return undefined; }
  }

  _parseAppMsgXml(xml) {
    try {
      const title = xml.match(/<title>([^<]*)<\/title>/);
      const des = xml.match(/<des>([^<]*)<\/des>/);
      const url = xml.match(/<url>([^<]*)<\/url>/);
      const type = xml.match(/<type>(\d+)<\/type>/);
      const decode = s => s ? s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'") : undefined;
      return { title: decode(title?.[1]), description: decode(des?.[1]), url: decode(url?.[1]), type: type?.[1] };
    } catch { return {}; }
  }

  _formatAppMsg(info) {
    const parts = [];
    switch (info.type) {
      case '5': if (info.title) parts.push(`[分享] ${info.title}`); if (info.description) parts.push(info.description); if (info.url) parts.push(info.url); break;
      case '6': if (info.title) parts.push(`[文件] ${info.title}`); break;
      case '57': if (info.title) parts.push(`[引用] ${info.title}`); break;
      default: if (info.title) parts.push(`[AppMsg] ${info.title}`); if (info.description) parts.push(info.description); break;
    }
    return parts.join('\n') || '[链接/文件]';
  }

  // ================================================================
  //  密钥验证
  // ================================================================

  static verifyKey(keyHex, dbPath) {
    try {
      const password = Buffer.from(keyHex, 'hex');
      const blist = readFileSync(dbPath);
      if (blist.length < PAGE_SIZE) return false;
      const salt = blist.subarray(0, 16);
      const byteHmac = crypto.pbkdf2Sync(password, salt, DEFAULT_ITER, KEY_SIZE, 'sha1');
      const macSalt = Buffer.alloc(16);
      for (let i = 0; i < 16; i++) macSalt[i] = salt[i] ^ 58;
      const macKey = crypto.pbkdf2Sync(byteHmac, macSalt, 2, KEY_SIZE, 'sha1');
      const hmac = crypto.createHmac('sha1', macKey);
      hmac.update(blist.subarray(16, PAGE_SIZE - 32));
      hmac.update(Buffer.from([1, 0, 0, 0]));
      const expected = blist.subarray(16, PAGE_SIZE).subarray(-32, -12);
      return hmac.digest().equals(expected);
    } catch { return false; }
  }

  // ================================================================
  //  清理
  // ================================================================

  close() {
    if (this.db) { try { this.db.close(); } catch {} this.db = null; }
    if (this.contactDb) { try { this.contactDb.close(); } catch {} this.contactDb = null; }
    for (const tempPath of this.tempFiles.values()) {
      try { if (existsSync(tempPath)) unlinkSync(tempPath); } catch {}
    }
    this.tempFiles.clear();
    this.pageKey = null;
    this.opened = false;
    this.contactMap.clear();
  }
}
