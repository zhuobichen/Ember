#!/usr/bin/env node
/**
 * lark-cli 转发层（带用户令牌自动续期）—— 可直接部署的模板
 *
 * 用途：绕开 lark-cli 在 Windows 上"存不住用户令牌"的问题。
 * 把它放到 npm 全局目录当 `lark-cli.js`（`%APPDATA%\npm\lark-cli.js`），
 * 再配一个 `lark-cli.cmd` 调它，`lark-cli` 命令就会先经过这里：
 *
 *   1. 读 ~/.lark-cli/config.json 里的 appId / appSecret（避免再存一份 secret）
 *   2. 读 ~/.lark-cli/user-token.json，距过期不足 5 分钟用 refresh_token 换新并写回
 *   3. 注入 LARKSUITE_CLI_* 环境变量
 *   4. 调真正的 @larksuite/cli run.js
 *
 * 前置：
 *   - 已经用 OAuth 设备流拿到过 user_access_token + refresh_token
 *     （流程与端点见 docs/feishu-cli-用户身份接入.md）
 *   - 环境变量 LARK_CLI_REAL_RUN 指向 `.../@larksuite/cli/scripts/run.js`，
 *     或在下面 REAL_RUN 里直接写死绝对路径
 *
 * 注意：一旦注入外部凭据，lark-cli 的 `auth` 子命令组会被禁用（含 auth status）。
 * 验证身份请用 `lark-cli im +chat-list --as user`。
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 指向真实的 lark-cli 入口；可用环境变量覆盖
const REAL_RUN =
  process.env.LARK_CLI_REAL_RUN ||
  path.join(path.dirname(process.execPath), 'node_modules', '@larksuite', 'cli', 'scripts', 'run.js');

const HOME = process.env.USERPROFILE || process.env.HOME || require('os').homedir();
const CONFIG = path.join(HOME, '.lark-cli', 'config.json');
const TOKEN = path.join(HOME, '.lark-cli', 'user-token.json');
const REFRESH_URL = 'https://open.feishu.cn/open-apis/authen/v2/oauth/token';

/** 安全读 JSON（顺手去掉 PowerShell 写文件时带的 BOM） */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

/** 从 ~/.lark-cli/config.json 取应用凭证 */
function readApp() {
  const cfg = readJson(CONFIG);
  const app = cfg && Array.isArray(cfg.apps) && cfg.apps[0];
  if (app && app.appId && app.appSecret) {
    return { appId: app.appId, appSecret: app.appSecret, brand: app.brand || 'feishu' };
  }
  return null;
}

/** POST JSON */
function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(text));
          } catch {
            reject(new Error(`bad response (HTTP ${res.statusCode}): ${text.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
    req.write(payload);
    req.end();
  });
}

/** 写回令牌；续期是轮换制，写不回去下次就续不了 */
function persist(tok) {
  try {
    fs.mkdirSync(path.dirname(TOKEN), { recursive: true });
    fs.writeFileSync(TOKEN, JSON.stringify(tok, null, 2), { mode: 0o600 });
    return true;
  } catch {
    return false;
  }
}

/** 距过期不足 5 分钟就续期 */
async function refreshIfNeeded(tok, app) {
  const expiresAt = Date.parse(tok.expires_at || '');
  const soon = !Number.isFinite(expiresAt) || expiresAt - Date.now() < 5 * 60 * 1000;
  if (!soon || !tok.refresh_token) return tok;

  const r = await postJson(REFRESH_URL, {
    grant_type: 'refresh_token',
    client_id: app.appId,
    client_secret: app.appSecret,
    refresh_token: tok.refresh_token
  });

  if (!r || !r.access_token) {
    console.error(
      '[lark-cli] 用户令牌续期失败：' +
      ((r && (r.error_description || r.error)) || '未知原因') +
      '（需重新授权，见 docs/feishu-cli-用户身份接入.md）'
    );
    return tok;
  }

  const next = {
    ...tok,
    access_token: r.access_token,
    refresh_token: r.refresh_token || tok.refresh_token,
    expires_in: r.expires_in,
    scope: r.scope || tok.scope,
    obtained_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + (Number(r.expires_in) - 300) * 1000).toISOString()
  };
  if (!persist(next)) {
    console.error('[lark-cli] 警告：新令牌写不回磁盘，本次可用，下次可能续期失败');
  }
  return next;
}

(async () => {
  const app = readApp();
  const tok = readJson(TOKEN);

  if (app && tok && tok.access_token) {
    const fresh = await refreshIfNeeded(tok, app);
    process.env.LARKSUITE_CLI_APP_ID = app.appId;
    process.env.LARKSUITE_CLI_APP_SECRET = app.appSecret;
    process.env.LARKSUITE_CLI_BRAND = app.brand;
    process.env.LARKSUITE_CLI_USER_ACCESS_TOKEN = fresh.access_token;
  }

  if (!fs.existsSync(REAL_RUN)) {
    console.error('[lark-cli] 找不到真正的 lark-cli 入口：' + REAL_RUN);
    console.error('[lark-cli] 设置环境变量 LARK_CLI_REAL_RUN 指向 @larksuite/cli/scripts/run.js');
    process.exit(1);
  }
  require(REAL_RUN);
})().catch((err) => {
  console.error('[lark-cli] ' + err.message);
  process.exit(1);
});
