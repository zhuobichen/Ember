/**
 * 微信适配器 - 加载已导出的 JSON 并转换为标准格式
 *
 * 支持两种输入：
 * 1. weflow-cli 导出格式（旧格式）
 * 2. 提取器输出的标准格式（直接返回）
 *
 * 解析逻辑已抽取到 core/parsers.js 中共享
 */

import fs from 'fs';
import { PLATFORMS } from '../core/schema.js';
import { parseWechatRaw } from '../core/parsers.js';

export class WechatAdapter {
  constructor() {
    this.platform = PLATFORMS.WECHAT;
  }

  /**
   * 从 JSON 文件加载数据
   * @param {string} filePath - JSON 文件路径
   * @returns {Promise<UnifiedData>}
   */
  async load(filePath) {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return parseWechatRaw(raw);
  }

  /**
   * 直接调用 weflow-cli 命令导出数据
   * @param {Object} options - { talker, format, output }
   */
  async export(options = {}) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const outputFile = options.output || `./temp/wechat-export-${Date.now()}.json`;
    const cmd = `weflow-cli chat export --talker "${options.talker || ''}" --format json --output "${outputFile}"`;

    try {
      await execAsync(cmd);
      return await this.load(outputFile);
    } catch (err) {
      throw new Error(`weflow-cli 导出失败: ${err.message}`);
    }
  }
}
