import { describe, it, expect, beforeEach } from 'vitest';
import { DataAnalytics } from '../../src/core/analytics.js';

describe('DataAnalytics', () => {
  let analytics;

  beforeEach(() => {
    analytics = new DataAnalytics();
  });

  describe('generateWordCloud', () => {
    it('should return empty array for empty messages', () => {
      const result = analytics.generateWordCloud([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for null/undefined input', () => {
      expect(analytics.generateWordCloud(null)).toEqual([]);
      expect(analytics.generateWordCloud(undefined)).toEqual([]);
    });

    it('should generate word cloud from text messages', () => {
      const messages = [
        { type: 'text', content: '学习编程很有趣，编程让我快乐' },
        { type: 'text', content: '编程学习是快乐的过程' }
      ];

      const result = analytics.generateWordCloud(messages);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('word');
      expect(result[0]).toHaveProperty('count');
    });

    it('should filter out stop words', () => {
      const messages = [
        { type: 'text', content: '我们的学习是一个快乐的过程，学习很重要' }
      ];

      const result = analytics.generateWordCloud(messages);
      const words = result.map(r => r.word);

      expect(words).not.toContain('我们');
      expect(words).not.toContain('一个');
    });

    it('should filter out single character words', () => {
      const messages = [
        { type: 'text', content: '编程学习快乐每一天' }
      ];

      const result = analytics.generateWordCloud(messages);
      const allTwoChars = result.every(r => r.word.length >= 2);
      expect(allTwoChars).toBe(true);
    });

    it('should only count text messages', () => {
      const messages = [
        { type: 'text', content: '编程学习' },
        { type: 'image', content: '图片内容' },
        { type: 'text', content: '学习编程' }
      ];

      const result = analytics.generateWordCloud(messages);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should sort by count descending', () => {
      const messages = [
        { type: 'text', content: '编程 编程 编程 学习 学习 快乐' }
      ];

      const result = analytics.generateWordCloud(messages, 10);
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].count).toBeGreaterThanOrEqual(result[i + 1].count);
      }
    });

    it('should respect topN parameter', () => {
      const messages = [
        { type: 'text', content: 'abcdefghijklmnopqrstuvwxyz' }
      ];

      const result = analytics.generateWordCloud(messages, 5);
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('analyzeSentiment', () => {
    it('should return zero counts for empty messages', () => {
      const result = analytics.analyzeSentiment([]);

      expect(result.positiveCount).toBe(0);
      expect(result.negativeCount).toBe(0);
      expect(result.neutralCount).toBe(0);
      expect(result.sentimentScore).toBe(0);
      expect(result.byYear).toEqual([]);
    });

    it('should handle null/undefined input', () => {
      const nullResult = analytics.analyzeSentiment(null);
      expect(nullResult.positiveCount).toBe(0);
      expect(nullResult.sentimentScore).toBe(0);

      const undefResult = analytics.analyzeSentiment(undefined);
      expect(undefResult.positiveCount).toBe(0);
      expect(undefResult.sentimentScore).toBe(0);
    });

    it('should detect positive sentiment', () => {
      const messages = [
        { type: 'text', content: '今天真开心，很快乐很幸福', timestamp: new Date('2023-01-01').getTime() / 1000 }
      ];

      const result = analytics.analyzeSentiment(messages);

      expect(result.positiveCount).toBeGreaterThan(0);
      expect(result.sentimentScore).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', () => {
      const messages = [
        { type: 'text', content: '今天很难过，很伤心很痛苦', timestamp: new Date('2023-01-01').getTime() / 1000 }
      ];

      const result = analytics.analyzeSentiment(messages);

      expect(result.negativeCount).toBeGreaterThan(0);
      expect(result.sentimentScore).toBeLessThan(0);
    });

    it('should calculate neutral count correctly', () => {
      const messages = [
        { type: 'text', content: '今天天气不错很开心', timestamp: new Date('2023-01-01').getTime() / 1000 },
        { type: 'text', content: '吃饭睡觉打豆豆', timestamp: new Date('2023-01-02').getTime() / 1000 },
        { type: 'text', content: '难过伤心痛苦', timestamp: new Date('2023-01-03').getTime() / 1000 }
      ];

      const result = analytics.analyzeSentiment(messages);

      expect(result.positiveCount + result.negativeCount + result.neutralCount).toBe(3);
    });

    it('should group by year', () => {
      const messages = [
        { type: 'text', content: '很开心很快乐', timestamp: new Date('2022-06-01').getTime() / 1000 },
        { type: 'text', content: '很开心很幸福', timestamp: new Date('2023-06-01').getTime() / 1000 }
      ];

      const result = analytics.analyzeSentiment(messages);

      expect(result.byYear.length).toBe(2);
      expect(result.byYear[0].year).toBe(2022);
      expect(result.byYear[1].year).toBe(2023);
    });

    it('should sort byYear by year ascending', () => {
      const messages = [
        { type: 'text', content: '开心', timestamp: new Date('2024-01-01').getTime() / 1000 },
        { type: 'text', content: '开心', timestamp: new Date('2022-01-01').getTime() / 1000 },
        { type: 'text', content: '开心', timestamp: new Date('2023-01-01').getTime() / 1000 }
      ];

      const result = analytics.analyzeSentiment(messages);

      expect(result.byYear[0].year).toBe(2022);
      expect(result.byYear[1].year).toBe(2023);
      expect(result.byYear[2].year).toBe(2024);
    });

    it('should only analyze text messages', () => {
      const messages = [
        { type: 'text', content: '开心快乐幸福', timestamp: 1000 },
        { type: 'image', content: '难过伤心', timestamp: 2000 }
      ];

      const result = analytics.analyzeSentiment(messages);

      expect(result.positiveCount).toBe(1);
      expect(result.negativeCount).toBe(0);
    });
  });

  describe('analyzeSchedule', () => {
    it('should return default values for empty messages', () => {
      const result = analytics.analyzeSchedule([]);

      expect(result.hourlyDistribution).toBeDefined();
      expect(result.hourlyDistribution).toEqual({});
      expect(result.isNightOwl).toBe(false);
      expect(result.mostActiveHour).toBe(0);
      expect(result.lateNightRatio).toBe(0);
    });

    it('should handle null/undefined input', () => {
      const result = analytics.analyzeSchedule(null);
      expect(result.hourlyDistribution).toBeDefined();
      expect(result.isNightOwl).toBe(false);
    });

    it('should calculate hourly distribution', () => {
      const messages = [];
      for (let h = 0; h < 24; h++) {
        const date = new Date();
        date.setHours(h, 0, 0, 0);
        messages.push({ timestamp: date.getTime() / 1000, type: 'text', content: 'msg' });
      }

      const result = analytics.analyzeSchedule(messages);

      for (let h = 0; h < 24; h++) {
        expect(result.hourlyDistribution[h]).toBeGreaterThanOrEqual(0);
      }
    });

    it('should find most active hour', () => {
      const messages = [];
      const targetHour = 14;
      for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setHours(targetHour, i, 0, 0);
        messages.push({ timestamp: date.getTime() / 1000, type: 'text', content: 'msg' });
      }
      for (let h = 0; h < 24; h++) {
        if (h !== targetHour) {
          const date = new Date();
          date.setHours(h, 0, 0, 0);
          messages.push({ timestamp: date.getTime() / 1000, type: 'text', content: 'msg' });
        }
      }

      const result = analytics.analyzeSchedule(messages);

      expect(result.mostActiveHour).toBe(targetHour);
    });

    it('should detect night owl when late night ratio > 30%', () => {
      const messages = [];
      for (let h = 0; h <= 5; h++) {
        for (let i = 0; i < 10; i++) {
          const date = new Date();
          date.setHours(h, i, 0, 0);
          messages.push({ timestamp: date.getTime() / 1000, type: 'text', content: 'msg' });
        }
      }
      for (let h = 10; h <= 12; h++) {
        const date = new Date();
        date.setHours(h, 0, 0, 0);
        messages.push({ timestamp: date.getTime() / 1000, type: 'text', content: 'msg' });
      }

      const result = analytics.analyzeSchedule(messages);

      expect(result.isNightOwl).toBe(true);
      expect(result.lateNightRatio).toBeGreaterThan(0.3);
    });

    it('should not detect night owl for normal schedule', () => {
      const messages = [];
      for (let h = 9; h <= 18; h++) {
        for (let i = 0; i < 5; i++) {
          const date = new Date();
          date.setHours(h, i, 0, 0);
          messages.push({ timestamp: date.getTime() / 1000, type: 'text', content: 'msg' });
        }
      }

      const result = analytics.analyzeSchedule(messages);

      expect(result.isNightOwl).toBe(false);
    });

    it('should have 24 hours in hourly distribution', () => {
      const messages = [
        { timestamp: new Date().getTime() / 1000, type: 'text', content: 'msg' }
      ];

      const result = analytics.analyzeSchedule(messages);

      expect(Object.keys(result.hourlyDistribution).length).toBe(24);
    });
  });

  describe('analyzeRelationships', () => {
    it('should return empty nodes for empty contacts', () => {
      const result = analytics.analyzeRelationships({ contacts: [] });

      expect(result.nodes.length).toBe(0);
      expect(result.links.length).toBe(0);
      expect(result.categories.length).toBe(5);
    });

    it('should handle null/undefined input', () => {
      const result = analytics.analyzeRelationships(null);

      expect(result.nodes).toEqual([]);
      expect(result.links).toEqual([]);
      expect(result.categories.length).toBe(5);
    });

    it('should create self node with correct values', () => {
      const data = {
        messages: Array(100).fill({ type: 'text' }),
        contacts: [
          { name: '朋友', platform: 'wechat', chatId: 'c1', msgCount: 50, isGroup: false }
        ]
      };

      const result = analytics.analyzeRelationships(data);

      expect(result.nodes[0].name).toBe('我');
      expect(result.nodes[0].category).toBe(0);
      expect(result.nodes[0].value).toBe(100);
    });

    it('should categorize family contacts correctly', () => {
      const data = {
        messages: [],
        contacts: [
          { name: '妈妈', platform: 'wechat', chatId: 'mom', msgCount: 10, isGroup: false },
          { name: '爸爸', platform: 'wechat', chatId: 'dad', msgCount: 5, isGroup: false }
        ]
      };

      const result = analytics.analyzeRelationships(data);

      const familyNodes = result.nodes.filter(n => n.category === 1);
      expect(familyNodes.length).toBe(2);
    });

    it('should categorize group chats correctly', () => {
      const data = {
        messages: [],
        contacts: [
          { name: '工作群', platform: 'wechat', chatId: 'g1', msgCount: 100, isGroup: true }
        ]
      };

      const result = analytics.analyzeRelationships(data);

      const groupNodes = result.nodes.filter(n => n.category === 4);
      expect(groupNodes.length).toBe(1);
    });

    it('should categorize close friends correctly (msgCount > 100)', () => {
      const data = {
        messages: [],
        contacts: [
          { name: '好朋友', platform: 'wechat', chatId: 'f1', msgCount: 200, isGroup: false }
        ]
      };

      const result = analytics.analyzeRelationships(data);

      const friendNodes = result.nodes.filter(n => n.category === 2);
      expect(friendNodes.length).toBe(1);
    });

    it('should categorize normal friends correctly (msgCount <= 100)', () => {
      const data = {
        messages: [],
        contacts: [
          { name: '普通朋友', platform: 'wechat', chatId: 'n1', msgCount: 50, isGroup: false }
        ]
      };

      const result = analytics.analyzeRelationships(data);

      const normalNodes = result.nodes.filter(n => n.category === 3);
      expect(normalNodes.length).toBe(1);
    });

    it('should sort contacts by msgCount and take top 30', () => {
      const contacts = [];
      for (let i = 0; i < 50; i++) {
        contacts.push({
          name: `contact_${i}`,
          platform: 'wechat',
          chatId: `c${i}`,
          msgCount: i * 10,
          isGroup: false
        });
      }

      const data = { messages: [], contacts };
      const result = analytics.analyzeRelationships(data);

      expect(result.nodes.length).toBe(31);
    });

    it('should create links from self to each contact', () => {
      const data = {
        messages: [],
        contacts: [
          { name: 'A', platform: 'wechat', chatId: 'a', msgCount: 10, isGroup: false },
          { name: 'B', platform: 'wechat', chatId: 'b', msgCount: 20, isGroup: false }
        ]
      };

      const result = analytics.analyzeRelationships(data);

      expect(result.links.length).toBe(2);
      expect(result.links[0].source).toBe('我');
      expect(result.links[1].source).toBe('我');
    });

    it('should have correct categories', () => {
      const result = analytics.analyzeRelationships({ contacts: [] });

      expect(result.categories[0].name).toBe('自己');
      expect(result.categories[1].name).toBe('家人');
      expect(result.categories[2].name).toBe('好友');
      expect(result.categories[3].name).toBe('普通朋友');
      expect(result.categories[4].name).toBe('群聊');
    });
  });
});
