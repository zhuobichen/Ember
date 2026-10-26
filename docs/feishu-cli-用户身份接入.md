# 飞书 CLI（lark-cli）用户身份接入

记录一次真实的踩坑过程：在 Windows 上让 `lark-cli` 具备**用户身份**（读自己的私聊/群聊，
而不是只读机器人被拉进的群），以及绕开 `lark-cli` 自身令牌存储故障的做法。

> 结论先行：本机 `lark-cli` 保存用户令牌会失败（`failed to acquire token storage lock` /
> `keychain Set failed`），所以改为「外部提供令牌」：自己走完 OAuth 设备授权，把
> `user_access_token` 通过 `LARKSUITE_CLI_*` 环境变量注入，并用一个转发层负责自动续期。

---

## 1. 两种身份，别混

| 身份 | 凭证 | 能看到什么 |
|---|---|---|
| bot（租户） | appId + appSecret（tenant_access_token） | 只有机器人被拉进的群/工具权限。本机实测 `im +chat-list` 返回 **0 个群** |
| user（用户） | OAuth 拿到的 `user_access_token` | 你自己在飞书里的会话、文档等 |

「昨晚飞书 CLI 还挺正常」那次的入口是 **MCP**（`npx @larksuiteoapi/lark-mcp`，配在
`~/.claude.json` 的 `feishu` 条目里，走的就是 bot 身份）。MCP 能用 ≠ CLI 的用户身份能用，
这是两条互不相干的链路。

## 2. lark-cli 自身存储为什么坏

- `lark-cli auth login` 走完设备授权后会拿到令牌，但**存不下来**：
  - Windows 上它把令牌写进凭据管理器，报 `keychain Set failed: registry create/open failed: Access is denied`
  - 在能写凭据的环境里，又报 `failed to acquire token storage lock for user "ou_..."`
- `config set dpop disabled` 这类补救也会失败（写配置需要临时文件权限）。
- 换 `LARKSUITE_CLI_CONFIG_DIR` / `LARKSUITE_CLI_DATA_DIR` 能绕开锁的问题，但令牌该进凭据管理器还是进。

所以结论是：**不要试图修它的存储，改成外部注入**。

## 3. 手工走完 OAuth 设备授权

`lark-cli auth login` 内部用的就是这套标准端点，直接调即可：

```text
1) 申请设备码
   POST https://accounts.feishu.cn/oauth/v1/device_authorization
   { "client_id": "<app_id>", "client_secret": "<app_secret>",
     "scope": "offline_access im:chat:read im:message:readonly ..." }
   → { device_code, user_code, verification_uri, verification_uri_complete, expires_in, interval }

2) 用户在浏览器打开 verification_uri_complete 完成授权

3) 轮询换令牌
   POST https://open.feishu.cn/open-apis/authen/v2/oauth/token
   { "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
     "client_id": ..., "client_secret": ..., "device_code": ... }
   → { access_token, refresh_token, expires_in, scope }
   未授权时返回 error=authorization_pending；轮询过快返回 slow_down
```

**必须带 `offline_access` 权限**，否则返回的 `refresh_token` 是空字符串，只能每次重新扫码
（第一次踩的就是这个坑）。

续期（轮换制，用过即作废，新值必须写回）：

```text
POST https://open.feishu.cn/open-apis/authen/v2/oauth/token
{ "grant_type": "refresh_token", "client_id": ..., "client_secret": ..., "refresh_token": ... }
```

## 4. 把令牌喂给 lark-cli

只给 `LARKSUITE_CLI_USER_ACCESS_TOKEN` 会报
`blocked by env: LARKSUITE_CLI_USER_ACCESS_TOKEN is set but LARKSUITE_CLI_APP_ID is missing`，
四个都要给：

```text
LARKSUITE_CLI_APP_ID=<app_id>
LARKSUITE_CLI_APP_SECRET=<app_secret>
LARKSUITE_CLI_BRAND=feishu
LARKSUITE_CLI_USER_ACCESS_TOKEN=<user_access_token>
```

代价：一旦外部提供凭据，**整个 `auth` 子命令组会被禁用**
（`"auth" is not supported: credentials are provided externally`），
包括 `auth status`。要验证身份别用 `auth status`，改用真实接口：

```powershell
lark-cli im +chat-list --as user
# 期望：{"ok": true, "identity": "user", "data": {"chats": [...]}}
```

## 5. 自动续期的转发层

`scripts/lark-cli-user-token.js` 是一个可直接用的模板，放在 npm 全局目录
（`%APPDATA%\npm\lark-cli.js`），让 `lark-cli` 命令先过它：

1. 从 `~/.lark-cli/config.json` 读 appId / appSecret（避免再存一份 secret）
2. 读 `~/.lark-cli/user-token.json`，距过期不足 5 分钟就用 refresh_token 换新并写回
3. 注入上面四个环境变量
4. `require()` 真正的 `run.js`

令牌文件长这样（`expires_at` 是 ISO，提前 5 分钟视为过期）：

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 7200,
  "expires_at": "2026-10-26T16:13:32.000Z",
  "obtained_at": "..."
}
```

## 6. 三个 Windows 特有的坑

1. **PowerShell 5.1 读无 BOM 的 UTF-8 脚本按 ANSI/GBK 解析**，脚本里的中文会把字符串引号
   顶掉，报「字符串缺少终止符」。给 PS 5.1 用的脚本要么全 ASCII，要么存成带 BOM 的 UTF-8。
   脚本里也别硬编码含中文的路径（比如本工作区），用 `$PSScriptRoot` 推导。
2. **`Out-File -Encoding utf8` 会写 BOM**，`JSON.parse` 直接被 BOM 顶崩，而且会被 `catch`
   静默吞掉，表现为「令牌明明在，却报 token_missing」。读 JSON 前先 `replace(/^\uFEFF/, '')`。
3. 自制的 `.cmd` 转发用 `%*` 传参，参数里带 `&`（例如授权 URL）会被 cmd 截断；
   这类调用直接调 `.exe`，别走 shim。

## 7. 重新授权

包装层接管后 `lark-cli auth login` 会被拒绝。两种做法：

```powershell
# 让开包装层
Rename-Item "$env:USERPROFILE\.lark-cli\user-token.json" "user-token.bak"
lark-cli auth login --domain im
# 授权后新令牌会自动生成，删掉 .bak 即可

# 或直接调真正的可执行文件
& "<安装目录>\@larksuite\cli\bin\lark-cli.exe" auth login --domain im
```

## 8. 已知限制

- `im +chat-messages-list` 对**卡片消息**只返回 `<card>` 占位，不展开正文。实测热点播报群
  415 条里 413 条是卡片。要正文得改走 `api GET /open-apis/im/v1/messages` 读原始 body。
- 用户令牌约 2 小时过期，依赖转发层续期；转发层被覆盖（例如重装 `@larksuite/cli`）就失效。
