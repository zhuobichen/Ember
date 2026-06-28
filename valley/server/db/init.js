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

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'valley.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

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
