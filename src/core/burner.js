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
  /** 覆写分块大小（1 MiB）：内存峰值与文件大小无关 */
  static CHUNK_SIZE = 1024 * 1024;

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
      // 三轮擦除：按固定分块写入，避免为整文件分配 Buffer
      // （审计项：原来 Buffer.alloc(fileSize) + crypto.randomBytes(fileSize) 会让大文件占用数倍内存）
      await this._overwrite(filePath, fileSize, 'zero');
      await this._overwrite(filePath, fileSize, 'random');
      await this._overwrite(filePath, fileSize, 'zero');

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
      if (!fs.existsSync(fp)) {
        this.errors.push({ file: fp, error: '文件不存在' });
        continue;
      }
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
   * 分块覆写文件内容。
   *
   * @param {string} filePath 目标文件
   * @param {number} size     原始文件大小（保持不变，逐块覆盖同一段区域）
   * @param {'zero'|'random'} fill 填充模式
   *
   * 每次只分配 CHUNK_SIZE，写完 sync() 再进入下一块——内存峰值与文件大小无关。
   * 注意：这是 best-effort 擦除，SSD 磨损均衡、写时复制文件系统与快照仍可能留下旧副本。
   */
  async _overwrite(filePath, size, fill) {
    const fh = await fs.promises.open(filePath, 'r+');
    try {
      let offset = 0;
      while (offset < size) {
        const len = Math.min(DataBurner.CHUNK_SIZE, size - offset);
        const buf = fill === 'random' ? crypto.randomBytes(len) : Buffer.alloc(len, 0x00);
        await fh.write(buf, 0, len, offset);
        offset += len;
      }
      await fh.sync();
    } finally {
      await fh.close();
    }
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
      verification: '已对每个文件执行 3 轮覆写并删除（best-effort）。' +
        '注意：SSD 磨损均衡、写时复制文件系统、快照与云备份仍可能保留旧副本，' +
        '本报告只证明"执行了什么操作"，不证明"数据在物理上不可恢复"。'
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
