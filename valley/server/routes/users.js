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
import { generateToken, auth } from './auth.js';

const router = Router();

/**
 * POST /api/users/register
 * 注册 - 支持自定义别名，不填则随机生成
 */
router.post('/register', (req, res) => {
  const { password, alias: customAlias } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }

  const hash = bcrypt.hashSync(password, 10);
  let alias, result;

  if (customAlias && customAlias.trim()) {
    alias = customAlias.trim();
    if (alias.length < 2 || alias.length > 20) {
      return res.status(400).json({ error: '别名长度需在2-20位之间' });
    }
    try {
      result = db.prepare(
        'INSERT INTO users (alias, password_hash) VALUES (?, ?)'
      ).run(alias, hash);
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: '该别名已被使用' });
      }
      return res.status(500).json({ error: '注册失败，请重试' });
    }
  } else {
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
router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT alias, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

/**
 * PUT /api/users/me/alias
 * 修改别名
 */
router.put('/me/alias', auth, (req, res) => {
  const { alias } = req.body;

  if (!alias || !alias.trim()) {
    return res.status(400).json({ error: '别名不能为空' });
  }

  const trimmedAlias = alias.trim();
  if (trimmedAlias.length < 2 || trimmedAlias.length > 20) {
    return res.status(400).json({ error: '别名长度需在2-20位之间' });
  }

  try {
    db.prepare('UPDATE users SET alias = ? WHERE id = ?').run(trimmedAlias, req.userId);
    res.json({ alias: trimmedAlias, message: '别名修改成功' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '该别名已被使用' });
    }
    res.status(500).json({ error: '修改失败' });
  }
});

/**
 * PUT /api/users/me/password
 * 修改密码
 */
router.put('/me/password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请输入原密码和新密码' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少6位' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(400).json({ error: '原密码错误' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.userId);

  res.json({ message: '密码修改成功' });
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
