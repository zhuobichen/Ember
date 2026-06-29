/**
 * 互动路由 - 评论 + 漂流瓶
 */

import { Router } from 'express';
import db from '../db/init.js';
import { auth, optionalAuth } from './auth.js';

const router = Router();

// ========== 评论 ==========

/**
 * GET /api/monuments/:id/comments
 * 获取纪念碑的评论
 */
router.get('/monuments/:id/comments', (req, res) => {
  const { id } = req.params;

  const comments = db.prepare(`
    SELECT c.id, c.content,
           strftime('%Y-%m-%dT%H:%M:%SZ', c.created_at) as created_at,
           u.alias as author_alias
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.monument_id = ?
    ORDER BY c.created_at DESC
  `).all(id);

  res.json(comments);
});

/**
 * POST /api/monuments/:id/comments
 * 发表评论（需要登录）
 */
router.post('/monuments/:id/comments', auth, (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  const monument = db.prepare('SELECT id FROM monuments WHERE id = ?').get(id);
  if (!monument) return res.status(404).json({ error: '纪念碑不存在' });

  const result = db.prepare(`
    INSERT INTO comments (monument_id, user_id, content) VALUES (?, ?, ?)
  `).run(id, req.userId, content.trim());

  // 返回评论（带作者代号，字段名与查询结果一致用 snake_case）
  const user = db.prepare('SELECT alias FROM users WHERE id = ?').get(req.userId);
  res.json({
    id: result.lastInsertRowid,
    content: content.trim(),
    created_at: new Date().toISOString(),
    author_alias: user.alias
  });
});

// ========== 漂流瓶 ==========

/**
 * GET /api/monuments/:id/bottles
 * 获取纪念碑的漂流瓶（仅作者可见全部，其他人只能看未读的）
 */
router.get('/monuments/:id/bottles', optionalAuth, (req, res) => {
  const { id } = req.params;

  const monument = db.prepare('SELECT * FROM monuments WHERE id = ?').get(id);
  if (!monument) return res.status(404).json({ error: '纪念碑不存在' });

  const isOwner = req.userId === monument.user_id;

  let bottles;
  if (isOwner) {
    // 作者可以看到所有漂流瓶
    bottles = db.prepare(`
      SELECT id, message, is_read,
             strftime('%Y-%m-%dT%H:%M:%SZ', created_at) as created_at
      FROM drift_bottles WHERE monument_id = ?
      ORDER BY created_at DESC
    `).all(id);
  } else {
    // 非作者只能看到已读的漂流瓶（公开的）
    bottles = db.prepare(`
      SELECT id, message,
             strftime('%Y-%m-%dT%H:%M:%SZ', created_at) as created_at
      FROM drift_bottles WHERE monument_id = ? AND is_read = 1
      ORDER BY created_at DESC
    `).all(id);
  }

  res.json(bottles);
});

/**
 * POST /api/monuments/:id/bottles
 * 投递漂流瓶（需要登录）
 */
router.post('/monuments/:id/bottles', auth, (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: '漂流瓶内容不能为空' });
  }

  if (message.length > 500) {
    return res.status(400).json({ error: '漂流瓶内容不超过500字' });
  }

  const monument = db.prepare('SELECT id, user_id FROM monuments WHERE id = ?').get(id);
  if (!monument) return res.status(404).json({ error: '纪念碑不存在' });

  const result = db.prepare(`
    INSERT INTO drift_bottles (monument_id, sender_id, message) VALUES (?, ?, ?)
  `).run(id, req.userId, message.trim());

  res.json({
    id: result.lastInsertRowid,
    message: '漂流瓶已投递'
  });
});

/**
 * PUT /api/bottles/:id/read
 * 标记漂流瓶为已读（仅纪念碑作者）
 */
router.put('/bottles/:id/read', auth, (req, res) => {
  const { id } = req.params;

  const bottle = db.prepare(`
    SELECT b.*, m.user_id as monument_owner_id
    FROM drift_bottles b
    JOIN monuments m ON b.monument_id = m.id
    WHERE b.id = ?
  `).get(id);

  if (!bottle) return res.status(404).json({ error: '漂流瓶不存在' });
  if (bottle.monument_owner_id !== req.userId) {
    return res.status(403).json({ error: '无权操作' });
  }

  db.prepare('UPDATE drift_bottles SET is_read = 1 WHERE id = ?').run(id);
  res.json({ message: '已标记为已读' });
});

export default router;
