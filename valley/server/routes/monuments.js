/**
 * 纪念碑路由 - CRUD、谜题、浏览
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import db from '../db/init.js';
import { auth, optionalAuth } from './auth.js';

const router = Router();

// 文件上传配置（monument.json）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * GET /api/monuments
 * 浏览纪念碑列表（公开，不显示作者信息）
 * 支持搜索、排序、筛选
 */
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const sort = req.query.sort || 'latest';
  const hasPuzzle = req.query.has_puzzle;

  let whereClause = 'WHERE is_public = 1';
  const params = [];

  if (search) {
    whereClause += ' AND (title LIKE ? OR subtitle LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (hasPuzzle !== undefined) {
    if (hasPuzzle === '1') {
      whereClause += ' AND puzzle_question IS NOT NULL';
    } else if (hasPuzzle === '0') {
      whereClause += ' AND puzzle_question IS NULL';
    }
  }

  let orderBy = 'created_at DESC';
  if (sort === 'views') {
    orderBy = 'views DESC';
  } else if (sort === 'likes') {
    orderBy = 'likes DESC';
  } else if (sort === 'random') {
    orderBy = 'RANDOM()';
  }

  const countParams = [...params];
  params.push(limit, offset);

  const monuments = db.prepare(`
    SELECT id, title, subtitle, 
           CASE WHEN puzzle_question IS NOT NULL THEN 1 ELSE 0 END as has_puzzle,
           views, likes, shares, is_featured, created_at
    FROM monuments
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params);

  const total = db.prepare(`SELECT COUNT(*) as count FROM monuments ${whereClause}`).get(...countParams).count;

  res.json({
    monuments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

/**
 * GET /api/monuments/stats
 * 获取统计数据
 */
router.get('/stats/summary', (req, res) => {
  const totalMonuments = db.prepare('SELECT COUNT(*) as count FROM monuments WHERE is_public = 1').get().count;
  const totalViews = db.prepare('SELECT COALESCE(SUM(views), 0) as total FROM monuments WHERE is_public = 1').get().total;
  const totalLikes = db.prepare('SELECT COALESCE(SUM(likes), 0) as total FROM monuments WHERE is_public = 1').get().total;
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  res.json({
    totalMonuments,
    totalViews,
    totalLikes,
    totalUsers
  });
});

/**
 * GET /api/monuments/featured
 * 获取精选纪念碑
 */
router.get('/featured/list', (req, res) => {
  const limit = parseInt(req.query.limit) || 6;

  let featured = db.prepare(`
    SELECT id, title, subtitle,
           CASE WHEN puzzle_question IS NOT NULL THEN 1 ELSE 0 END as has_puzzle,
           views, likes, created_at
    FROM monuments
    WHERE is_public = 1 AND is_featured = 1
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);

  if (featured.length === 0) {
    featured = db.prepare(`
      SELECT id, title, subtitle,
             CASE WHEN puzzle_question IS NOT NULL THEN 1 ELSE 0 END as has_puzzle,
             views, likes, created_at
      FROM monuments
      WHERE is_public = 1
      ORDER BY (views + likes * 3) DESC
      LIMIT ?
    `).all(limit);
  }

  res.json(featured);
});

/**
 * GET /api/monuments/my/list
 * 获取我的纪念碑列表（必须在 /:id 之前定义，否则会被 :id 拦截）
 */
router.get('/my/list', auth, (req, res) => {
  const monuments = db.prepare(`
    SELECT id, title, subtitle, views, likes, shares, created_at, updated_at,
           CASE WHEN puzzle_question IS NOT NULL THEN 1 ELSE 0 END as has_puzzle
    FROM monuments WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.userId);

  res.json(monuments);
});

/**
 * GET /api/monuments/:id
 * 获取纪念碑详情
 * - 如果有谜题，需要先答题解锁（?answer=xxx）
 */
router.get('/:id', optionalAuth, (req, res) => {
  const { id } = req.params;
  const { answer } = req.query;

  const monument = db.prepare(`
    SELECT id, user_id, title, subtitle, content, html_content,
           puzzle_question, puzzle_answer, views, created_at, updated_at
    FROM monuments WHERE id = ? AND is_public = 1
  `).get(id);

  if (!monument) {
    return res.status(404).json({ error: '纪念碑不存在' });
  }

  // 增加浏览量
  db.prepare('UPDATE monuments SET views = views + 1 WHERE id = ?').run(id);

  // 检查是否是作者本人
  const isOwner = req.userId === monument.user_id;

  // 如果有谜题且不是作者
  if (monument.puzzle_question && !isOwner) {
    // 验证答案
    if (!answer) {
      // 返回谜题但不返回内容
      return res.json({
        id: monument.id,
        title: monument.title,
        subtitle: monument.subtitle,
        hasPuzzle: true,
        puzzleQuestion: monument.puzzle_question,
        locked: true,
        views: monument.views,
        createdAt: monument.created_at
      });
    }

    // 验证答案
    if (!bcrypt.compareSync(answer, monument.puzzle_answer)) {
      return res.status(403).json({ error: '答案错误', locked: true });
    }
  }

  // 返回完整内容
  let parsedContent;
  try {
    parsedContent = JSON.parse(monument.content);
  } catch {
    return res.status(500).json({ error: '纪念碑数据损坏' });
  }

  res.json({
    id: monument.id,
    title: monument.title,
    subtitle: monument.subtitle,
    content: parsedContent,
    htmlContent: monument.html_content,
    hasPuzzle: !!monument.puzzle_question,
    puzzleQuestion: isOwner ? monument.puzzle_question : undefined,
    isOwner,
    views: monument.views,
    likes: monument.likes || 0,
    shares: monument.shares || 0,
    createdAt: monument.created_at,
    updatedAt: monument.updated_at
  });
});

/**
 * POST /api/monuments/:id/share
 * 分享计数
 */
router.post('/:id/share', (req, res) => {
  const { id } = req.params;

  const monument = db.prepare('SELECT id FROM monuments WHERE id = ? AND is_public = 1').get(id);
  if (!monument) {
    return res.status(404).json({ error: '纪念碑不存在' });
  }

  db.prepare('UPDATE monuments SET shares = shares + 1 WHERE id = ?').run(id);

  res.json({ message: '分享成功' });
});

/**
 * POST /api/monuments
 * 上传纪念碑（需要登录）
 */
router.post('/', auth, upload.single('file'), (req, res) => {
  const { title, subtitle, puzzleQuestion, puzzleAnswer } = req.body;

  // 从上传的文件或 body 获取 monument.json 内容
  let content;
  try {
    if (req.file) {
      content = JSON.parse(req.file.buffer.toString('utf-8'));
    } else if (req.body.content) {
      content = typeof req.body.content === 'string' ? JSON.parse(req.body.content) : req.body.content;
    } else {
      return res.status(400).json({ error: '请上传 monument.json 文件或提供 content' });
    }
  } catch {
    return res.status(400).json({ error: 'JSON 格式错误，请检查文件内容' });
  }

  const contentStr = JSON.stringify(content);
  const htmlContent = content.epitaph || ''; // 简化：纪念碑正文作为 HTML

  // 处理谜题
  let puzzleQ = null;
  let puzzleA = null;
  if (puzzleQuestion && puzzleAnswer) {
    puzzleQ = puzzleQuestion;
    puzzleA = bcrypt.hashSync(puzzleAnswer, 10);
  }

  const result = db.prepare(`
    INSERT INTO monuments (user_id, title, subtitle, content, html_content, puzzle_question, puzzle_answer)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.userId,
    title || content.title || '一个人的纪念碑',
    subtitle || '',
    contentStr,
    htmlContent,
    puzzleQ,
    puzzleA
  );

  res.json({
    id: result.lastInsertRowid,
    message: '纪念碑上传成功'
  });
});

/**
 * PUT /api/monuments/:id
 * 修改纪念碑（仅作者）
 */
router.put('/:id', auth, (req, res) => {
  const { id } = req.params;
  const { title, subtitle, puzzleQuestion, puzzleAnswer } = req.body;

  const monument = db.prepare('SELECT * FROM monuments WHERE id = ?').get(id);
  if (!monument) return res.status(404).json({ error: '纪念碑不存在' });
  if (monument.user_id !== req.userId) return res.status(403).json({ error: '无权修改' });

  const updates = [];
  const values = [];

  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (subtitle !== undefined) { updates.push('subtitle = ?'); values.push(subtitle); }
  if (puzzleQuestion !== undefined) {
    updates.push('puzzle_question = ?');
    values.push(puzzleQuestion);
    if (puzzleAnswer) {
      updates.push('puzzle_answer = ?');
      values.push(bcrypt.hashSync(puzzleAnswer, 10));
    }
  }
  updates.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE monuments SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  res.json({ message: '修改成功' });
});

/**
 * DELETE /api/monuments/:id
 * 删除纪念碑（仅作者）
 */
router.delete('/:id', auth, (req, res) => {
  const { id } = req.params;

  const monument = db.prepare('SELECT * FROM monuments WHERE id = ?').get(id);
  if (!monument) return res.status(404).json({ error: '纪念碑不存在' });
  if (monument.user_id !== req.userId) return res.status(403).json({ error: '无权删除' });

  // 事务删除关联数据和纪念碑
  const deleteTransaction = db.transaction(() => {
    db.prepare('DELETE FROM comments WHERE monument_id = ?').run(id);
    db.prepare('DELETE FROM drift_bottles WHERE monument_id = ?').run(id);
    db.prepare('DELETE FROM monuments WHERE id = ?').run(id);
  });
  deleteTransaction();

  res.json({ message: '纪念碑已删除' });
});

export default router;
