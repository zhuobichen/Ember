/**
 * 数据库初始化 - SQLite
 *
 * 表结构:
 * 1. users          - 用户（匿名，仅存代号+密码哈希）
 * 2. monuments      - 纪念碑
 * 3. puzzles        - 谜题（答题解锁）
 * 4. comments       - 评论
 * 5. drift_bottles  - 漂流瓶
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'valley.db');

/**
 * 数据库驱动：优先 better-sqlite3（原生模块，性能好），装不上就用 Node 内置的 node:sqlite。
 *
 * 为什么要有回落：better-sqlite3 是原生模块，Node 24 + 没有 MSVC 构建工具时
 * `npm install` 会在 node-gyp 阶段失败；而 node:sqlite 从 Node 22 起内置，不用编译。
 * 两者的 prepare/get/all/run/exec 语义基本一致，只有 pragma 和 transaction 需要补。
 */
async function openDb() {
  try {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    return db;
  } catch (err) {
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL');

    // 补上 better-sqlite3 的 db.pragma()
    db.pragma = (stmt) => db.exec(`PRAGMA ${stmt}`);

    // 补上 better-sqlite3 的 db.transaction(fn) —— 返回一个可调用函数
    db.transaction = (fn) => (...args) => {
      db.exec('BEGIN');
      try {
        const out = fn(...args);
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    };

    // lastInsertRowid 在 node:sqlite 里可能是 bigint，直接进 JSON 会抛
    const rawPrepare = db.prepare.bind(db);
    db.prepare = (sql) => {
      const stmt = rawPrepare(sql);
      const rawRun = stmt.run.bind(stmt);
      stmt.run = (...a) => {
        const r = rawRun(...a);
        if (r && typeof r.lastInsertRowid === 'bigint') {
          r.lastInsertRowid = Number(r.lastInsertRowid);
        }
        return r;
      };
      return stmt;
    };

    console.warn(`[db] better-sqlite3 不可用（${err.message.split('\n')[0]}），已回落到 node:sqlite`);
    return db;
  }
}

const db = await openDb();

// 初始化表结构
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT UNIQUE NOT NULL,           -- 匿名代号（如"旅人#3F2A"）
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS monuments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT '一个人的纪念碑',
    subtitle TEXT DEFAULT '',
    content TEXT NOT NULL,                -- monument.json 的内容
    html_content TEXT,                    -- 渲染后的 HTML（可选）
    puzzle_question TEXT,                 -- 谜题问题
    puzzle_answer TEXT,                   -- 谜题答案（哈希存储）
    is_public INTEGER DEFAULT 1,
    views INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monument_id INTEGER NOT NULL,
    user_id INTEGER,                      -- 可为空（匿名评论）
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (monument_id) REFERENCES monuments(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS drift_bottles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monument_id INTEGER NOT NULL,
    sender_id INTEGER,                    -- 可为空（匿名）
    message TEXT NOT NULL,               -- 漂流瓶内容
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (monument_id) REFERENCES monuments(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
  );
`);

export default db;
