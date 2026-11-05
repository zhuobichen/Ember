# 纪念碑谷 API

后端在 `valley/server/`，Express + SQLite，默认 `http://127.0.0.1:3001`。
认证用 **JWT Bearer**（`expiresIn: 30d`），注册时自动分配匿名代号（`旅人#XXXX`）。

启动见 [README「纪念碑谷」](../README.md#纪念碑谷)；环境变量模板在 [`valley/server/.env.example`](../valley/server/.env.example)。

## 约定

- 请求/响应都是 JSON，**上传纪念碑除外**（`multipart/form-data`）
- 需要登录的接口带 `Authorization: Bearer <token>`
- 错误统一 `{ "error": "……" }`，HTTP 4xx/5xx
- `optionalAuth`：有 token 就解析作者身份，没有也放行（用于“是不是我发的”判断）

## 用户

### `POST /api/users/register`

| 字段 | 必填 | 说明 |
|---|---|---|
| `password` | 是 | 至少 6 位 |

**响应**：

```json
{ "alias": "旅人#4821", "token": "eyJ...", "message": "注册成功。你在纪念碑谷的代号是：旅人#4821" }
```

> ⚠️ 注册**不接受**自定义代号，`alias` 由服务端生成。登录必须用返回的这个代号。

### `POST /api/users/login`

| 字段 | 必填 |
|---|---|
| `alias` | 是 |
| `password` | 是 |

**响应**：`{ "alias": "旅人#4821", "token": "eyJ..." }`

### `GET /api/users/me` 🔒

返回当前用户信息（不含密码哈希）：`alias`、`created_at`。

## 纪念碑

### `GET /api/monuments`

分页列出公开纪念碑。

| 参数 | 默认 | 说明 |
|---|---|---|
| `page` | 1 | 页码 |
| `limit` | 20 | 每页条数 |

**响应**（实测）：

```json
{
  "monuments": [
    { "id": 7, "title": "…", "subtitle": "…", "has_puzzle": 0, "views": 0, "created_at": "…" }
  ],
  "pagination": { "page": 1, "limit": 12, "total": 5, "pages": 1 }
}
```

> `limit` 默认是 **12**（不是 20）。列表用下划线命名（`has_puzzle` / `created_at`），
> 详情接口用驼峰（`hasPuzzle` / `createdAt`）——这是现有实现的命名不一致，写客户端时注意。

### `GET /api/monuments/:id` （可选登录）

返回单座纪念碑的完整内容。字段（实测）：

```
id, title, subtitle, content, htmlContent, hasPuzzle, isOwner, views, createdAt, updatedAt
```

- `content` 是解析后的对象（不是字符串），可直接用
- `htmlContent` 是自包含的 HTML，可直接塞进 iframe 或下载
- `isOwner` 需要带 token 才有意义

| 参数 | 说明 |
|---|---|
| `answer` | 谜题答案。只有设置过 `puzzleQuestion` 的碑才需要 |

**谜题锁的行为**（这是本接口唯一有分支的地方）：

- 没设谜题，或请求者是作者 → 直接返回完整内容
- 设了谜题但不是作者，且没给 `answer` → 返回 `{ id, title, subtitle, hasPuzzle: true, puzzleQuestion, locked: true, views, createdAt }`，**不含 `content` / `htmlContent`**
- `answer` 答错 → `403 { "error": "答案错误", "locked": true }`

谜题答案在库里是 bcrypt 哈希，不能反查。

### `GET /api/monuments/my/list` 🔒

当前用户创建的纪念碑列表。

### `POST /api/monuments` 🔒

上传一座纪念碑。**两种提交方式二选一**：

| 方式 | Content-Type | 字段 |
|---|---|---|
| 文件上传 | `multipart/form-data` | `file`（`monument.json`，≤ 10MB）+ `title` / `subtitle` / `puzzleQuestion` / `puzzleAnswer` |
| 表单直传 | `application/json` 或表单 | `content`（JSON 字符串或对象）+ 同上 |

**响应**：`{ "id": 7, "message": "纪念碑上传成功" }`

既没有 `file` 也没有 `content` 时返回 `400`（实测）。

> `monument.json` 就是 `scripts/render.mjs` 或 `generator.js` 的产物，直接传即可。
> `puzzleQuestion` / `puzzleAnswer` 是可选的“谜题锁”：填了之后访客要先答对才能看到全文。

### `PUT /api/monuments/:id` 🔒

修改标题/副标题/谜题等元信息（仅创建者）。

### `DELETE /api/monuments/:id` 🔒

删除（仅创建者）。**响应**：`{ "message": "纪念碑已删除" }`

## 互动

### `GET /api/monuments/:id/comments`

评论列表。

### `POST /api/monuments/:id/comments` 🔒

发表评论。

### `GET /api/monuments/:id/bottles`

漂流瓶列表（匿名留言，与评论分开）。

### `POST /api/monuments/:id/bottles` 🔒

投一个漂流瓶。

### `PUT /api/bottles/:id/read` 🔒

标记漂流瓶已读。

## 一个完整例子

```bash
# 1) 注册，拿到代号和 token
curl -s -X POST http://127.0.0.1:3001/api/users/register \
  -H 'Content-Type: application/json' \
  -d '{"password":"123456"}'

# 2) 上传纪念碑（multipart，注意 -F file=@）
curl -s -X POST http://127.0.0.1:3001/api/monuments \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@data/output/monument.json" \
  -F "title=一个人的纪念碑" \
  -F "subtitle=2012-2026"

# 3) 看列表
curl -s 'http://127.0.0.1:3001/api/monuments?page=1&limit=10'
```

## 已知限制

- 没有刷新令牌机制：token 30 天过期后要重新登录
- 上传体积上限 10MB（`multer` 限制），超了会返回明确错误
- 数据库默认在 `valley/server/db/valley.db`，删掉它等于清空全站
