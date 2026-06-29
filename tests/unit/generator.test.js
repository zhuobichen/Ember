import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { MonumentGenerator } from '../../src/core/generator.js';

describe('MonumentGenerator', () => {
  let generator;
  let tempDir;
  let mockAnalysisResult;

  beforeEach(() => {
    generator = new MonumentGenerator();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ember-generator-test-'));
    
    mockAnalysisResult = {
      epitaph: '这是一段墓志铭，纪念逝去的时光',
      trajectory: [
        { year: 2020, summary: '2020年是不平凡的一年' },
        { year: 2021, summary: '2021年继续前行' }
      ],
      relationships: [
        { name: '张三', role: '好友', intimacy: 0.9 },
        { name: '李四', role: '同事', intimacy: 0.6 }
      ],
      keywords: [
        { year: 2020, words: ['疫情', '学习', '成长'] },
        { year: 2021, words: ['工作', '旅行', '思考'] }
      ],
      stats: {
        totalMessages: 1000,
        totalContacts: 50,
        avgMessagesPerDay: 5,
        selfMessageRatio: 0.45,
        wordCloud: [
          { word: '学习', count: 100 },
          { word: '工作', count: 80 }
        ],
        sentiment: {
          positiveCount: 600,
          negativeCount: 100,
          neutralCount: 300,
          sentimentScore: 0.5,
          byYear: [
            { year: 2020, score: 0.4 },
            { year: 2021, score: 0.6 }
          ]
        },
        schedule: {
          hourlyDistribution: {},
          isNightOwl: false,
          mostActiveHour: 14,
          lateNightRatio: 0.1
        },
        relationships: {
          nodes: [
            { name: '我', category: 0, value: 1000, symbolSize: 60 }
          ],
          links: [],
          categories: [
            { name: '自己' },
            { name: '家人' },
            { name: '好友' },
            { name: '普通朋友' },
            { name: '群聊' }
          ]
        }
      },
      meta: {
        platforms: ['wechat', 'qq'],
        timeRange: {
          start: new Date('2020-01-01').getTime() / 1000,
          end: new Date('2023-12-31').getTime() / 1000
        },
        totalMessages: 1000
      }
    };

    for (let i = 0; i < 24; i++) {
      mockAnalysisResult.stats.schedule.hourlyDistribution[i] = Math.floor(Math.random() * 100);
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('generate', () => {
    it('should generate both JSON and HTML files', () => {
      const result = generator.generate(mockAnalysisResult, tempDir);

      expect(result.jsonPath).toBeDefined();
      expect(result.htmlPath).toBeDefined();
      expect(fs.existsSync(result.jsonPath)).toBe(true);
      expect(fs.existsSync(result.htmlPath)).toBe(true);
    });

    it('should write valid JSON to monument.json', () => {
      generator.generate(mockAnalysisResult, tempDir);
      const jsonPath = path.join(tempDir, 'monument.json');
      const content = fs.readFileSync(jsonPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.epitaph).toBe(mockAnalysisResult.epitaph);
      expect(parsed.trajectory).toEqual(mockAnalysisResult.trajectory);
      expect(parsed.meta).toEqual(mockAnalysisResult.meta);
    });

    it('should return correct file paths', () => {
      const result = generator.generate(mockAnalysisResult, tempDir);

      expect(result.jsonPath).toBe(path.join(tempDir, 'monument.json'));
      expect(result.htmlPath).toBe(path.join(tempDir, 'monument.html'));
    });
  });

  describe('_renderHTML', () => {
    it('should render basic HTML structure', () => {
      const html = generator._renderHTML(mockAnalysisResult, { css: 'body {}' });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="zh-CN">');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</html>');
    });

    it('should contain hero section with title', () => {
      const html = generator._renderHTML(mockAnalysisResult, { css: 'body {}' });

      expect(html).toContain('一个人的纪念碑');
      expect(html).toContain("A Person's Monument");
    });

    it('should render epitaph section', () => {
      const html = generator._renderHTML(mockAnalysisResult, { css: 'body {}' });

      expect(html).toContain('纪念碑');
      expect(html).toContain(mockAnalysisResult.epitaph);
    });

    it('should render trajectory section', () => {
      const html = generator._renderHTML(mockAnalysisResult, { css: 'body {}' });

      expect(html).toContain('人生轨迹');
      expect(html).toContain('2020');
      expect(html).toContain('2021');
      expect(html).toContain('2020年是不平凡的一年');
      expect(html).toContain('2021年继续前行');
    });

    it('should render relationships section', () => {
      const html = generator._renderHTML(mockAnalysisResult, { css: 'body {}' });

      expect(html).toContain('重要的人');
      expect(html).toContain('张三');
      expect(html).toContain('李四');
      expect(html).toContain('好友');
      expect(html).toContain('同事');
    });

    it('should render keywords section', () => {
      const html = generator._renderHTML(mockAnalysisResult, { css: 'body {}' });

      expect(html).toContain('年度关键词');
      expect(html).toContain('疫情');
      expect(html).toContain('学习');
      expect(html).toContain('成长');
      expect(html).toContain('工作');
      expect(html).toContain('旅行');
      expect(html).toContain('思考');
    });

    it('should render stats section', () => {
      const html = generator._renderHTML(mockAnalysisResult, { css: 'body {}' });

      expect(html).toContain('数据印记');
      expect(html).toContain('总消息数');
      expect(html).toContain('联系人数');
      expect(html).toContain('日均消息');
      expect(html).toContain('自己发言比例');
      expect(html).toContain('1000');
      expect(html).toContain('50');
    });

    it('should render word cloud section', () => {
      const html = generator._renderHTML(mockAnalysisResult, { css: 'body {}' });

      expect(html).toContain('词云');
      expect(html).toContain('word-cloud-container');
      expect(html).toContain('学习');
      expect(html).toContain('工作');
    });

    it('should render sentiment section', () => {
      const html = generator._renderHTML(mockAnalysisResult, { css: 'body {}' });

      expect(html).toContain('情感分析');
      expect(html).toContain('正面消息');
      expect(html).toContain('负面消息');
      expect(html).toContain('中性消息');
      expect(html).toContain('600');
      expect(html).toContain('100');
      expect(html).toContain('300');
    });

    it('should render schedule section', () => {
      const html = generator._renderHTML(mockAnalysisResult, { css: 'body {}' });

      expect(html).toContain('作息分布');
      expect(html).toContain('最活跃时段');
      expect(html).toContain('深夜消息占比');
      expect(html).toContain('是否夜猫子');
      expect(html).toContain('14:00');
    });

    it('should render relationship graph section', () => {
      const html = generator._renderHTML(mockAnalysisResult, { css: 'body {}' });

      expect(html).toContain('关系图谱');
      expect(html).toContain('relationship-graph');
    });

    it('should render footer', () => {
      const html = generator._renderHTML(mockAnalysisResult, { css: 'body {}' });

      expect(html).toContain('人永远都值得被记得和记住');
      expect(html).toContain('原始数据已焚毁');
    });

    it('should include theme CSS', () => {
      const themeCss = 'body { background: red; }';
      const html = generator._renderHTML(mockAnalysisResult, { css: themeCss });

      expect(html).toContain(themeCss);
    });

    it('should escape HTML in user content', () => {
      const maliciousResult = {
        ...mockAnalysisResult,
        epitaph: '<script>alert("xss")</script>',
        trajectory: [
          { year: 2020, summary: '<b>bold</b>' }
        ],
        relationships: [
          { name: '<img src=x onerror=alert(1)>', role: 'test', intimacy: 0.5 }
        ],
        keywords: [
          { year: 2020, words: ['<script>', 'normal'] }
        ]
      };

      const html = generator._renderHTML(maliciousResult, { css: 'body {}' });

      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<b>bold</b>');
      expect(html).toContain('&lt;b&gt;');
    });

    it('should handle empty trajectory', () => {
      const result = { ...mockAnalysisResult, trajectory: [] };
      const html = generator._renderHTML(result, { css: 'body {}' });

      expect(html).not.toContain('人生轨迹');
    });

    it('should handle empty relationships', () => {
      const result = { ...mockAnalysisResult, relationships: [] };
      const html = generator._renderHTML(result, { css: 'body {}' });

      expect(html).not.toContain('重要的人');
    });

    it('should handle empty keywords', () => {
      const result = { ...mockAnalysisResult, keywords: [] };
      const html = generator._renderHTML(result, { css: 'body {}' });

      expect(html).not.toContain('年度关键词');
    });

    it('should handle undefined optional fields', () => {
      const minimalResult = {
        epitaph: 'test',
        stats: {},
        meta: {}
      };

      const html = generator._renderHTML(minimalResult, { css: 'body {}' });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('test');
    });
  });

  describe('theme switching', () => {
    it('should use default theme by default', () => {
      const gen = new MonumentGenerator();
      const result = gen.generate(mockAnalysisResult, tempDir);
      const htmlContent = fs.readFileSync(result.htmlPath, 'utf-8');

      expect(htmlContent).toContain('--bg:');
    });

    it('should support specifying theme in constructor', () => {
      const gen = new MonumentGenerator({ theme: 'cyber' });
      const result = gen.generate(mockAnalysisResult, tempDir);
      const htmlContent = fs.readFileSync(result.htmlPath, 'utf-8');

      expect(htmlContent).toBeDefined();
      expect(htmlContent.length).toBeGreaterThan(0);
    });

    it('should support specifying theme in generate options', () => {
      const gen = new MonumentGenerator({ theme: 'default' });
      const result = gen.generate(mockAnalysisResult, tempDir, { theme: 'ink' });
      const htmlContent = fs.readFileSync(result.htmlPath, 'utf-8');

      expect(htmlContent).toBeDefined();
      expect(htmlContent.length).toBeGreaterThan(0);
    });

    it('should fall back to default theme for invalid theme name', () => {
      const gen = new MonumentGenerator({ theme: 'nonexistent' });
      const result = gen.generate(mockAnalysisResult, tempDir);
      const htmlContent = fs.readFileSync(result.htmlPath, 'utf-8');

      expect(htmlContent).toContain('<!DOCTYPE html>');
    });

    it('should use theme render function if provided', () => {
      const customHTML = '<html><body>Custom Render</body></html>';
      const customTheme = {
        css: 'body {}',
        render: () => customHTML
      };

      const html = generator._renderHTML(mockAnalysisResult, customTheme);
      expect(html).toBe(customHTML);
    });
  });
});
