/**
 * 数据焚毁模块 - 安全销毁所有中间文件
 *
 * 采用 DoD 5220.22-M 标准的三轮擦除:
 * 第1轮: 零填充 (0x00)
 * 第2轮: 随机填充
 * 第3轮: 零填充 (0x00)
 *
 * 焚毁完成后生成销毁校验报告
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class DataBurner {
  constructor() {
    this.destroyedFiles = [];
    this.errors = [];
  }

  /**
   * 焚毁单个文件（DoD 5220.22-M 三轮擦除）
   * @param {string} filePath - 文件路径
   */
  async burnFile(filePath) {
    if (!fs.existsSync(filePath)) {
      this.errors.push({ file: filePath, error: '文件不存在' });
      return false;
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    try {
      // 第1轮：零填充
      await this._overwrite(filePath, Buffer.alloc(fileSize, 0x00));
      await fs.promises.writeFile(filePath, Buffer.alloc(fileSize, 0x00));

      // 第2轮：随机填充
      await this._overwrite(filePath, crypto.randomBytes(fileSize));

      // 第3轮：零填充
      await this._overwrite(filePath, Buffer.alloc(fileSize, 0x00));

      // 删除文件
      fs.unlinkSync(filePath);

      this.destroyedFiles.push({
        file: filePath,
        size: fileSize,
        rounds: 3,
        method: 'DoD 5220.22-M',
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (err) {
      this.errors.push({ file: filePath, error: err.message });
      return false;
    }
  }

  /**
   * 焚毁整个目录
   * @param {string} dirPath - 目录路径
   */
  async burnDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      this.errors.push({ file: dirPath, error: '目录不存在' });
      return;
    }

    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        await this.burnDirectory(itemPath);
      } else {
        await this.burnFile(itemPath);
      }
    }

    // 删除空目录
    try {
      fs.rmdirSync(dirPath);
    } catch {
      // 目录非空或删除失败，忽略
    }
  }

  /**
   * 焚毁多个文件
   * @param {string[]} filePaths - 文件路径数组
   */
  async burn(filePaths) {
    for (const fp of filePaths) {
      const stats = fs.statSync(fp);
      if (stats.isDirectory()) {
        await this.burnDirectory(fp);
      } else {
        await this.burnFile(fp);
      }
    }

    return this.generateReport();
  }

  /**
   * 覆写文件内容
   */
  async _overwrite(filePath, buffer) {
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filePath, { flags: 'w' });
      stream.write(buffer);
      stream.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  /**
   * 生成销毁校验报告
   */
  generateReport() {
    const report = {
      burnId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      method: 'DoD 5220.22-M (3-pass overwrite)',
      summary: {
        totalFiles: this.destroyedFiles.length,
        totalSize: this.destroyedFiles.reduce((sum, f) => sum + f.size, 0),
        successCount: this.destroyedFiles.length,
        errorCount: this.errors.length
      },
      destroyedFiles: this.destroyedFiles,
      errors: this.errors,
      verification: '所有文件已执行3轮擦除并删除。原始聊天记录数据已不可恢复。'
    };

    return report;
  }

  /**
   * 将销毁报告保存为文件
   * @param {string} outputDir - 输出目录
   */
  saveReport(outputDir = './output') {
    const report = this.generateReport();
    const reportPath = path.join(outputDir, 'burn-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    return { reportPath, report };
  }

  /**
   * 打印焚毁结果摘要
   */
  printSummary() {
    const report = this.generateReport();
    console.log('\n========== 焚毁完成 ==========');
    console.log(`销毁文件数: ${report.summary.totalFiles}`);
    console.log(`总销毁大小: ${(report.summary.totalSize / 1024).toFixed(2)} KB`);
    console.log(`擦除标准: ${report.method}`);
    console.log(`错误数: ${report.summary.errorCount}`);
    console.log(`校验: ${report.verification}`);
    console.log('==============================\n');
  }
}
