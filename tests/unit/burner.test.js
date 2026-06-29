import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { DataBurner } from '../../src/core/burner.js';

describe('DataBurner', () => {
  let burner;
  let tempDir;

  beforeEach(() => {
    burner = new DataBurner();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ember-burner-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('burnFile', () => {
    it('should burn a single file and remove it', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'sensitive data content', 'utf-8');

      expect(fs.existsSync(testFile)).toBe(true);

      const result = await burner.burnFile(testFile);

      expect(result).toBe(true);
      expect(fs.existsSync(testFile)).toBe(false);
    });

    it('should return false for non-existent file', async () => {
      const nonExistent = path.join(tempDir, 'nonexistent.txt');

      const result = await burner.burnFile(nonExistent);

      expect(result).toBe(false);
      expect(burner.errors.length).toBe(1);
      expect(burner.errors[0].file).toBe(nonExistent);
      expect(burner.errors[0].error).toBe('文件不存在');
    });

    it('should record destroyed file info', async () => {
      const testFile = path.join(tempDir, 'record.txt');
      const content = 'test content for size check';
      fs.writeFileSync(testFile, content, 'utf-8');
      const fileSize = fs.statSync(testFile).size;

      await burner.burnFile(testFile);

      expect(burner.destroyedFiles.length).toBe(1);
      expect(burner.destroyedFiles[0].file).toBe(testFile);
      expect(burner.destroyedFiles[0].size).toBe(fileSize);
      expect(burner.destroyedFiles[0].rounds).toBe(3);
      expect(burner.destroyedFiles[0].method).toBe('DoD 5220.22-M');
      expect(burner.destroyedFiles[0].timestamp).toBeDefined();
    });

    it('should handle empty file', async () => {
      const testFile = path.join(tempDir, 'empty.txt');
      fs.writeFileSync(testFile, '', 'utf-8');

      const result = await burner.burnFile(testFile);

      expect(result).toBe(true);
      expect(fs.existsSync(testFile)).toBe(false);
    });

    it('should handle large file', async () => {
      const testFile = path.join(tempDir, 'large.bin');
      const largeBuffer = crypto.randomBytes(1024 * 100);
      fs.writeFileSync(testFile, largeBuffer);

      const result = await burner.burnFile(testFile);

      expect(result).toBe(true);
      expect(fs.existsSync(testFile)).toBe(false);
    });
  });

  describe('burnDirectory', () => {
    it('should burn all files in a directory', async () => {
      const subDir = path.join(tempDir, 'subdir');
      fs.mkdirSync(subDir);

      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(subDir, 'file2.txt');
      fs.writeFileSync(file1, 'content1', 'utf-8');
      fs.writeFileSync(file2, 'content2', 'utf-8');

      await burner.burnDirectory(tempDir);

      expect(fs.existsSync(file1)).toBe(false);
      expect(fs.existsSync(file2)).toBe(false);
      expect(burner.destroyedFiles.length).toBe(2);
    });

    it('should handle nested directories', async () => {
      const level1 = path.join(tempDir, 'level1');
      const level2 = path.join(level1, 'level2');
      fs.mkdirSync(level2, { recursive: true });

      const f1 = path.join(tempDir, 'root.txt');
      const f2 = path.join(level1, 'l1.txt');
      const f3 = path.join(level2, 'l2.txt');
      fs.writeFileSync(f1, 'root', 'utf-8');
      fs.writeFileSync(f2, 'level1', 'utf-8');
      fs.writeFileSync(f3, 'level2', 'utf-8');

      await burner.burnDirectory(tempDir);

      expect(fs.existsSync(f1)).toBe(false);
      expect(fs.existsSync(f2)).toBe(false);
      expect(fs.existsSync(f3)).toBe(false);
      expect(burner.destroyedFiles.length).toBe(3);
    });

    it('should handle empty directory', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir);

      await burner.burnDirectory(emptyDir);

      expect(fs.existsSync(emptyDir)).toBe(false);
    });

    it('should handle non-existent directory', async () => {
      const nonExistentDir = path.join(tempDir, 'nonexistent');

      await burner.burnDirectory(nonExistentDir);

      expect(burner.errors.length).toBe(1);
      expect(burner.errors[0].error).toBe('目录不存在');
    });
  });

  describe('generateReport', () => {
    it('should generate a report with correct structure', () => {
      const report = burner.generateReport();

      expect(report.burnId).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.method).toBe('DoD 5220.22-M (3-pass overwrite)');
      expect(report.summary).toBeDefined();
      expect(report.summary.totalFiles).toBe(0);
      expect(report.summary.totalSize).toBe(0);
      expect(report.summary.successCount).toBe(0);
      expect(report.summary.errorCount).toBe(0);
      expect(report.destroyedFiles).toEqual([]);
      expect(report.errors).toEqual([]);
      expect(report.verification).toBeDefined();
    });

    it('should include destroyed files in report', async () => {
      const testFile = path.join(tempDir, 'report-test.txt');
      fs.writeFileSync(testFile, 'report content', 'utf-8');
      const fileSize = fs.statSync(testFile).size;

      await burner.burnFile(testFile);
      const report = burner.generateReport();

      expect(report.summary.totalFiles).toBe(1);
      expect(report.summary.totalSize).toBe(fileSize);
      expect(report.summary.successCount).toBe(1);
      expect(report.destroyedFiles.length).toBe(1);
      expect(report.destroyedFiles[0].file).toBe(testFile);
    });

    it('should include errors in report', async () => {
      const badFile = path.join(tempDir, 'bad.txt');

      await burner.burnFile(badFile);
      const report = burner.generateReport();

      expect(report.summary.errorCount).toBe(1);
      expect(report.errors.length).toBe(1);
    });

    it('should generate unique burnId each time', () => {
      const report1 = burner.generateReport();
      const report2 = burner.generateReport();

      expect(report1.burnId).not.toBe(report2.burnId);
    });
  });

  describe('burn', () => {
    it('should burn multiple files and return report', async () => {
      const file1 = path.join(tempDir, 'multi1.txt');
      const file2 = path.join(tempDir, 'multi2.txt');
      const file3 = path.join(tempDir, 'multi3.txt');
      fs.writeFileSync(file1, 'one', 'utf-8');
      fs.writeFileSync(file2, 'two', 'utf-8');
      fs.writeFileSync(file3, 'three', 'utf-8');

      const report = await burner.burn([file1, file2, file3]);

      expect(fs.existsSync(file1)).toBe(false);
      expect(fs.existsSync(file2)).toBe(false);
      expect(fs.existsSync(file3)).toBe(false);
      expect(report.summary.totalFiles).toBe(3);
    });

    it('should handle mix of files and directories', async () => {
      const subDir = path.join(tempDir, 'mixed-dir');
      fs.mkdirSync(subDir);
      const dirFile = path.join(subDir, 'dir-file.txt');
      fs.writeFileSync(dirFile, 'in dir', 'utf-8');

      const standaloneFile = path.join(tempDir, 'standalone.txt');
      fs.writeFileSync(standaloneFile, 'standalone', 'utf-8');

      const report = await burner.burn([standaloneFile, subDir]);

      expect(fs.existsSync(standaloneFile)).toBe(false);
      expect(fs.existsSync(dirFile)).toBe(false);
      expect(report.summary.totalFiles).toBe(2);
    });

    it('should continue on errors and collect all errors', async () => {
      const goodFile = path.join(tempDir, 'good.txt');
      const badFile1 = path.join(tempDir, 'bad1.txt');
      const badFile2 = path.join(tempDir, 'bad2.txt');
      fs.writeFileSync(goodFile, 'good', 'utf-8');

      const report = await burner.burn([badFile1, goodFile, badFile2]);

      expect(fs.existsSync(goodFile)).toBe(false);
      expect(report.summary.successCount).toBe(1);
      expect(report.summary.errorCount).toBe(2);
    });
  });
});
