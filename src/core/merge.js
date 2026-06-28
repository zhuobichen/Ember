/**
 * 数据合并模块 - 将多个平台的数据合并为统一数据集
 *
 * 功能:
 * 1. 合并多个平台的消息和联系人
 * 2. 按时间排序
 * 3. 去重（跨平台可能存在的重复消息）
 * 4. 生成统计摘要
 */

import { createEmptyData, updateMeta, MESSAGE_TYPES } from './schema.js';

export class DataMerger {
  /**
   * 合并多个平台的数据
   * @param {UnifiedData[]} dataList - 各平台的标准数据
   * @returns {UnifiedData} 合并后的数据
   */
  merge(dataList) {
    const result = createEmptyData();

    for (const data of dataList) {
      // 合并消息
      result.messages.push(...data.messages);

      // 合并联系人
      result.contacts.push(...data.contacts);
    }

    // 去重（基于平台+消息ID）
    result.messages = this._deduplicate(result.messages);

    // 按时间排序
    result.messages.sort((a, b) => a.timestamp - b.timestamp);

    // 联系人去重（同名不同平台保留）
    result.contacts = this._deduplicateContacts(result.contacts);

    // 更新元信息
    updateMeta(result);

    return result;
  }

  /**
   * 消息去重
   */
  _deduplicate(messages) {
    const seen = new Set();
    return messages.filter(msg => {
      const key = `${msg.platform}:${msg.messageId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * 联系人去重
   */
  _deduplicateContacts(contacts) {
    const seen = new Set();
    const result = [];
    for (const c of contacts) {
      const key = `${c.platform}:${c.chatId}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(c);
      }
    }
    return result;
  }

  /**
   * 生成数据统计摘要（供 AI 分析使用）
   * @param {UnifiedData} data
   * @returns {Object} 统计摘要
   */
  generateStats(data) {
    const stats = {
      totalMessages: data.messages.length,
      totalContacts: data.contacts.length,
      platforms: data.meta.platforms,
      timeRange: data.meta.timeRange,
      yearBreakdown: {},
      monthlyActivity: {},
      topContacts: [],
      messageTypeBreakdown: {},
      avgMessagesPerDay: 0,
      mostActiveHours: {},
      selfMessageRatio: 0
    };

    // 按年统计
    for (const msg of data.messages) {
      const year = new Date(msg.timestamp * 1000).getFullYear();
      stats.yearBreakdown[year] = (stats.yearBreakdown[year] || 0) + 1;

      const month = new Date(msg.timestamp * 1000).getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      stats.monthlyActivity[monthKey] = (stats.monthlyActivity[monthKey] || 0) + 1;

      const hour = new Date(msg.timestamp * 1000).getHours();
      stats.mostActiveHours[hour] = (stats.mostActiveHours[hour] || 0) + 1;

      stats.messageTypeBreakdown[msg.type] = (stats.messageTypeBreakdown[msg.type] || 0) + 1;
    }

    // 活跃联系人 Top 10
    stats.topContacts = [...data.contacts]
      .sort((a, b) => b.msgCount - a.msgCount)
      .slice(0, 10)
      .map(c => ({
        name: c.name,
        platform: c.platform,
        msgCount: c.msgCount,
        isGroup: c.isGroup
      }));

    // 日均消息数
    if (data.meta.timeRange.start && data.meta.timeRange.end) {
      const days = Math.max(1, (data.meta.timeRange.end - data.meta.timeRange.start) / 86400);
      stats.avgMessagesPerDay = Math.round(data.messages.length / days);
    }

    // 自己发的消息比例
    const selfMsgs = data.messages.filter(m => m.isSelf).length;
    stats.selfMessageRatio = data.messages.length > 0
      ? (selfMsgs / data.messages.length).toFixed(3)
      : 0;

    return stats;
  }

  /**
   * 按年度抽样关键消息（供 AI 分析，避免 token 超限）
   * @param {UnifiedData} data
   * @param {number} perYear - 每年抽样数量
   * @returns {Object} { 2020: [msg, ...], 2021: [...] }
   */
  sampleByYear(data, perYear = 100) {
    const yearMap = {};

    // 按年分组
    for (const msg of data.messages) {
      if (msg.type !== MESSAGE_TYPES.TEXT) continue; // 只抽样文本
      if (!msg.content || msg.content.length < 5) continue; // 跳过太短的消息

      const year = new Date(msg.timestamp * 1000).getFullYear();
      if (!yearMap[year]) yearMap[year] = [];
      yearMap[year].push(msg);
    }

    // 每年抽样
    const result = {};
    for (const [year, msgs] of Object.entries(yearMap)) {
      if (msgs.length <= perYear) {
        result[year] = msgs;
      } else {
        // 按内容长度和多样性抽样：优先选择较长、有代表性的消息
        const sorted = msgs
          .map(m => ({ msg: m, score: this._messageScore(m) }))
          .sort((a, b) => b.score - a.score);

        // 均匀采样
        const step = Math.floor(sorted.length / perYear);
        result[year] = [];
        for (let i = 0; i < perYear; i++) {
          result[year].push(sorted[i * step].msg);
        }
      }
    }

    return result;
  }

  /**
   * 消息评分（用于抽样选择）
   * 优先选择：内容较长、非纯表情、有情感价值的消息
   */
  _messageScore(msg) {
    let score = 0;
    score += Math.min(msg.content.length, 100) * 0.3; // 长度分
    score += (msg.content.match(/[？?！!]/g) || []).length * 2; // 情感标点
    score += (msg.content.match(/[我你他她它]/g) || []).length * 1.5; // 人称代词
    score -= (msg.content.match(/^[哈嘿哦嗯]+$/) ? 50 : 0); // 纯语气词扣分
    return score;
  }
}
