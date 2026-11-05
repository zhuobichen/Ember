# 数据格式（schema）

所有平台的数据最终都被压成**同一种形状**，这样分析层和渲染层不用关心来源。
定义在 `src/core/schema.js`，这里是完整说明 + 每个平台的字段对照 + 已知的坑。

## 三种结构

### Message（一条消息）

| 字段 | 类型 | 说明 |
|---|---|---|
| `platform` | string | 来源平台，见下表 `PLATFORMS` |
| `messageId` | string | 平台内唯一 ID（用于去重与增量） |
| `chatId` | string | 会话 ID：群号、talker、`group_<id>`、`qzone_shuoshuo`… |
| `chatName` | string | 会话显示名（群名/昵称） |
| `sender` | string | 发送者显示名 |
| `isSelf` | boolean | 是否本人发送 |
| `timestamp` | number | **Unix 秒**（不是毫秒） |
| `type` | string | `text` / `image` / `voice` / `video` / `link` / `system` / `emoji` / `file` / `unknown` |
| `content` | string | 文本内容；非文本类型存描述（如 `[图片 x3]`） |
| `rawContent` | string? | 可选，原始内容 |

### Contact（一个会话）

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 群名/昵称 |
| `platform` | string | 平台 |
| `chatId` | string | 会话 ID |
| `msgCount` | number | 消息数（历史遗留名） |
| `messageCount` | number | 同上，统一名（新适配器应写这个） |
| `selfMsgCount` | number | 本人发送数 |
| `lastActive` | number | 最后活跃时间戳（秒） |
| `isGroup` | boolean | 是否群聊 |

> ⚠️ `msgCount` 和 `messageCount` 并存是历史原因。新写适配器请两个都写，否则下游统计会读到 `undefined`（QQ空间适配器就踩过一次）。

### UnifiedData（一个数据源的整体）

```js
{
  meta: {
    generatedAt: '2026-10-27T04:42:46.460Z',
    platforms: ['qq', 'wechat'],
    totalMessages: 55512,
    timeRange: { start: 1337153460, end: 1793088000 }
  },
  messages: [ /* Message[] */ ],
  contacts: [ /* Contact[] */ ]
}
```

## 枚举值

```js
MESSAGE_TYPES = { TEXT:'text', IMAGE:'image', VOICE:'voice', VIDEO:'video',
                  LINK:'link', SYSTEM:'system', EMOJI:'emoji', FILE:'file', UNKNOWN:'unknown' }

PLATFORMS    = { WECHAT:'wechat', QQ:'qq', FEISHU:'feishu',
                 TIEBA:'tieba', ZHIHU:'zhihu', BILIBILI:'bilibili',
                 WEB:'web', SOCIAL:'social', MEDIA:'media', BOOK:'book' }
```

后四个（`web/social/media/book`）是“网搜资料”用的分类，不来自聊天工具，用于名人数据集。

## 各平台的字段对照

### 微信：weflow-cli 导出的数组

源文件是**数组**，每个元素一条消息（文件名是 talker，不含群名）。

| 标准字段 | 源字段 | 说明 |
|---|---|---|
| `sender` | `senderDisplay` → `senderUsername` → `未知` | 显示名优先 |
| `isSelf` | `isSend === 1` | 数字不是布尔 |
| `timestamp` | `createTime` | 已是秒 |
| `type` | `localType` | 1=text 3=image 34=voice 43=video 47=emoji 49=link |
| `content` | `parsedContent` → `content` | `parsedContent` 更干净 |
| `messageId` | `serverId` → `localId` | |
| `chatId` | 文件名去 `_messages.json` | 或 `opts.talker` |
| `chatName` | `opts.chatName` → `_names.json` | 文件名只有 ID，群名要查表 |

### 微信：数据库直读

走 `src/core/wechat-db.js`，支持 3.x/4.x 加密库与已解密库。字段映射在 `_parseWechatMessages`，
类型码同上，`StrTalker` 即 `chatId`。

### QQ：OneBot 11（HTTP）

| 标准字段 | 源字段 |
|---|---|
| `messageId` | `message_id` |
| `sender` | `sender.card` → `sender.nickname` → `user_id` |
| `isSelf` | `sender.user_id === selfId` |
| `timestamp` | `time`（秒） |
| `content` | 由 `message` 段数组拼装 |

### QQ：qce（qchat-cli）导出文件

结构是 `{ session: { type, id, name }, messages: [...] }`，**不是**数组，老解析器会认错。

| 标准字段 | 源字段 |
|---|---|
| `chatId` | `` `${session.type}_${session.id}` `` → 如 `group_1109256353` |
| `chatName` | `session.name` |
| `sender` | `sender.card` → `sender.name` → `sender.id` |
| `timestamp` | `timestamp`（数字秒） |
| `isSelf` | `opts.selfId` 给了且等于 `sender.id` |

> ⚠️ 不给 `selfId` 时 `isSelf` 恒为 false。Ember 无法凭空知道哪个号是“你”。

### 飞书

经 `lark-cli` 用户身份取：先 `+chat-list` 列会话，再 `+chat-messages-list --chat-id` 逐会话取。
`chatId` 形如 `oc_xxxx`，`chatName` 是群名或机器人名。

### QQ空间

`items` 数组，分两类（`type` 字段区分）：

| type | 关键字段 |
|---|---|
| `shuoshuo` | `tid`、`content`、`createTime`、`pictures[]`、`comments[{ time, sender, name, content }]` |
| `blog` | `blogId`、`title`、`content`、`createTime` |

归一后：
- 说说 → `chatId: 'qzone_shuoshuo'`、`chatName: 'QQ空间说说'`、`sender: '我'`、`isSelf: true`
- 评论 → 同一 chatId，`sender` 是评论者，`isSelf: false`
- 日志 → `chatId: 'qzone_blog'`、`chatName: 'QQ空间日志'`
- `messageId`：`qzone_ss_<tid>` / `qzone_cmt_<tid>_<time>_<sender>` / `qzone_blog_<blogId>`

### 贴吧

一层楼一条消息。`chatId: 'tieba_<tid>'`，`chatName` 是帖子标题。
时间是相对描述（“3 分钟前”），由 `_parseRelTime` 相对抓取时刻换算。

### 知乎

`chatId: 'zhihu_<qid>'`，`chatName` 是问题标题。时间是字符串，`new Date(...)/1000`。

### B站

`chatId: 'bilibili_<类别>'`。时间可能是数字也可能是字符串，统一兜底处理。

## 已知的坑

1. **时间戳单位**：schema 规定秒。OneBot 是秒，weflow 的 `createTime` 是秒，但字符串日期（知乎/空间日志）要 `/1000`。写适配器时先确认是秒还是毫秒——差 1000 倍会让整条时间轴错位。
2. **`isSelf` 没有统一办法**：微信看 `isSend`，QQ 看 `sender.id`，空间说说天然是自己，贴吧/知乎没有概念。**这是最容易被误判的字段**。
3. **`chatId` 形态五花八门**：`xxx@chatroom`、`group_123`、`oc_xxx`、`qzone_shuoshuo`、`tieba_123`。合并联系人**不能只按 chatId**，要 `chatId || id || name`，否则跨平台会塌成一条。
4. **`messageId` 可能为空**：微信某些导出没有 `serverId`。空 ID 会让去重失效——真需要去重时用 `chatId + timestamp + sender + content` 做兜底键。
5. **`content` 里带富文本标记**：空间说说有 `<b>`、`[em]e400531[/em]`；贴吧有 HTML。入分析前建议剥标签，否则关键词统计会被污染。
6. **群名不在导出文件里**：weflow 只给 `xxx@chatroom`，群名要另查会话列表（`data/raw/wechat/_names.json` 就是这么来的）。

## 快速自查

```bash
# 看某个 unified 文件的整体形状
node -e "const d=require('./data/unified/unified-data.json'); console.log(d.meta, d.contacts.length)"

# 排查时间戳单位（正常应接近当前秒级时间戳）
node -e "const d=require('./data/unified/unified-data.json'); console.log(Math.max(...d.messages.map(m=>m.timestamp)))"

# 看 isSelf 比例是否合理
node -e "const d=require('./data/unified/unified-data.json'); const s=d.messages.filter(m=>m.isSelf).length; console.log(s+'/'+d.messages.length)"
```
