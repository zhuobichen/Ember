/**
 * 名人数据集注册表
 *
 * 内置多位历史名人的多维度资料，用于演示和测试。
 * 每位名人的数据涵盖：诗作/文章、交友互动、书信文书、史料记载、后人评价等。
 *
 * 使用方式：
 *   node src/index.js generate --celebrity libai
 *
 * 扩展方式：
 *   1. 在此目录下创建新文件，如 `su-shi.js`
 *   2. 在此处导入并注册
 *   3. 运行：node src/index.js generate --celebrity su-shi
 */

import { libai } from './libai.js';
import { zhangxuefeng } from './zhangxuefeng.js';
import { suShi } from './su-shi.js';

export const celebrityRegistry = {
  'libai': {
    name: '李白',
    description: '唐代诗仙（701-762），浪漫主义诗人代表',
    data: libai
  },
  'zhangxuefeng': {
    name: '张雪峰',
    description: '考研导师、教育企业家，峰学蔚来创始人（1984-2026）',
    data: zhangxuefeng
  },
  'su-shi': {
    name: '苏轼',
    description: '北宋文豪（1037-1101），号东坡居士，唐宋八大家之一',
    data: suShi
  },
  // 未来可扩展更多名人：
  // 'du-fu': { name: '杜甫', description: '唐代诗圣', data: duFu },
};

/**
 * 获取名人数据集
 * @param {string} key 名人标识
 * @returns {object|null} 标准格式数据
 */
export function getCelebrityData(key) {
  const entry = celebrityRegistry[key];
  if (!entry) {
    console.error(`  ✗ 未找到名人: ${key}`);
    console.error('  可用名人:', Object.keys(celebrityRegistry).join(', '));
    return null;
  }
  console.log(`  使用名人数据集: ${entry.name} - ${entry.description}`);
  return entry.data.build();
}

/**
 * 列出所有可用名人
 */
export function listCelebrities() {
  console.log('\n可用名人数据集:');
  for (const [key, entry] of Object.entries(celebrityRegistry)) {
    console.log(`  ${key.padEnd(12)} ${entry.name} - ${entry.description}`);
  }
}
