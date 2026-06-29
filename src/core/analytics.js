const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '你', '他', '她', '它', '们', '这', '那',
  '有', '和', '与', '等', '就', '都', '而', '及', '之', '或', '一个',
  '没有', '我们', '你们', '他们', '她们', '它们', '这个', '那个',
  '什么', '怎么', '为什么', '哪', '哪里', '谁', '多少', '几',
  '啊', '哦', '嗯', '呀', '吧', '呢', '吗', '哈', '哈哈', '嘿嘿',
  '可以', '好的', '不是', '还是', '但是', '因为', '所以', '如果',
  '然后', '现在', '已经', '一直', '一起', '一下', '一样', '一点'
]);

const POSITIVE_WORDS = [
  '好', '爱', '喜欢', '开心', '快乐', '幸福', '棒', '赞', '美',
  '不错', '加油', '谢谢', '感谢', '优秀', '厉害', '完美', '精彩',
  '温暖', '感动', '惊喜', '舒服', '满足', '愉快', '轻松', '顺利',
  '希望', '期待', '热爱', '美好', '甜蜜', '温馨', '和蔼', '亲切'
];

const NEGATIVE_WORDS = [
  '难过', '伤心', '痛苦', '讨厌', '恨', '累', '烦', '哭', '失望',
  '绝望', '悲伤', '郁闷', '生气', '愤怒', '糟糕', '可怕', '恐惧',
  '焦虑', '担忧', '疲惫', '孤独', '寂寞', '沮丧', '后悔', '遗憾',
  '难过', '心痛', '委屈', '无奈', '压力', '疲惫', '烦躁', '忧伤'
];

const CATEGORY_SELF = '自己';
const CATEGORY_FAMILY = '家人';
const CATEGORY_FRIEND = '好友';
const CATEGORY_NORMAL = '普通朋友';
const CATEGORY_GROUP = '群聊';

const FAMILY_KEYWORDS = ['爸', '妈', '哥', '姐', '弟', '妹', '爷', '奶', '外公', '外婆', '爸', '妈', '父亲', '母亲', '家人', '老婆', '老公', '媳妇', '丈夫', '妻子'];

export class DataAnalytics {
  generateWordCloud(messages, topN = 100) {
    if (!messages || messages.length === 0) {
      return [];
    }

    const wordCount = new Map();
    const textMessages = messages.filter(m => m.type === 'text' && m.content);

    for (const msg of textMessages) {
      const words = this._segmentChinese(msg.content);
      for (const word of words) {
        if (STOP_WORDS.has(word) || word.length < 2) continue;
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    }

    const result = [];
    for (const [word, count] of wordCount) {
      result.push({ word, count });
    }

    result.sort((a, b) => b.count - a.count);
    return result.slice(0, topN);
  }

  _segmentChinese(text) {
    const result = [];
    const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ');
    const parts = cleaned.split(/\s+/).filter(s => s.length > 0);

    for (const part of parts) {
      if (/^[a-zA-Z0-9]+$/.test(part)) {
        result.push(part.toLowerCase());
      } else {
        const bigrams = this._extractBigrams(part);
        result.push(...bigrams);
      }
    }

    return result;
  }

  _extractBigrams(text) {
    const result = [];
    for (let i = 0; i < text.length - 1; i++) {
      result.push(text.substring(i, i + 2));
    }
    return result;
  }

  analyzeSentiment(messages) {
    if (!messages || messages.length === 0) {
      return {
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        sentimentScore: 0,
        byYear: []
      };
    }

    const textMessages = messages.filter(m => m.type === 'text' && m.content);
    let positiveCount = 0;
    let negativeCount = 0;
    const yearMap = new Map();

    for (const msg of textMessages) {
      const score = this._calculateSentiment(msg.content);
      const year = new Date(msg.timestamp * 1000).getFullYear();

      if (score > 0) positiveCount++;
      else if (score < 0) negativeCount++;

      if (!yearMap.has(year)) {
        yearMap.set(year, { positive: 0, negative: 0, total: 0 });
      }
      const yearData = yearMap.get(year);
      yearData.total++;
      if (score > 0) yearData.positive++;
      else if (score < 0) yearData.negative++;
    }

    const neutralCount = textMessages.length - positiveCount - negativeCount;
    const total = textMessages.length || 1;
    const sentimentScore = (positiveCount - negativeCount) / total;

    const byYear = [];
    for (const [year, data] of yearMap) {
      const yearScore = data.total > 0 ? (data.positive - data.negative) / data.total : 0;
      byYear.push({ year, score: yearScore });
    }
    byYear.sort((a, b) => a.year - b.year);

    return {
      positiveCount,
      negativeCount,
      neutralCount,
      sentimentScore,
      byYear
    };
  }

  _calculateSentiment(text) {
    let score = 0;
    for (const word of POSITIVE_WORDS) {
      const matches = text.match(new RegExp(word, 'g'));
      if (matches) score += matches.length;
    }
    for (const word of NEGATIVE_WORDS) {
      const matches = text.match(new RegExp(word, 'g'));
      if (matches) score -= matches.length;
    }
    return score;
  }

  analyzeSchedule(messages) {
    if (!messages || messages.length === 0) {
      return {
        hourlyDistribution: {},
        isNightOwl: false,
        mostActiveHour: 0,
        lateNightRatio: 0
      };
    }

    const hourlyDistribution = {};
    for (let i = 0; i < 24; i++) {
      hourlyDistribution[i] = 0;
    }

    for (const msg of messages) {
      const hour = new Date(msg.timestamp * 1000).getHours();
      hourlyDistribution[hour]++;
    }

    const total = messages.length;
    let lateNightCount = 0;
    for (let h = 23; h <= 23; h++) lateNightCount += hourlyDistribution[h];
    for (let h = 0; h <= 5; h++) lateNightCount += hourlyDistribution[h];

    const lateNightRatio = total > 0 ? lateNightCount / total : 0;
    const isNightOwl = lateNightRatio > 0.3;

    let mostActiveHour = 0;
    let maxCount = 0;
    for (let i = 0; i < 24; i++) {
      if (hourlyDistribution[i] > maxCount) {
        maxCount = hourlyDistribution[i];
        mostActiveHour = i;
      }
    }

    return {
      hourlyDistribution,
      isNightOwl,
      mostActiveHour,
      lateNightRatio
    };
  }

  analyzeRelationships(data) {
    if (!data || !data.contacts || data.contacts.length === 0) {
      return {
        nodes: [],
        links: [],
        categories: [
          { name: CATEGORY_SELF },
          { name: CATEGORY_FAMILY },
          { name: CATEGORY_FRIEND },
          { name: CATEGORY_NORMAL },
          { name: CATEGORY_GROUP }
        ]
      };
    }

    const categories = [
      { name: CATEGORY_SELF },
      { name: CATEGORY_FAMILY },
      { name: CATEGORY_FRIEND },
      { name: CATEGORY_NORMAL },
      { name: CATEGORY_GROUP }
    ];

    const nodes = [];
    const links = [];

    nodes.push({
      name: '我',
      category: 0,
      value: data.messages.length,
      symbolSize: 60
    });

    const sortedContacts = [...data.contacts].sort((a, b) => b.msgCount - a.msgCount);
    const topContacts = sortedContacts.slice(0, 30);

    const maxMsgCount = Math.max(...topContacts.map(c => c.msgCount), 1);

    for (const contact of topContacts) {
      const category = this._categorizeContact(contact);
      const categoryIndex = this._getCategoryIndex(category);
      const size = 20 + (contact.msgCount / maxMsgCount) * 40;

      nodes.push({
        name: contact.name,
        category: categoryIndex,
        value: contact.msgCount,
        symbolSize: Math.round(size)
      });

      links.push({
        source: '我',
        target: contact.name,
        value: contact.msgCount
      });
    }

    return { nodes, links, categories };
  }

  _categorizeContact(contact) {
    if (contact.isGroup) return CATEGORY_GROUP;

    const name = contact.name || '';
    for (const keyword of FAMILY_KEYWORDS) {
      if (name.includes(keyword)) return CATEGORY_FAMILY;
    }

    if (contact.msgCount > 100) return CATEGORY_FRIEND;
    return CATEGORY_NORMAL;
  }

  _getCategoryIndex(category) {
    const map = {
      [CATEGORY_SELF]: 0,
      [CATEGORY_FAMILY]: 1,
      [CATEGORY_FRIEND]: 2,
      [CATEGORY_NORMAL]: 3,
      [CATEGORY_GROUP]: 4
    };
    return map[category] !== undefined ? map[category] : 3;
  }

  generateAdvancedStats(data) {
    if (!data || !data.messages) {
      return {
        wordCloud: [],
        sentiment: {
          positiveCount: 0,
          negativeCount: 0,
          neutralCount: 0,
          sentimentScore: 0,
          byYear: []
        },
        schedule: {
          hourlyDistribution: {},
          isNightOwl: false,
          mostActiveHour: 0,
          lateNightRatio: 0
        },
        relationships: {
          nodes: [],
          links: [],
          categories: []
        }
      };
    }

    return {
      wordCloud: this.generateWordCloud(data.messages, 100),
      sentiment: this.analyzeSentiment(data.messages),
      schedule: this.analyzeSchedule(data.messages),
      relationships: this.analyzeRelationships(data)
    };
  }
}
