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

它读取一个人的聊天记录（微信、QQ、飞书、QQ空间），用 AI 从中提炼出人生的轨迹、性格、关系网络，生成一篇叙事体的**人生纪念碑**，然后将原始数据多遍覆写并删除（best-effort，见下文「擦除能力的边界」），只留下纪念碑本身。

聊天记录是骨灰，AI 是雕塑师，纪念碑是最终留存物。

### 核心特性

- **多平台消息提取** — 微信（数据库直读解密 / weflow-cli）、QQ（OneBot API / qce 导出）、飞书（lark-cli 用户身份）、QQ空间（qce qzone，回落内置 HTTP）、贴吧/知乎（浏览器抓页面）、B站（MCP 采集器）
- **AI 纪念碑生成** — 基于 DeepSeek / Claude，四层分析架构：统计概览 → 年度抽样 → 人物画像 → 叙事体纪念碑文
- **离线流程** — 没有 API Key 也能出真东西：导出 → 汇总 → 筛选 → 渲染，每步都有中间产物
- **数据焚毁** — 分块多遍覆写 + 删除，生成可审计的操作报告（best-effort，非物理级不可恢复）
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

> 纪念碑谷（`valley/`）是前后端两个独立 package，根目录的 `npm install` 不会安装它们。如需运行纪念碑谷，请再分别安装依赖：

```bash
cd valley/server && npm install
cd ../client && npm install
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

**方式 A：内置直读数据库**（默认，不依赖任何外部工具）

| 功能 | 支持情况 |
|------|---------|
| 3.x 加密数据库 | PBKDF2-HMAC-SHA1, 64000 次迭代 |
| 4.x 加密数据库 | PBKDF2-HMAC-SHA512, 256000 次迭代 |
| 已解密数据库 | 直接打开 |
| 联系人昵称/备注 | 自动解密 MicroMsg.db 读取 |
| 消息类型 | 文本、图片、语音、视频、表情、链接、公众号推送 |
| LZ4 解压 | 自动解压 CompressContent（AppMsg XML），未安装 lz4 时只跳过压缩内容 |

```bash
# 获取微信数据库密钥
# 方式1: 使用 weflow-cli 提取（需要微信登录时运行）
weflow-cli dbkey --timeout 120000

# 方式2: 从 weflow-cli 配置文件读取
# 配置文件路径: ~/.weflow-cli/config.json
```

**方式 B：交给 weflow-cli 导出**（需要本机装了 `weflow-cli`）

```bash
node src/index.js generate --wechat-export --wx-talker 联系人A --no-burn
```

Ember 会调用 `weflow-cli export <talker> json --json --output <目录>` 并把产物读回来。
`raw` 契约（纯消息数组）和 `weflow-v1` 信封（`{ schema: 'weflow-message/v1', messages }`）都能读；
信封里没有会话名，所以会话名取文件名或 `--wx-talker`。

### QQ

**方式 A：交给 qce（qchat-cli）导出**（推荐，多账号时尤其方便）

```bash
# 群聊
node src/index.js generate --qq-export --qq-target 1109256353 --no-burn

# 多账号：指定账号 + 自己的 QQ 号（用于识别哪些消息是自己发的）
node src/index.js generate --qq-export --qq-account acc2 \
  --qq-target 1109256353 --qq-self 1245581875 --no-burn

# 或者先导出成文件，再喂给 Ember
qce --account acc2 export 1109256353 --format json -o ./out
node src/index.js generate --qq ./out/group_1109256353_xxx.json --qq-self 1245581875 --no-burn
```

`--qq-account` 对应 `qce account list` 里的账号名；`--qq-self` 不给时会自动跑
`qce login --test` 反查，反查失败则只能对私聊做安全退化（群聊里不猜自己发的消息）。
需要别的可执行名/路径时用 `--qq-cli`。

**方式 B：直连 OneBot 11 HTTP API**，需 OneBot 客户端运行中（如 NapCat、Lagrange）。

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

另有 `--feishu-export` 走 **lark-cli**（`@larksuite/cli`，需 `npm i -g @larksuite/cli`）。
这个包不是默认依赖，没装时 `node src/index.js status` 会明确标出来 —— 此时只能用开放平台
凭证（`.env` 里的 `FEISHU_APP_ID`/`FEISHU_APP_SECRET`）或已导出的文件（`--feishu <path>`）。

**注意身份区别**：应用凭证只能看到「机器人被拉进的群」；要读你自己的私聊/群聊，需要
**用户身份**（OAuth 授权）。在 Windows 上 `lark-cli` 自身保存用户令牌会失败，绕法（外部注入
令牌 + 自动续期转发层）以及踩过的坑，见 [docs/feishu-cli-用户身份接入.md](docs/feishu-cli-用户身份接入.md)，
转发层模板见 [scripts/lark-cli-user-token.js](scripts/lark-cli-user-token.js)。

### 贴吧 / 知乎

这两个站没有可用 CLI：贴吧 PC 接口每个请求都要 `sign`，知乎要 `x-zse-96` 签名。
所以走「**已登录浏览器取 HTML → 本地离线解析**」，实现放在 [`zhaowen-skill`](../zhaowen-skill) 仓库
（`tieba/scripts/`、`zhihu/scripts/`），Ember 这边只做调用和映射，**cookie 全程不经过本进程**。

```bash
# 贴吧帖子的楼层（一层楼一条消息）
node src/index.js generate --tieba-tid 11137538751

# 贴吧某吧的帖子列表（可翻页，一页 30 条）
node src/index.js generate --tieba-kw 显卡 --tieba-pages 2

# 知乎问题的首屏回答（5 条）+ 问题详情
node src/index.js generate --zhihu-qid 2098047112466227298

# 手头已有 HTML 时离线解析，不联网
node src/index.js generate --tieba-file x.html
node src/index.js generate --zhihu-file q.html
```

前置：`bsk`（browser-skill）在 PATH 或设 `BSK_EXE`，且浏览器里已登录对应站点。
找不到 `zhaowen-skill` 仓库时用 `ZHAOWEN_SKILLS` 指定路径。

### 数据源自检

```powershell
pwsh -File scripts/health-check.ps1        # 只读检查
pwsh -File scripts/health-check.ps1 -Deep  # 额外真抓一次贴吧/知乎
```

一次列出 QQ、QQ空间、微信、飞书、浏览器通道、贴吧/知乎工具的状态；有异常时退出码为 1。

## 纪念碑谷

在线展示平台，基于 Express + React + SQLite。你在本地生成 `monument.json`，上传后别人能浏览、
看详情、解谜题、留漂流瓶。

### 首次安装

```bash
cd valley/server && npm install --ignore-scripts   # 依赖装好即可
cd ../client && npm install && npm run build       # 构建前端静态文件到 client/dist
```

**关于 SQLite 驱动**：`db/init.js` 默认用 `better-sqlite3`，它是原生模块，Node 24 且没有
MSVC 构建工具时 `npm install` 会在 node-gyp 阶段失败（实测过）。所以加了回落：装不上就自动
用 Node 内置的 `node:sqlite`（Node 22+ 自带），并补齐了 `pragma` / `transaction` /
`lastInsertRowid` 这几个差异点。启动日志里会提示用了哪个。

### 配置

后端需要 `JWT_SECRET`，放在 `valley/server/.env`：

```bash
# 生成一个
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```
PORT=3001
JWT_SECRET=<上面生成的值>
```

（`.env` 已在 `.gitignore` 里，不会入库。）

### 启动

```bash
# 后端（会读 .env；不读的话 JWT_SECRET 需要在环境变量里）
cd valley/server && node --env-file=.env index.js

# 或者用启动器：后台运行、日志到 logs/valley.*.log，关掉终端也不停
scripts\start-valley.cmd

# 前端开发模式
npm run valley:client

# 只构建前端
npm run valley:build
```

打开 <http://127.0.0.1:3001> 即可。注册是**匿名**的：服务端自动生成代号（如「行者#D80C」），
**注册时传的 alias 会被忽略**，要用响应里返回的那个代号登录。

### 功能

- 浏览所有纪念碑列表
- 查看纪念碑详情（人生轨迹、关系网络、年度关键词）
- 访客留言（漂流瓶）
- 别名系统（每人可设置个性化 URL 别名）

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
| `--wechat-export` | 交给 weflow-cli 导出（需 `--wx-talker`） |
| `--qq-export` | 交给 qce 导出（需 `--qq-target`） |
| `--qq-target <id>` | QQ 群号或好友 QQ 号 |
| `--qq-account <name>` | qce 账号名（多账号时用） |
| `--qq-self <uin>` | 自己的 QQ 号（判定 isSelf；不给则自动反查） |
| `--qq-cli <cmd>` | qce 可执行名/路径，默认 `qce` |
| `--weflow-cli <cmd>` | weflow-cli 可执行名/路径，默认 `weflow-cli` |
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
│   │   ├── extractor.js      # 统一消息提取器（微信/QQ/飞书/QQ空间/贴吧/知乎/B站）
│   │   ├── wechat-db.js      # 微信数据库解密读取（自包含）
│   │   ├── parsers.js        # 共享消息解析器（类型映射/内容提取）
│   │   ├── cli-bridge.js     # 调用 weflow-cli / qce 的桥接层（参数校验/产物定位）
│   │   ├── analyzer.js       # AI 分析器（DeepSeek/Claude）
│   │   ├── generator.js      # 纪念碑生成器
│   │   ├── burner.js         # 数据焚毁器（DoD 5220.22-M）
│   │   ├── merge.js          # 多平台数据合并
│   │   └── schema.js        # 数据结构定义
│   └── datasets/             # 内置名人数据集
│       ├── su-shi.js         # 苏轼
│       ├── libai.js          # 李白
│       └── zhangxuefeng.js   # 张雪峰
├── scripts/                  # 不依赖 AI Key 的离线工具
│   ├── build-from-data.mjs   # 扫 data/raw/ 汇总成 unified-data.json
│   ├── select-personal.mjs   # 从全量语料里筛出「与本人相关」的部分
│   ├── render.mjs            # analysis.json → monument.json / .html
│   ├── dump-unified.mjs      # 按 config 在线提取一次（不走 data/ 目录）
│   ├── health-check.ps1      # 数据源自检（OK/FAIL/SKIP 三态，-Fix 拉起服务）
│   ├── run-health-check.cmd  # 自检入口（日志写 logs/）
│   ├── start-valley.cmd      # 后台启动纪念碑谷
│   └── lark-cli-user-token.js # 飞书令牌注入 wrapper
├── data/                     # 个人数据目录（整个目录不入库）
│   ├── raw/<source>/         # 原始导出：wechat / qq / qzone / feishu / tieba / zhihu / bilibili
│   ├── unified/              # 汇总与筛选结果
│   ├── analysis/             # analysis.json（AI 生成或人工撰写）
│   ├── output/               # monument.json / monument.html
│   └── README.md             # 目录约定（唯一入库的文件）
├── docs/                     # 文档
│   ├── 架构与数据流.md        # 分层、两条路径、每层代码在哪
│   ├── schema.md             # 统一字段 + 各平台对照 + 已知的坑
│   ├── 故障排查.md            # 症状 → 原因 → 命令
│   └── feishu-cli-用户身份接入.md
├── valley/                   # 纪念碑谷平台
│   ├── server/               # Express + SQLite 后端
│   └── client/               # React 前端
├── proposal/                 # 参赛提案展示页
├── assets/
│   └── logo.png              # 项目图标
├── .env.example              # 环境变量模板
└── package.json
```

## 离线流程（无需任何 API Key）

`generate` 在缺少 `DEEPSEEK_API_KEY` 时会产出**模拟分析**——能跑通，但不是真实内容。
想在没有 Key 的情况下出真东西，走这条三步离线链：

```bash
# 1) 把 data/raw/ 下的导出汇总成统一语料（加 --live 顺带取飞书/贴吧/知乎）
node scripts/build-from-data.mjs

# 2) 只保留与本人相关的消息（规则见文件头注释；--dry 只打印统计不写文件）
node scripts/select-personal.mjs --context-min 10

# 3) 渲染：analysis.json 可以手写，也可以让 AI 在别处生成后拿回来
node scripts/render.mjs data/analysis/analysis.json data/output
```

`analysis.json` 的字段与 AI 分析结果一致：

```json
{
  "meta":  { "totalMessages": 0, "platforms": [] },
  "epitaph": "碑文正文",
  "trajectory":    [ { "year": 2020, "summary": "……" } ],
  "relationships": [ { "name": "……", "role": "……", "intimacy": 0.9 } ],
  "keywords":      [ { "year": 2020, "words": ["……"] } ],
  "stats":         { "totalMessages": 0, "totalContacts": 0 }
}
```

三步之间每份中间产物都落在 `data/` 下，可复现、可对比、可回滚。
`data/` 整个目录在 `.gitignore` 里，个人数据不会进仓库。

## 文档

| 文档 | 内容 |
|---|---|
| [架构与数据流](docs/架构与数据流.md) | 五层结构、两条完整路径、每层代码在哪 |
| [数据格式](docs/schema.md) | 统一 schema、各平台字段对照、已知的坑 |
| [故障排查](docs/故障排查.md) | 按「症状 → 原因 → 命令」组织 |
| [纪念碑谷 API](docs/valley-api.md) | 全部端点、鉴权方式、上传示例 |
| [飞书 CLI 接入](docs/feishu-cli-用户身份接入.md) | 飞书用户身份与令牌的四个坑 |
| [data/ 目录约定](data/README.md) | 导出数据怎么放、怎么汇总 |

## 数据隐私

- 所有消息提取在**本地完成**，不上传到任何服务器
- AI 分析仅将匿名化后的文本发送给 DeepSeek/Claude API
- 生成纪念碑后，原始数据会被多遍覆写并删除（默认 3 轮，DoD 5220.22-M 风格）
- 焚毁后生成**操作用于审计的报告**（记录了哪些文件、多少轮、是否报错）

### 擦除能力的边界（重要）

覆写 + 删除只能覆盖"当前文件系统上这个文件的现有块"，**不能保证数据在物理介质上不可恢复**。以下情况仍可能留下可恢复的副本：

| 场景 | 为什么擦不掉 |
|---|---|
| SSD / NVMe / 闪存 | 磨损均衡会把写入重定向到新块，旧块不会被覆写，直到被回收 |
| 写时复制文件系统（Btrfs / ZFS / APFS） | 覆写会生成新块，旧块留在原处直到快照/引用释放 |
| 云同步、备份、快照 | 数据在删除前已被复制到别处，本地覆写对副本无效 |
| 日志型文件系统与系统还原点 | 元数据与旧版本可能被保留 |

因此这里的正确承诺是 **best-effort 擦除**，而不是"物理不可恢复"。如果威胁模型要求更强的保证，应改为**先加密落盘、销毁密钥**（crypto-erase）：数据本身可以留在盘上，只要密钥真正消失。

报告里的 `verification` 字段描述的是"我们做了什么"，不是"数据必然不可恢复"。

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
