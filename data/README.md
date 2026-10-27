# data/ —— 导出数据统一存放处

所有平台的导出都放这里，再由脚本汇总成统一语料。**整个 data/ 不入库**（个人数据）。

```
data/
├── raw/                 原始导出（按来源分目录）
│   ├── wechat/          weflow-cli export 的数组 JSON
│   ├── qq/              qce（qchat-cli）export 的 {session, messages}
│   ├── qzone/           QQ空间（已是 unified 格式，来自 Ember --auto-qqzone）
│   ├── feishu/          飞书导出（可选）
│   ├── tieba/           贴吧保存的 HTML（可选）
│   ├── zhihu/           知乎保存的 HTML（可选）
│   └── bilibili/        B站导出（可选）
├── unified/             build-from-data.mjs 的产物 unified-data.json
├── analysis/            手写或 AI 生成的 analysis.json
└── output/              render.mjs 产出的 monument.json / monument.html
```

## 常用命令

```powershell
# 1) 采集：各平台导出到 data/raw/<source>/
weflow-cli export '<talker>' json --json --output data\raw\wechat
qce --account acc2 export <群号> --format json -o data\raw\qq
node src/index.js generate --auto-qqzone --qzone-uin <QQ号>   # 产物 temp/unified-data.json 再拷到 data\raw\qzone

# 2) 汇总（只读 data/raw；加 --live 会顺带取飞书/贴吧/知乎）
node scripts\build-from-data.mjs
node scripts\build-from-data.mjs --live

# 3) 分析：有 API Key 就直接 generate；没有就手写 analysis.json
node scripts\render.mjs data\analysis\analysis.json data\output
```

## 为什么不用 generate 一步到位

`generate` 缺 `DEEPSEEK_API_KEY` 时会产出**模拟结果**（假数据）。分三步走可以：

- 采集和渲染都不需要 Key；
- 分析这一步人可以按真实统计数据来写（见 `scripts/render.mjs` 头部的字段说明）；
- 每一步的中间产物都留在本地，可复现、可对比。

## 相关脚本

| 脚本 | 作用 |
|---|---|
| `scripts/build-from-data.mjs` | 扫 `data/raw/`，按来源自动选择解析器，汇总成 `data/unified/unified-data.json` |
| `scripts/dump-unified.mjs` | 不走 data/ 目录，直接按 config 在线提取一次 |
| `scripts/render.mjs` | 读 `analysis.json` 渲染 `monument.json` / `monument.html` |
## 只保留「关于他本人」的消息

55,512 条里绝大多数是别人发的（营销群、家人群、通知群）。按条数做纪念碑会被噪音淹没，
所以先用 select-personal.mjs 筛一遍：

```powershell
node scripts\select-personal.mjs --dry                    # 只看统计，不写文件
node scripts\select-personal.mjs                          # 只保留：他发的 + 一对一 + 被点名
node scripts\select-personal.mjs --context-min 10         # 再加「他发言后 10 分钟内的应答」
node scripts\select-personal.mjs --keep-groups            # 保留非营销群的全部消息
`

规则：

| 规则 | 说明 |
|---|---|
| A 他发的 | isSelf：QQ空间说说/日志、他在群里说的话 |
| B 一对一 | 非群会话的全部消息（对方的每句话都是对他说的），排除机器人 |
| C 被点名 | 群里提到他（默认名字 太子，可用 --names 改），带不带 @ 都算 |
| D 上下文 | --context-min N：他发言后 N 分钟内的应答 |
| 剔除 | 营销/福利群（果果、煲仔正、茶百道、星巴克）、通知群、机器人播报、贴吧/知乎 |

实测：55,512 条 → 595 条（0.65%）。其中他本人说 348 条。

产物写到 `data/unified/personal.json`，再交给 render.mjs 生成纪念碑。
