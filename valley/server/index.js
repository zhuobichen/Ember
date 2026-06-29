/**
 * 纪念碑谷平台 - 后端主入口
 *
 * 启动: node index.js
 * 默认端口: 3001
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import usersRouter from './routes/users.js';
import monumentsRouter from './routes/monuments.js';
import interactionsRouter from './routes/interactions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件（前端构建产物）- 挂载在根路径，让 HTML 中的 /assets/ 引用能正确加载
app.use(express.static(path.join(__dirname, '../client/dist')));

// API 路由
app.use('/api/users', usersRouter);
app.use('/api/monuments', monumentsRouter);
app.use('/api', interactionsRouter); // 评论和漂流瓶挂在 /api 下

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 所有其他路由返回前端页面（SPA）
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../client/dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).json({
        name: '纪念碑谷 Monument Valley',
        message: '前端尚未构建，API 已就绪',
        api: {
          register: 'POST /api/users/register',
          login: 'POST /api/users/login',
          monuments: 'GET /api/monuments',
          upload: 'POST /api/monuments'
        }
      });
    }
  });
});

// 全局错误处理中间件（必须放在所有路由之后）
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  // multer 文件大小超限
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: '文件大小超过限制 (10MB)' });
  }
  // JSON 解析错误
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '请求体 JSON 格式错误' });
  }
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════╗`);
  console.log(`║    纪念碑谷平台已启动                ║`);
  console.log(`║    http://localhost:${PORT}              ║`);
  console.log(`╚══════════════════════════════════════╝`);
});
