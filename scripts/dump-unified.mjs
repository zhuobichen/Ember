#!/usr/bin/env node
/**
 * dump-unified.mjs —— 只做「提取 + 合并」，产出 unified-data.json，不做 AI 分析
 *
 * 用途：没有 DEEPSEEK_API_KEY / ANTHROPIC_API_KEY 时，把分析这一步交给人（或 agent）来做。
 * 后续用 render.mjs 把 analysis.json 渲染成 monument.json / monument.html。
 *
 * 用法：
 *   node scripts/dump-unified.mjs '{"feishu":{},"tieba":{"tid":"..."}}' out/unified-data.json
 *
 * 配置对象与 src/index.js 里 extractAll 的 config 一致，例如：
 *   {"wechat":{"file":"..."},"feishu":{},"qq":{"baseUrl":"http://127.0.0.1:3003"},"tieba":{"tid":"..."},"zhihu":{"qid":"..."}}
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MessageExtractor } from '../src/core/extractor.js';
import { DataMerger } from '../src/core/merge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configJson = process.argv[2];
const outPath = process.argv[3] || path.join(__dirname, '..', 'output', 'unified-data.json');
if (!configJson) {
  console.error('用法: node scripts/dump-unified.mjs \'{"feishu":{}}\' [输出路径]');
  process.exit(1);
}

const config = JSON.parse(configJson);
const extractor = new MessageExtractor();
const data = await extractor.extractAll(config);
if (!data) {
  console.error('没有提取到任何数据');
  process.exit(1);
}

const merger = new DataMerger();
const unified = merger.merge([data]);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(unified, null, 2), 'utf-8');

const byYear = {};
for (const m of unified.messages) {
  const y = m.timestamp > 0 ? new Date(m.timestamp * 1000).getFullYear() : 0;
  byYear[y] = (byYear[y] || 0) + 1;
}

console.log(JSON.stringify({
  输出: outPath,
  消息数: unified.messages.length,
  会话数: unified.contacts.length,
  平台: unified.meta.platforms,
  按年: byYear
}, null, 2));
