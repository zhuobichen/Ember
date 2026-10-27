#!/usr/bin/env node
/**
 * build-from-data.mjs —— 扫描 data/raw/ 下的导出文件，汇总成 unified-data.json
 *
 * 目录约定：
 *   data/raw/wechat/*.json    weflow-cli export 的数组文件
 *   data/raw/qq/*.json        qce（qchat-cli）export 的文件（{session, messages}）
 *   data/raw/qzone/*.json     已经是 unified 格式（Ember --auto-qqzone 的产物）
 *   data/raw/feishu/*.json    飞书导出的 JSON（可选）
 *
 * 在线源（飞书/贴吧/知乎/B站）不在这里跑，加 --live 才顺带取一次。
 *
 * 用法：
 *   node scripts/build-from-data.mjs            # 只用 data/raw 里已有的文件
 *   node scripts/build-from-data.mjs --live     # 再顺带取飞书/贴吧/知乎
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MessageExtractor } from '../src/core/extractor.js';
import { DataMerger } from '../src/core/merge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ember = path.join(__dirname, '..');
const rawDir = path.join(ember, 'data', 'raw');
const outDir = path.join(ember, 'data', 'unified');
const withLive = process.argv.includes('--live');

const listJson = (sub, skip = []) => {
  const d = path.join(rawDir, sub);
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d)
    .filter((f) => f.endsWith('.json') && !skip.includes(f))
    .map((f) => path.join(d, f));
};

/** 微信导出的文件名是 talker id，群名要从 _names.json 里查 */
function readWechatNames() {
  const f = path.join(rawDir, 'wechat', '_names.json');
  if (!fs.existsSync(f)) return {};
  try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch { return {}; }
}
const wxNames = readWechatNames();

const extractor = new MessageExtractor();
const dataList = [];

// 1) 文件型源：微信 / QQ
for (const file of listJson('wechat', ['_names.json'])) {
  try {
    // 文件名就是 talker id，群名去 _names.json 里查
    const talker = path.basename(file).replace(/_messages\.json$/i, '');
    const d = await extractor.extractWechat({ file, talker, chatName: wxNames[talker] || talker });
    if (d) { dataList.push(d); console.log(`  ✓ 微信 ${d.contacts[0]?.name || talker}: ${d.messages.length} 条`); }
  } catch (e) { console.warn(`  ✗ 微信 ${path.basename(file)}: ${e.message}`); }
}

for (const file of listJson('qq')) {
  try {
    const d = await extractor.extractQQ({ file });
    if (d) { dataList.push(d); console.log(`  ✓ QQ ${path.basename(file)}: ${d.messages.length} 条`); }
  } catch (e) { console.warn(`  ✗ QQ ${path.basename(file)}: ${e.message}`); }
}

// 2) 已是 unified 格式的源：QQ空间
for (const file of listJson('qzone')) {
  try {
    const d = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (d && Array.isArray(d.messages)) {
      dataList.push(d);
      console.log(`  ✓ QQ空间 ${path.basename(file)}: ${d.messages.length} 条`);
    }
  } catch (e) { console.warn(`  ✗ QQ空间 ${path.basename(file)}: ${e.message}`); }
}

// 3) 在线源（可选）
if (withLive) {
  const config = { feishu: {}, tieba: { tid: '11137538751' }, zhihu: { qid: '2098047112466227298' } };
  const live = await extractor.extractAll(config);
  if (live) {
    dataList.push(live);
    console.log(`  ✓ 在线源: ${live.messages.length} 条`);
  }
}

if (dataList.length === 0) {
  console.error('data/raw 下没有可用数据');
  process.exit(1);
}

const merger = new DataMerger();
const unified = merger.merge(dataList);

fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'unified-data.json');
fs.writeFileSync(outPath, JSON.stringify(unified, null, 2), 'utf-8');

const byYear = {};
const byChat = {};
for (const m of unified.messages) {
  const y = m.timestamp > 0 ? new Date(m.timestamp * 1000).getFullYear() : 0;
  byYear[y] = (byYear[y] || 0) + 1;
  byChat[m.chatName || m.chatId] = (byChat[m.chatName || m.chatId] || 0) + 1;
}

console.log('\n' + JSON.stringify({
  输出: outPath,
  消息数: unified.messages.length,
  会话数: unified.contacts.length,
  平台: unified.meta.platforms,
  按年: byYear,
  按会话: byChat
}, null, 2));
