/**
 * 用户路由 - 注册、登录
 *
 * 设计原则：匿名社交
 * - 注册时自动生成随机代号（如"旅人#3F2A"）
 * - 不存储任何个人信息
 * - 其他用户只能看到代号，看不到 ID
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db/init.js';
import { generateToken } from './auth.js';

const router = Router();

/**
 * POST /api/users/register
 * 注册 - 自动生成匿名代号
 */
router.post('/register', (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }

  // 生成随机匿名代号: 旅人#XXXX（冲突时自动重试）
  let alias, hash, result;
  hash = bcrypt.hashSync(password, 10);

  for (let attempt = 0; attempt < 5; attempt++) {
    alias = generateAlias();
    try {
      result = db.prepare(
        'INSERT INTO users (alias, password_hash) VALUES (?, ?)'
      ).run(alias, hash);
      break;
    } catch (err) {
      if (err.message.includes('UNIQUE') && attempt < 4) continue;
      return res.status(500).json({ error: '注册失败，请重试' });
    }
  }

  const token = generateToken(result.lastInsertRowid);
  res.json({
    alias,
    token,
    message: '注册成功。你在纪念碑谷的代号是：' + alias
  });
});

/**
 * POST /api/users/login
 * 登录 - 用代号+密码
 */
router.post('/login', (req, res) => {
  const { alias, password } = req.body;

  if (!alias || !password) {
    return res.status(400).json({ error: '请输入代号和密码' });
  }

  const user = db.prepare('SELECT * FROM users WHERE alias = ?').get(alias);
  if (!user) {
    return res.status(401).json({ error: '代号或密码错误' });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '代号或密码错误' });
  }

  const token = generateToken(user.id);
  res.json({ alias: user.alias, token });
});

/**
 * GET /api/users/me
 * 获取当前用户信息
 */
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '未登录' });

  try {
    const jwt = (await import('jsonwebtoken')).default;
    const JWT_SECRET = process.env.JWT_SECRET || 'monument-valley-secret-2026';
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);

    const user = db.prepare('SELECT alias, created_at FROM users WHERE id = ?').get(decoded.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    res.json(user);
  } catch {
    res.status(401).json({ error: 'Token 无效' });
  }
});

/**
 * 生成随机匿名代号
 * 格式: 旅人#XXXX (4位十六进制)
 */
function generateAlias() {
  const prefixes = ['旅人', '过客', '行者', '归人', '守望', '漫游'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const hex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}#${hex}`;
}

export default router;
