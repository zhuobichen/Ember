#!/usr/bin/env node
/**
 * select-personal.mjs —— 从统一语料里筛出「跟本人密切相关」的消息
 *
 * 背景：55,512 条里绝大部分是别人发的（营销群、家人群、通知群），
 * 只按条数做纪念碑会被噪音淹没。这里按明确的规则挑出"关于他"的部分。
 *
 * 规则（可用参数关掉/调整）：
 *   A. 他本人发的（isSelf）
 *   B. 一对一会话的全部消息（对方的每句话都是对他说的），排除机器人/助手
 *   C. 群聊里 @ 他的消息（昵称白名单，默认从数据里统计，可用 --names 指定）
 *   D. QQ空间说说/日志（他自己的，已含在 A 内）
 *
 * 默认剔除：
 *   - 营销/福利群（果果、煲仔正、茶百道、星巴克、天天神券…）
 *   - 纯通知群（就业信息群、班级通知、课程群…）
 *   - 机器人播报（热点播报、飞书助手）
 *   - 贴吧/知乎（是"他读过的公开内容"，不是他本人）
 *
 * 用法：
 *   node scripts/select-personal.mjs [--in data/unified/unified-data.json] [--out data/unified/personal.json]
 *                                    [--names 太子,xxx] [--keep-groups] [--dry]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ember = path.join(__dirname, '..');

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const hasFlag = (n) => process.argv.includes(`--${n}`);

const inPath = arg('in', path.join(ember, 'data', 'unified', 'unified-data.json'));
const outPath = arg('out', path.join(ember, 'data', 'unified', 'personal.json'));
const extraNames = (arg('names', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const keepGroups = hasFlag('keep-groups');
const dry = hasFlag('dry');

const data = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
const ms = data.messages;

// 营销 / 通知 / 机器人：这些群的消息与他本人无关
const NOISE_CHAT = /果果|煲仔正|茶百道|星巴克|神券|福利官|热点播报|飞书助手|就业信息群|专硕班|通知群|课程|学习群|考研|数模|脱单|Agent测试群|去哪儿玩|高三/;
const BOT_SENDER = /机器人|助手|福利官|果果|官方|系统|未知/;
const isBot = (m) => BOT_SENDER.test(m.sender || '') || /^[a-z0-9_@.\-]+$/i.test(m.sender || '');

const isPrivate = (m) =>
  !String(m.chatId).includes('@chatroom') &&
  !String(m.chatId).startsWith('group_') &&
  !String(m.chatId).startsWith('tieba_') &&
  !String(m.chatId).startsWith('zhihu_') &&
  !String(m.chatId).startsWith('qzone_') &&
  !String(m.chatId).startsWith('oc_');

// 他可能被别人叫的昵称：显式指定 + 从数据里找「只出现几次、且出现在他发言附近」的名字
const names = new Set(extraNames);
if (names.size === 0) { names.add('显晟'); names.add('晟哥'); } // 实测：全名叫施显晟，实验室的人叫他晟哥；「太子」是老板的儿子，不是他

const contextMin = Number(arg('context-min', '0')); // >0 时把"他发言后 N 分钟内的应答"也算进来

// 被点名：带不带 @ 都算（群里常直接喊名字）
const mentioned = (m) => [...names].some((n) => String(m.content || '').includes(n));

const picked = [];
const seen = new Set();
const why = { self: 0, private: 0, mention: 0, context: 0 };
const key = (m) => `${m.chatId}|${m.messageId}|${m.timestamp}`;

const take = (m, reason) => {
  if (seen.has(key(m))) return;
  seen.add(key(m));
  picked.push(m);
  why[reason]++;
};

for (const m of ms) {
  const chat = m.chatName || m.chatId;

  // A. 他本人发的
  if (m.isSelf) { take(m, 'self'); continue; }

  // 贴吧/知乎：公开内容，不是他本人
  if (String(m.platform) === 'tieba' || String(m.platform) === 'zhihu') continue;

  // B. 一对一：对方的话都是对他说的（排除机器人）
  if (isPrivate(m)) {
    if (!isBot(m)) take(m, 'private');
    continue;
  }

  // C. 群聊里被点名
  if (mentioned(m)) { take(m, 'mention'); continue; }

  // 其余群聊默认丢弃；--keep-groups 时保留非营销群
  if (keepGroups && !NOISE_CHAT.test(chat) && !isBot(m)) take(m, 'context');
}

// D. 对话上下文：他说完话后 N 分钟内的应答
if (contextMin > 0) {
  const hisByChat = {};
  for (const m of picked) {
    if (!m.isSelf) continue;
    (hisByChat[m.chatId] = hisByChat[m.chatId] || []).push(m.timestamp);
  }
  for (const m of ms) {
    if (m.isSelf || isBot(m)) continue;
    const stamps = hisByChat[m.chatId];
    if (!stamps) continue;
    if (String(m.platform) === 'tieba' || String(m.platform) === 'zhihu') continue;
    if (stamps.some((t) => m.timestamp >= t && m.timestamp - t <= contextMin * 60)) take(m, 'context');
  }
}

picked.sort((a, b) => a.timestamp - b.timestamp);

const byChat = {};
for (const m of picked) byChat[m.chatName || m.chatId] = (byChat[m.chatName || m.chatId] || 0) + 1;
const byYear = {};
for (const m of picked) {
  const y = m.timestamp > 0 ? new Date(m.timestamp * 1000).getFullYear() : 0;
  byYear[y] = (byYear[y] || 0) + 1;
}

console.log(JSON.stringify({
  输入: inPath,
  输入条数: ms.length,
  保留条数: picked.length,
  占比: (picked.length / ms.length * 100).toFixed(2) + '%',
  来源: { 他发的: why.self, 一对一对: why.private, 群里被提到: why.mention },
  按会话: byChat,
  按年: byYear
}, null, 2));

if (!dry) {
  const out = {
    meta: {
      ...data.meta,
      generatedAt: new Date().toISOString(),
      filteredFrom: ms.length,
      filterRule: 'self | private(no bot) | mention(' + [...names].join(',') + ')'
    },
    messages: picked,
    contacts: data.contacts.filter((c) => picked.some((m) => m.chatId === (c.chatId || c.id)))
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log(`\n已写出: ${outPath}`);
} else {
  console.log('\n(--dry 未写文件)');
}
