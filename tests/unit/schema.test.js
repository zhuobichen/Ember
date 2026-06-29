import { describe, it, expect } from 'vitest';
import { createEmptyData, updateMeta, MESSAGE_TYPES, PLATFORMS } from '../../src/core/schema.js';

describe('schema', () => {
  describe('MESSAGE_TYPES', () => {
    it('should contain all expected message type constants', () => {
      expect(MESSAGE_TYPES.TEXT).toBe('text');
      expect(MESSAGE_TYPES.IMAGE).toBe('image');
      expect(MESSAGE_TYPES.VOICE).toBe('voice');
      expect(MESSAGE_TYPES.VIDEO).toBe('video');
      expect(MESSAGE_TYPES.LINK).toBe('link');
      expect(MESSAGE_TYPES.SYSTEM).toBe('system');
      expect(MESSAGE_TYPES.EMOJI).toBe('emoji');
      expect(MESSAGE_TYPES.FILE).toBe('file');
      expect(MESSAGE_TYPES.UNKNOWN).toBe('unknown');
    });
  });

  describe('PLATFORMS', () => {
    it('should contain all expected platform constants', () => {
      expect(PLATFORMS.WECHAT).toBe('wechat');
      expect(PLATFORMS.QQ).toBe('qq');
      expect(PLATFORMS.FEISHU).toBe('feishu');
      expect(PLATFORMS.TELEGRAM).toBe('telegram');
      expect(PLATFORMS.DISCORD).toBe('discord');
      expect(PLATFORMS.WEIBO).toBe('weibo');
      expect(PLATFORMS.WEB).toBe('web');
      expect(PLATFORMS.SOCIAL).toBe('social');
      expect(PLATFORMS.MEDIA).toBe('media');
      expect(PLATFORMS.BOOK).toBe('book');
    });
  });

  describe('createEmptyData', () => {
    it('should create an empty data structure with correct shape', () => {
      const data = createEmptyData();
      
      expect(data).toBeDefined();
      expect(data.meta).toBeDefined();
      expect(data.messages).toBeInstanceOf(Array);
      expect(data.contacts).toBeInstanceOf(Array);
      
      expect(data.messages.length).toBe(0);
      expect(data.contacts.length).toBe(0);
      
      expect(data.meta.generatedAt).toBeDefined();
      expect(typeof data.meta.generatedAt).toBe('string');
      expect(data.meta.platforms).toEqual([]);
      expect(data.meta.totalMessages).toBe(0);
      expect(data.meta.timeRange).toEqual({ start: 0, end: 0 });
    });

    it('should generate valid ISO date string for generatedAt', () => {
      const data = createEmptyData();
      const date = new Date(data.meta.generatedAt);
      expect(date.toString()).not.toBe('Invalid Date');
      expect(data.meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return a new object each time', () => {
      const data1 = createEmptyData();
      const data2 = createEmptyData();
      expect(data1).not.toBe(data2);
      expect(data1.meta).not.toBe(data2.meta);
      expect(data1.messages).not.toBe(data2.messages);
    });
  });

  describe('updateMeta', () => {
    it('should update totalMessages from messages array', () => {
      const data = createEmptyData();
      data.messages = [
        { platform: 'wechat', messageId: '1', timestamp: 1000 },
        { platform: 'wechat', messageId: '2', timestamp: 2000 }
      ];
      
      updateMeta(data);
      expect(data.meta.totalMessages).toBe(2);
    });

    it('should extract unique platforms from messages', () => {
      const data = createEmptyData();
      data.messages = [
        { platform: 'wechat', messageId: '1', timestamp: 1000 },
        { platform: 'qq', messageId: '2', timestamp: 2000 },
        { platform: 'wechat', messageId: '3', timestamp: 3000 }
      ];
      
      updateMeta(data);
      expect(data.meta.platforms).toEqual(expect.arrayContaining(['wechat', 'qq']));
      expect(data.meta.platforms.length).toBe(2);
    });

    it('should calculate correct time range', () => {
      const data = createEmptyData();
      data.messages = [
        { platform: 'wechat', messageId: '1', timestamp: 1000 },
        { platform: 'wechat', messageId: '2', timestamp: 5000 },
        { platform: 'wechat', messageId: '3', timestamp: 3000 }
      ];
      
      updateMeta(data);
      expect(data.meta.timeRange.start).toBe(1000);
      expect(data.meta.timeRange.end).toBe(5000);
    });

    it('should handle empty messages array', () => {
      const data = createEmptyData();
      data.messages = [];
      
      updateMeta(data);
      expect(data.meta.totalMessages).toBe(0);
      expect(data.meta.platforms).toEqual([]);
      expect(data.meta.timeRange.start).toBe(0);
      expect(data.meta.timeRange.end).toBe(0);
    });

    it('should handle single message', () => {
      const data = createEmptyData();
      data.messages = [
        { platform: 'wechat', messageId: '1', timestamp: 42000 }
      ];
      
      updateMeta(data);
      expect(data.meta.totalMessages).toBe(1);
      expect(data.meta.platforms).toEqual(['wechat']);
      expect(data.meta.timeRange.start).toBe(42000);
      expect(data.meta.timeRange.end).toBe(42000);
    });

    it('should return the modified data object', () => {
      const data = createEmptyData();
      const result = updateMeta(data);
      expect(result).toBe(data);
    });
  });
});
