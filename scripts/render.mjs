#!/usr/bin/env node
/**
 * render.mjs —— 用一份手写的 analysis.json 渲染纪念碑，跳过 AI 调用
 *
 * 典型用途：没有 API Key 时，先 dump-unified.mjs 导出语料，人（或 agent）按真实数据
 * 写好 analysis.json，再用这里出 monument.json / monument.html。
 *
 * analysis.json 结构（与 src/core/analyzer.js 的产出对齐）：
 * {
 *   "meta": { "platforms": [...], "totalMessages": N, "timeRange": {"start": s, "end": s} },
 *   "epitaph": "碑文",
 *   "trajectory": [{ "year": 2025, "summary": "..." }],
 *   "relationships": [{ "name": "...", "role": "...", "intimacy": 0.9 }],
 *   "keywords": [{ "year": 2025, "words": ["..."] }],
 *   "stats": { "totalMessages": N, "totalContacts": N, "yearBreakdown": {...}, "avgMessagesPerDay": 0, "selfMessageRatio": 0 }
 * }
 *
 * 用法：
 *   node scripts/render.mjs analysis.json ./output
 */

import fs from 'fs';
import path from 'path';
import { MonumentGenerator } from '../src/core/generator.js';

const analysisPath = process.argv[2];
const outDir = process.argv[3] || './output';
if (!analysisPath) {
  console.error('用法: node scripts/render.mjs <analysis.json> [输出目录]');
  process.exit(1);
}

const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
for (const key of ['epitaph', 'trajectory', 'relationships', 'keywords']) {
  if (!(key in analysis)) console.warn(`[警告] analysis.json 缺少字段: ${key}`);
}

fs.mkdirSync(outDir, { recursive: true });
const generator = new MonumentGenerator();
const { jsonPath, htmlPath } = generator.generate(analysis, outDir);
console.log(JSON.stringify({ jsonPath, htmlPath }, null, 2));
