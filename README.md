<p align="center">
  <img src="assets/logo.png" width="120" height="120" alt="Ember Logo" />
</p>

<h1 align="center">余烬 Ember</h1>

<p align="center">
  从一个人的聊天记录中，AI 生成一座属于他的人生纪念碑<br>
  然后把原始数据用火烧掉
</p>

<p align="center">
  <a href="#安装">安装</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#消息提取">消息提取</a> ·
  <a href="#纪念碑谷">纪念碑谷</a> ·
  <a href="#名人数据集">名人数据集</a>
</p>

---

## 这是什么

**余烬** 是一个数字时代的悼亡工具。

它读取一个人的聊天记录（微信、QQ、飞书、QQ空间），用 AI 从中提炼出人生的轨迹、性格、关系网络，生成一篇叙事体的**人生纪念碑**，然后将原始数据彻底焚毁（DoD 5220.22-M 多遍擦除），只留下纪念碑本身。

聊天记录是骨灰，AI 是雕塑师，纪念碑是最终留存物。

### 核心特性

- **多平台消息提取** — 微信（数据库直读解密）、QQ（OneBot API）、飞书（开放平台 API）、QQ空间（HTTP API），全部内置实现，不依赖外部 CLI 工具
- **AI 纪念碑生成** — 基于 DeepSeek / Claude，四层分析架构：统计概览 → 年度抽样 → 人物画像 → 叙事体纪念碑文
- **数据焚毁** — DoD 5220.22-M 标准多遍擦除，生成可验证的焚毁报告
- **名人数据集** — 内置李白、苏轼、张雪峰等多维度数据集，无需个人数据即可体验
- **纪念碑谷平台** — Express + React + SQLite 全栈应用，可在线展示和分享纪念碑

## 安装

### 环境要求

- **Node.js >= 22.0.0**（使用内置 `node:sqlite` 模块）
- Windows / macOS / Linux

### 从源码安装

```bash
git clone https://github.com/zhuobichen/Ember.git
cd Ember
npm install
```

### 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

```env
# DeepSeek API（必需，用于 AI 分析）
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com

# 飞书 API（可选）
FEISHU_APP_ID=cli_xxxx
FEISHU_APP_SECRET=xxxx
```

> DeepSeek API Key 申请：https://platform.deepseek.com/

## 快速开始

### 1. 检查环境状态

```bash
node src/index.js status
```

### 2. 用名人数据集体验（无需个人数据）

```bash
# 苏轼
node src/index.js generate --celebrity su-shi --no-burn

# 李白
node src/index.js generate --celebrity libai --no-burn

# 张雪峰
node src/index.js generate --celebrity zhangxuefeng --no-burn

# 查看所有可用数据集
node src/index.js generate --list-celebrities
```

### 3. 从微信聊天记录生成

```bash
# 从已导出的 JSON 文件
node src/index.js generate --wechat export.json --no-burn

# 直接读取微信数据库（3.x / 4.x 加密库）
node src/index.js generate --auto-wechat \
  --wx-db "C:/Users/.../Msg/Multi/MSG0.db" \
  --wx-key abc123... \
  --wx-id wxid_xxx \
  --no-burn

# 直接读取已解密数据库
node src/index.js generate --auto-wechat \
  --wx-db "C:/.../MSG0_decrypted.db" \
  --wx-id wxid_xxx \
  --no-burn
```

### 4. 一键提取所有平台并生成

```bash
node src/index.js generate --auto \
  --wx-db "C:/.../MSG0.db" \
  --wx-key abc123... \
  --wx-id wxid_xxx \
  --qzone-uin 123456 \
  --qzone-cookie "your_cookie" \
  --no-burn
```

> 加 `--no-burn` 跳过数据焚毁（调试用）。不加则生成后自动焚毁原始数据。

## 消息提取

### 微信

完全内置实现，不依赖 weflow-cli 或任何外部工具。

| 功能 | 支持情况 |
|------|---------|
| 3.x 加密数据库 | PBKDF2-HMAC-SHA1, 64000 次迭代 |
| 4.x 加密数据库 | PBKDF2-HMAC-SHA512, 256000 次迭代 |
| 已解密数据库 | 直接打开 |
| 联系人昵称/备注 | 自动解密 MicroMsg.db 读取 |
| 消息类型 | 文本、图片、语音、视频、表情、链接、公众号推送 |
| LZ4 解压 | 自动解压 CompressContent（AppMsg XML） |

```bash
# 获取微信数据库密钥
# 方式1: 使用 weflow-cli 提取（需要微信登录时运行）
weflow-cli dbkey --timeout 120000

# 方式2: 从 weflow-cli 配置文件读取
# 配置文件路径: ~/.weflow-cli/config.json
```

### QQ

通过 OneBot 11 HTTP API 提取，需 OneBot 客户端运行中（如 NapCat、Lagrange）。

```bash
# 提取群消息
node src/index.js export --qq --qq-url http://localhost:5700 --qq-group 123456

# 提取好友消息
node src/index.js export --qq --qq-url http://localhost:5700 --qq-user 123456
```

### QQ空间

通过 HTTP API 提取说说和日志，需浏览器 Cookie。

```bash
node src/index.js export --qqzone \
  --qzone-uin 123456 \
  --qzone-cookie "your_cookie_string"
```

> Cookie 获取方式：浏览器登录 QQ空间 → F12 → Network → 复制 Cookie

### 飞书

通过飞书开放平台 API 提取，需创建应用获取 app_id + app_secret。

```bash
node src/index.js export --feishu
```

## 纪念碑谷

在线展示平台，基于 Express + React + SQLite。

### 启动

```bash
# 启动后端服务器
npm run valley:server

# 开发模式启动前端
npm run valley:client

# 构建前端静态文件
npm run valley:build
```

### 功能

- 浏览所有纪念碑列表
- 查看纪念碑详情（人生轨迹、关系网络、年度关键词）
- 访客留言（漂流瓶）
- 别名系统（每人可设置个性化 URL 别名）

### Docker 部署

#### 环境变量配置

```bash
cp .env.example .env
```

编辑 `.env` 文件，至少配置以下变量：

| 变量 | 说明 | 必填 |
|------|------|------|
| `JWT_SECRET` | JWT 签名密钥，生产环境必须修改 | 是 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | 否 |
| `DEEPSEEK_BASE_URL` | DeepSeek API 地址 | 否 |

生成随机 JWT 密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Docker Compose 部署（推荐）

```bash
# 一键启动
docker compose up -d --build

# 查看日志
docker compose logs -f valley-server

# 停止服务
docker compose down

# 重启服务
docker compose restart
```

服务启动后访问：http://localhost:3001

#### Docker 单独部署

```bash
# 构建镜像
docker build -t ember-valley .

# 运行容器
docker run -d \
  --name ember-valley \
  -p 3001:3001 \
  -v ember-valley-data:/app/data \
  -e JWT_SECRET=your_secret_here \
  -e DEEPSEEK_API_KEY=sk-your-key \
  --restart unless-stopped \
  ember-valley
```

#### Docker Compose 开发模式

```bash
# 启动开发环境（后端热重载 + 前端 Vite）
docker compose -f docker-compose.dev.yml up

# 只启动后端开发服务
docker compose -f docker-compose.dev.yml up valley-server
```

前端开发服务器地址：http://localhost:5174
后端 API 地址：http://localhost:3001

### 部署脚本

#### 启动服务脚本

```bash
chmod +x scripts/start-valley.sh
./scripts/start-valley.sh
```

#### 数据库备份脚本

```bash
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```

备份文件保存在 `backups/` 目录，自动保留最近 10 个备份。

数据存储在 Docker 卷 `ember-valley-data` 中，对应容器内路径 `/app/data/valley.db`。

## 名人数据集

内置多维度数据集，无需个人聊天数据即可体验完整流程：

| 数据集 | 代号 | 消息数 | 时间跨度 | 维度 |
|--------|------|--------|----------|------|
| 苏轼 | `su-shi` | 60 | 1037-2001 | 诗词、交友、书信、史料、评价、轶事 |
| 李白 | `libai` | 86 | 700-1979 | 诗词、交友、书信、史料、评价、轶事 |
| 张雪峰 | `zhangxuefeng` | 69 | 1984-2026 | 演讲、互动、著作、事件、评价 |

每个数据集涵盖 6 个维度：诗词/演讲创作（web）、人际互动（social）、书信著作（book）、史料记载（media）、后人评价（media）、生活轶事（social）。

## CLI 命令一览

```bash
# 检查环境状态
ember status

# 生成纪念碑
ember generate [options]

# 单独提取消息（不生成纪念碑）
ember export [options]

# 焚毁指定文件
ember burn --dir ./output/temp

# 使用名人数据集
ember generate --celebrity su-shi
```

### generate 常用参数

| 参数 | 说明 |
|------|------|
| `--celebrity <name>` | 使用内置名人数据集 |
| `--auto` | 自动提取所有已配置平台 |
| `--auto-wechat` | 提取微信 |
| `--auto-qq` | 提取 QQ |
| `--auto-qqzone` | 提取 QQ空间 |
| `--auto-feishu` | 提取飞书 |
| `--wx-db <path>` | 微信数据库路径 |
| `--wx-key <hex>` | 微信数据库密钥（64位 hex） |
| `--wx-4x` | 微信 4.x 格式数据库 |
| `--qzone-uin <qq>` | QQ空间 QQ 号 |
| `--qzone-cookie <cookie>` | QQ空间 Cookie |
| `--no-burn` | 不焚毁原始数据（调试用） |
| `--provider <name>` | AI 提供商: deepseek \| claude |
| `--output <dir>` | 输出目录，默认 ./output |

## 项目结构

```
Ember/
├── src/
│   ├── index.js              # CLI 主入口
│   ├── adapters/             # 平台适配器（加载已导出 JSON）
│   ├── core/
│   │   ├── extractor.js      # 统一消息提取器（微信/QQ/飞书/QQ空间）
│   │   ├── wechat-db.js      # 微信数据库解密读取（自包含）
│   │   ├── parsers.js        # 共享消息解析器（类型映射/内容提取）
│   │   ├── analyzer.js       # AI 分析器（DeepSeek/Claude）
│   │   ├── generator.js      # 纪念碑生成器
│   │   ├── burner.js         # 数据焚毁器（DoD 5220.22-M）
│   │   ├── merge.js          # 多平台数据合并
│   │   └── schema.js        # 数据结构定义
│   └── datasets/             # 内置名人数据集
│       ├── su-shi.js         # 苏轼
│       ├── libai.js          # 李白
│       └── zhangxuefeng.js   # 张雪峰
├── valley/                   # 纪念碑谷平台
│   ├── server/               # Express + SQLite 后端
│   └── client/               # React 前端
├── scripts/
│   ├── start-valley.sh       # 一键启动服务脚本
│   └── backup-db.sh          # 数据库备份脚本
├── proposal/                 # 参赛提案展示页
├── assets/
│   └── logo.png              # 项目图标
├── Dockerfile                # 多阶段构建 Docker 镜像
├── docker-compose.yml        # 生产环境编排
├── docker-compose.dev.yml    # 开发环境编排
├── .dockerignore             # Docker 构建忽略文件
├── .env.example              # 环境变量模板
└── package.json
```

## 数据隐私

- 所有消息提取在**本地完成**，不上传到任何服务器
- AI 分析仅将匿名化后的文本发送给 DeepSeek/Claude API
- 生成纪念碑后，原始数据可通过 DoD 5220.22-M 标准多遍擦除彻底焚毁
- 焚毁后生成不可逆的验证报告

## 技术栈

| 层 | 技术 |
|----|------|
| 运行时 | Node.js 22+（`node:sqlite`） |
| 消息提取 | SQLCipher 解密、OneBot HTTP API、飞书开放平台 API |
| AI 分析 | DeepSeek API / Claude API |
| 纪念碑谷 | Express + React + SQLite |
| 数据焚毁 | DoD 5220.22-M |

## License

[MIT](LICENSE)

## 致谢

- [weflow-cli](https://github.com/nicepkg/weflow-cli) — 微信数据库解密参考
- [DeepSeek](https://deepseek.com/) — AI 分析引擎
- [Node.js](https://nodejs.org/) — 内置 `node:sqlite` 模块
