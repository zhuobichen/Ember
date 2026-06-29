import { describe, it, expect, beforeEach } from 'vitest';
import { DataMerger } from '../../src/core/merge.js';
import { createEmptyData, MESSAGE_TYPES } from '../../src/core/schema.js';

describe('DataMerger', () => {
  let merger;

  beforeEach(() => {
    merger = new DataMerger();
  });

  describe('merge', () => {
    it('should merge single platform data correctly', () => {
      const data = createEmptyData();
      data.messages = [
        { platform: 'wechat', messageId: '1', timestamp: 2000, type: 'text', content: 'hello' },
        { platform: 'wechat', messageId: '2', timestamp: 1000, type: 'text', content: 'world' }
      ];
      data.contacts = [
        { platform: 'wechat', chatId: 'c1', name: 'Alice', msgCount: 2, isGroup: false }
      ];

      const result = merger.merge([data]);

      expect(result.messages.length).toBe(2);
      expect(result.contacts.length).toBe(1);
      expect(result.meta.totalMessages).toBe(2);
      expect(result.meta.platforms).toEqual(['wechat']);
    });

    it('should merge multiple platform data', () => {
      const wechatData = createEmptyData();
      wechatData.messages = [
        { platform: 'wechat', messageId: 'w1', timestamp: 1000, type: 'text', content: 'wechat msg' }
      ];
      wechatData.contacts = [
        { platform: 'wechat', chatId: 'wc1', name: 'WeChat Friend', msgCount: 1, isGroup: false }
      ];

      const qqData = createEmptyData();
      qqData.messages = [
        { platform: 'qq', messageId: 'q1', timestamp: 2000, type: 'text', content: 'qq msg' }
      ];
      qqData.contacts = [
        { platform: 'qq', chatId: 'qc1', name: 'QQ Friend', msgCount: 1, isGroup: false }
      ];

      const result = merger.merge([wechatData, qqData]);

      expect(result.messages.length).toBe(2);
      expect(result.contacts.length).toBe(2);
      expect(result.meta.platforms).toEqual(expect.arrayContaining(['wechat', 'qq']));
      expect(result.meta.platforms.length).toBe(2);
    });

    it('should sort messages by timestamp', () => {
      const data = createEmptyData();
      data.messages = [
        { platform: 'wechat', messageId: '3', timestamp: 3000, type: 'text', content: 'third' },
        { platform: 'wechat', messageId: '1', timestamp: 1000, type: 'text', content: 'first' },
        { platform: 'wechat', messageId: '2', timestamp: 2000, type: 'text', content: 'second' }
      ];

      const result = merger.merge([data]);

      expect(result.messages[0].timestamp).toBe(1000);
      expect(result.messages[1].timestamp).toBe(2000);
      expect(result.messages[2].timestamp).toBe(3000);
    });

    it('should deduplicate messages by platform + messageId', () => {
      const data1 = createEmptyData();
      data1.messages = [
        { platform: 'wechat', messageId: 'dup1', timestamp: 1000, type: 'text', content: 'dup a' },
        { platform: 'wechat', messageId: 'unique1', timestamp: 2000, type: 'text', content: 'unique a' }
      ];

      const data2 = createEmptyData();
      data2.messages = [
        { platform: 'wechat', messageId: 'dup1', timestamp: 1000, type: 'text', content: 'dup b' },
        { platform: 'qq', messageId: 'dup1', timestamp: 3000, type: 'text', content: 'different platform same id' }
      ];

      const result = merger.merge([data1, data2]);

      expect(result.messages.length).toBe(3);
      const wechatDupCount = result.messages.filter(m => m.platform === 'wechat' && m.messageId === 'dup1').length;
      expect(wechatDupCount).toBe(1);
    });

    it('should deduplicate contacts by platform + chatId', () => {
      const data1 = createEmptyData();
      data1.contacts = [
        { platform: 'wechat', chatId: 'c1', name: 'Alice', msgCount: 5, isGroup: false }
      ];

      const data2 = createEmptyData();
      data2.contacts = [
        { platform: 'wechat', chatId: 'c1', name: 'Alice Updated', msgCount: 10, isGroup: false },
        { platform: 'qq', chatId: 'c1', name: 'Alice QQ', msgCount: 3, isGroup: false }
      ];

      const result = merger.merge([data1, data2]);

      expect(result.contacts.length).toBe(2);
    });

    it('should handle empty input array', () => {
      const result = merger.merge([]);

      expect(result.messages.length).toBe(0);
      expect(result.contacts.length).toBe(0);
      expect(result.meta.totalMessages).toBe(0);
    });

    it('should update meta information', () => {
      const data = createEmptyData();
      data.messages = [
        { platform: 'wechat', messageId: '1', timestamp: 1000, type: 'text', content: 'msg' }
      ];

      const result = merger.merge([data]);

      expect(result.meta.totalMessages).toBe(1);
      expect(result.meta.timeRange.start).toBe(1000);
      expect(result.meta.timeRange.end).toBe(1000);
    });
  });

  describe('generateStats', () => {
    it('should generate stats for data with messages', () => {
      const data = createEmptyData();
      data.messages = [
        { platform: 'wechat', messageId: '1', timestamp: new Date('2023-01-15').getTime() / 1000, type: 'text', content: 'hello world', isSelf: true },
        { platform: 'wechat', messageId: '2', timestamp: new Date('2023-06-20').getTime() / 1000, type: 'image', content: 'image', isSelf: false },
        { platform: 'qq', messageId: '3', timestamp: new Date('2024-03-10').getTime() / 1000, type: 'text', content: 'qq message', isSelf: true }
      ];
      data.contacts = [
        { platform: 'wechat', chatId: 'c1', name: 'Friend1', msgCount: 2, isGroup: false },
        { platform: 'qq', chatId: 'c2', name: 'Friend2', msgCount: 1, isGroup: false }
      ];
      data.meta.platforms = ['wechat', 'qq'];
      data.meta.totalMessages = 3;
      data.meta.timeRange = {
        start: new Date('2023-01-15').getTime() / 1000,
        end: new Date('2024-03-10').getTime() / 1000
      };

      const stats = merger.generateStats(data);

      expect(stats.totalMessages).toBe(3);
      expect(stats.totalContacts).toBe(2);
      expect(stats.platforms).toEqual(['wechat', 'qq']);
      expect(stats.yearBreakdown).toBeDefined();
      expect(stats.monthlyActivity).toBeDefined();
      expect(stats.topContacts).toBeDefined();
      expect(stats.messageTypeBreakdown).toBeDefined();
      expect(stats.avgMessagesPerDay).toBeGreaterThanOrEqual(0);
      expect(stats.mostActiveHours).toBeDefined();
      expect(stats.selfMessageRatio).toBeDefined();
    });

    it('should calculate year breakdown correctly', () => {
      const data = createEmptyData();
      data.messages = [
        { platform: 'wechat', messageId: '1', timestamp: new Date('2022-05-01').getTime() / 1000, type: 'text', content: 'msg1' },
        { platform: 'wechat', messageId: '2', timestamp: new Date('2022-07-01').getTime() / 1000, type: 'text', content: 'msg2' },
        { platform: 'wechat', messageId: '3', timestamp: new Date('2023-01-01').getTime() / 1000, type: 'text', content: 'msg3' }
      ];
      data.meta.platforms = ['wechat'];
      data.meta.timeRange = { start: 0, end: 0 };

      const stats = merger.generateStats(data);

      expect(stats.yearBreakdown['2022']).toBe(2);
      expect(stats.yearBreakdown['2023']).toBe(1);
    });

    it('should calculate message type breakdown', () => {
      const data = createEmptyData();
      data.messages = [
        { platform: 'wechat', messageId: '1', timestamp: 1000, type: 'text', content: 'text' },
        { platform: 'wechat', messageId: '2', timestamp: 2000, type: 'image', content: 'image' },
        { platform: 'wechat', messageId: '3', timestamp: 3000, type: 'text', content: 'text2' }
      ];
      data.meta.platforms = ['wechat'];
      data.meta.timeRange = { start: 0, end: 0 };

      const stats = merger.generateStats(data);

      expect(stats.messageTypeBreakdown.text).toBe(2);
      expect(stats.messageTypeBreakdown.image).toBe(1);
    });

    it('should sort top contacts by msgCount', () => {
      const data = createEmptyData();
      data.contacts = [
        { platform: 'wechat', chatId: 'c1', name: 'Low', msgCount: 10, isGroup: false },
        { platform: 'wechat', chatId: 'c2', name: 'High', msgCount: 100, isGroup: false },
        { platform: 'wechat', chatId: 'c3', name: 'Medium', msgCount: 50, isGroup: false }
      ];
      data.meta.platforms = ['wechat'];
      data.meta.timeRange = { start: 0, end: 0 };

      const stats = merger.generateStats(data);

      expect(stats.topContacts[0].name).toBe('High');
      expect(stats.topContacts[1].name).toBe('Medium');
      expect(stats.topContacts[2].name).toBe('Low');
    });

    it('should handle empty data', () => {
      const data = createEmptyData();
      const stats = merger.generateStats(data);

      expect(stats.totalMessages).toBe(0);
      expect(stats.totalContacts).toBe(0);
      expect(stats.selfMessageRatio).toBe(0);
    });

    it('should calculate self message ratio', () => {
      const data = createEmptyData();
      data.messages = [
        { platform: 'wechat', messageId: '1', timestamp: 1000, type: 'text', content: 'a', isSelf: true },
        { platform: 'wechat', messageId: '2', timestamp: 2000, type: 'text', content: 'b', isSelf: true },
        { platform: 'wechat', messageId: '3', timestamp: 3000, type: 'text', content: 'c', isSelf: false }
      ];
      data.meta.platforms = ['wechat'];
      data.meta.timeRange = { start: 0, end: 0 };

      const stats = merger.generateStats(data);

      expect(parseFloat(stats.selfMessageRatio)).toBeCloseTo(0.667, 2);
    });
  });

  describe('sampleByYear', () => {
    it('should sample text messages by year', () => {
      const data = createEmptyData();
      
      const messages = [];
      for (let i = 0; i < 50; i++) {
        const d = new Date(Date.UTC(2023, 0, 1 + i));
        messages.push({
          platform: 'wechat',
          messageId: `2023-${i}`,
          timestamp: d.getTime() / 1000,
          type: 'text',
          content: `2023 message number ${i} with some content to make it long enough`
        });
      }
      for (let i = 0; i < 10; i++) {
        const d = new Date(Date.UTC(2024, 0, 1 + i));
        messages.push({
          platform: 'wechat',
          messageId: `2024-${i}`,
          timestamp: d.getTime() / 1000,
          type: 'text',
          content: `2024 message number ${i} with some content to make it long enough`
        });
      }
      data.messages = messages;

      const result = merger.sampleByYear(data, 20);

      expect(result['2023']).toBeDefined();
      expect(result['2024']).toBeDefined();
      expect(result['2023'].length).toBe(20);
      expect(result['2024'].length).toBe(10);
    });

    it('should only include text messages', () => {
      const data = createEmptyData();
      const base = new Date('2023-01-01').getTime() / 1000;
      data.messages = [
        { platform: 'wechat', messageId: '1', timestamp: base, type: 'text', content: 'text message content here' },
        { platform: 'wechat', messageId: '2', timestamp: base + 1000, type: 'image', content: 'image content' },
        { platform: 'wechat', messageId: '3', timestamp: base + 2000, type: 'text', content: 'another text message long enough' }
      ];

      const result = merger.sampleByYear(data, 100);

      expect(result['2023'].length).toBe(2);
      expect(result['2023'].every(m => m.type === 'text')).toBe(true);
    });

    it('should skip messages with content shorter than 5 characters', () => {
      const data = createEmptyData();
      const base = new Date('2023-01-01').getTime() / 1000;
      data.messages = [
        { platform: 'wechat', messageId: '1', timestamp: base, type: 'text', content: 'hi' },
        { platform: 'wechat', messageId: '2', timestamp: base + 1000, type: 'text', content: 'this is a longer message that should be included' }
      ];

      const result = merger.sampleByYear(data, 100);

      expect(result['2023'].length).toBe(1);
    });

    it('should handle empty data', () => {
      const data = createEmptyData();
      data.messages = [];

      const result = merger.sampleByYear(data);

      expect(Object.keys(result).length).toBe(0);
    });

    it('should use default perYear value of 100', () => {
      const data = createEmptyData();
      const messages = [];
      for (let i = 0; i < 200; i++) {
        const d = new Date(Date.UTC(2023, 0, 1 + Math.floor(i / 24), i % 24));
        messages.push({
          platform: 'wechat',
          messageId: `msg-${i}`,
          timestamp: d.getTime() / 1000,
          type: 'text',
          content: `Message number ${i} has enough content to pass the length check for sampling purposes`
        });
      }
      data.messages = messages;

      const result = merger.sampleByYear(data);

      expect(result['2023'].length).toBe(100);
    });
  });
});
