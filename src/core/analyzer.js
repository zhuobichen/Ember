/**
 * AI 分析引擎 - 从聊天记录中提取人生画像并生成纪念碑
 *
 * 分层分析策略（避免 token 超限）:
 * 1. 统计层: 联系热力图、年度分布、活跃时段
 * 2. 抽样层: 每年抽取代表性消息
 * 3. 分析层: AI 提取人生画像、关系、轨迹
 * 4. 生成层: AI 生成纪念碑（诗/散文/独白/人生记录）
 *
 * 支持 DeepSeek 和 Claude API
 */

import { DataMerger } from './merge.js';

export class MonumentAnalyzer {
  constructor(options = {}) {
    this.apiProvider = options.provider || 'deepseek'; // deepseek | claude
    this.apiKey = options.apiKey || process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY;
    this.apiUrl = options.apiUrl || this._getApiUrl();
    this.model = options.model || this._getDefaultModel();
    this.merger = new DataMerger();
  }

  _getApiUrl() {
    if (this.apiProvider === 'claude') {
      return 'https://api.anthropic.com/v1/messages';
    }
    return 'https://api.deepseek.com/v1/chat/completions';
  }

  _getDefaultModel() {
    if (this.apiProvider === 'claude') return 'claude-sonnet-4-5-20250514';
    return 'deepseek-chat';
  }

  /**
   * 完整分析流程
   * @param {UnifiedData} data - 统一格式的聊天数据
   * @returns {Object} 纪念碑数据 { epitaph, trajectory, relationships, keywords, stats }
   */
  async analyze(data) {
    console.log('[分析] 开始处理数据...');

    // 第1层：统计
    const stats = this.merger.generateStats(data);
    console.log(`[分析] 统计完成: ${stats.totalMessages} 条消息, ${stats.totalContacts} 个联系人`);

    // 第2层：抽样
    const yearlySamples = this.merger.sampleByYear(data, 80);
    console.log(`[分析] 抽样完成: ${Object.keys(yearlySamples).length} 个年度`);

    // 保存原始数据供模拟模式使用
    this._rawData = data;
    this._stats = stats;
    this._yearlySamples = yearlySamples;

    // 第3层：人生画像分析
    const profile = await this._analyzeProfile(stats, yearlySamples);
    console.log('[分析] 人生画像生成完成');

    // 第4层：纪念碑生成
    const epitaph = await this._generateEpitaph(stats, yearlySamples, profile);
    console.log('[分析] 纪念碑生成完成');

    return {
      meta: {
        generatedAt: new Date().toISOString(),
        platforms: data.meta.platforms,
        totalMessages: stats.totalMessages,
        timeRange: data.meta.timeRange
      },
      epitaph: epitaph,
      trajectory: profile.trajectory || [],
      relationships: profile.relationships || [],
      keywords: profile.keywords || [],
      stats: {
        totalMessages: stats.totalMessages,
        totalContacts: stats.totalContacts,
        yearBreakdown: stats.yearBreakdown,
        avgMessagesPerDay: stats.avgMessagesPerDay,
        selfMessageRatio: stats.selfMessageRatio
      }
    };
  }

  /**
   * 第3层：AI 提取人生画像
   */
  async _analyzeProfile(stats, yearlySamples) {
    const prompt = this._buildProfilePrompt(stats, yearlySamples);

    const response = await this._callAI(prompt);
    return this._parseJSON(response);
  }

  /**
   * 第4层：AI 生成纪念碑正文
   * 形式不限：诗、散文、独白、或单纯记录人生经历
   */
  async _generateEpitaph(stats, yearlySamples, profile) {
    const prompt = `你是一位人生记录者。以下是一个人的人生画像和聊天记录摘要。

请基于这些内容，为这个人写一座"人生纪念碑"。

要求：
1. 形式不限——可以是一首诗、一篇散文、一段独白，或只是平静地记录经历过的事
2. 根据这个人的聊天风格和人生轨迹，选择最适合的表达方式
3. 不要编造没有的内容，只基于提供的素材
4. 要有温度，但不要煽情
5. 800-1500字
6. 直接输出正文内容，不要加标题、不要加解释

=== 人生画像 ===
${JSON.stringify(profile, null, 2)}

=== 统计数据 ===
- 总消息数: ${stats.totalMessages}
- 联系人数: ${stats.totalContacts}
- 活跃年份: ${Object.keys(stats.yearBreakdown).join(', ')}
- 日均消息: ${stats.avgMessagesPerDay}
- 自己发言比例: ${stats.selfMessageRatio}

=== 年度消息摘要 ===
${this._formatYearlySamples(yearlySamples)}`;

    return await this._callAI(prompt);
  }

  /**
   * 构建人生画像分析的 Prompt
   */
  _buildProfilePrompt(stats, yearlySamples) {
    return `你是一位人生记录分析师。请分析以下一个人的聊天记录统计数据和年度消息抽样，提取他的人生画像。

请以 JSON 格式输出，包含以下字段：

{
  "personality": ["性格特征1", "性格特征2", ...],
  "trajectory": [
    { "year": 2020, "summary": "这一年的经历概述" },
    ...
  ],
  "relationships": [
    { "name": "匿名", "role": "关系类型(如最常聊天的人/重要朋友/家人)", "intimacy": 0.0-1.0 }
  ],
  "keywords": [
    { "year": 2020, "words": ["关键词1", "关键词2", "关键词3"] }
  ],
  "lifeThemes": ["人生主题1", "人生主题2"],
  "communicationStyle": "沟通风格描述"
}

要求：
1. 只基于提供的数据，不要编造
2. 联系人名字用"匿名"或角色描述，不用真实名字
3. trajectory 按年份排列，每年1-3句概述
4. relationships 最多5个，按亲密度排序
5. keywords 每年3-5个关键词

=== 统计数据 ===
${JSON.stringify(stats, null, 2)}

=== 年度消息抽样 ===
${this._formatYearlySamples(yearlySamples)}`;
  }

  /**
   * 格式化年度抽样消息
   */
  _formatYearlySamples(yearlySamples) {
    const parts = [];
    for (const [year, msgs] of Object.entries(yearlySamples)) {
      parts.push(`\n--- ${year}年 (${msgs.length}条抽样) ---`);
      // 每年最多展示30条，避免 prompt 太长
      const sample = msgs.slice(0, 30);
      for (const msg of sample) {
        const date = new Date(msg.timestamp * 1000).toLocaleDateString('zh-CN');
        const sender = msg.isSelf ? '我' : msg.sender;
        parts.push(`[${date}] ${sender}: ${msg.content}`);
      }
    }
    return parts.join('\n');
  }

  /**
   * 调用 AI API
   */
  async _callAI(prompt) {
    if (!this.apiKey) {
      console.warn('[AI] 未配置 API Key，返回模拟结果');
      return this._mockResponse(prompt);
    }

    if (this.apiProvider === 'claude') {
      return await this._callClaude(prompt);
    }
    return await this._callDeepSeek(prompt);
  }

  /**
   * 调用 DeepSeek API
   */
  async _callDeepSeek(prompt) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`DeepSeek API 错误: ${response.status} ${response.statusText}${errText ? ' - ' + errText.substring(0, 200) : ''}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('DeepSeek API 返回异常结构: ' + JSON.stringify(data).substring(0, 200));
    }
    return data.choices[0].message.content;
  }

  /**
   * 调用 Claude API
   */
  async _callClaude(prompt) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Claude API 错误: ${response.status} ${response.statusText}${errText ? ' - ' + errText.substring(0, 200) : ''}`);
    }

    const data = await response.json();
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Claude API 返回异常结构: ' + JSON.stringify(data).substring(0, 200));
    }
    return data.content[0].text;
  }

  /**
   * 解析 JSON（容错处理）
   */
  _parseJSON(text) {
    try {
      // 尝试提取 JSON 块
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ||
                        text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      return JSON.parse(jsonStr);
    } catch {
      console.warn('[AI] JSON 解析失败，返回空结构');
      return {
        personality: [],
        trajectory: [],
        relationships: [],
        keywords: [],
        lifeThemes: [],
        communicationStyle: ''
      };
    }
  }

  /**
   * 无 API Key 时的模拟响应（基于实际数据生成，用于开发测试）
   */
  _mockResponse(prompt) {
    const stats = this._stats;
    const yearlySamples = this._yearlySamples;
    const data = this._rawData;

    if (!stats || !yearlySamples) {
      return '{}';
    }

    // 判断是画像分析还是碑文生成
    if (prompt.includes('人生记录分析师')) {
      return this._generateSmartProfile(stats, yearlySamples, data);
    }

    // 碑文生成
    return this._generateSmartEpitaph(stats, yearlySamples, data);
  }

  /**
   * 基于实际数据生成人生画像
   */
  _generateSmartProfile(stats, yearlySamples, data) {
    const years = Object.keys(stats.yearBreakdown).map(Number).sort((a, b) => a - b);

    // 构建人生轨迹
    const trajectory = [];
    for (const year of years) {
      const msgs = yearlySamples[year] || [];
      if (msgs.length === 0) continue;

      // 提取该年度关键内容
      const selfMsgs = msgs.filter(m => m.isSelf);
      const otherMsgs = msgs.filter(m => !m.isSelf);
      const allContent = msgs.map(m => m.content).join(' ');

      // 生成年度摘要
      let summary = '';
      if (selfMsgs.length > 0) {
        // 取最长的自述消息作为线索
        const longest = selfMsgs.reduce((a, b) => a.content.length > b.content.length ? a : b);
        const title = longest.content.split('\n')[0].replace(/《/g, '').replace(/》/g, '');
        summary = `${year}年：${title.substring(0, 40)}${title.length > 40 ? '...' : ''}`;
        if (otherMsgs.length > 0) {
          summary += `（与${otherMsgs[0].sender}等互动）`;
        }
      } else if (otherMsgs.length > 0) {
        summary = `${year}年：${otherMsgs[0].sender}记录——${otherMsgs[0].content.substring(0, 40)}...`;
      }
      if (summary) trajectory.push({ year, summary });
    }

    // 构建关系网络
    const relationships = (data.contacts || [])
      .sort((a, b) => b.msgCount - a.msgCount)
      .slice(0, 6)
      .map(c => ({
        name: c.name,
        role: c.msgCount > 10 ? '至交好友' : c.msgCount > 5 ? '重要友人' : '相识之人',
        intimacy: Math.min(1, c.msgCount / 20)
      }));

    // 构建关键词
    const keywords = [];
    for (const year of years.slice(0, 15)) {
      const msgs = yearlySamples[year] || [];
      const words = this._extractKeywords(msgs);
      if (words.length > 0) {
        keywords.push({ year, words: words.slice(0, 5) });
      }
    }

    // 提取人生主题
    const allContent = (data.messages || []).map(m => m.content).join(' ');
    const lifeThemes = this._extractLifeThemes(allContent);

    return JSON.stringify({
      personality: this._guessPersonality(allContent),
      trajectory,
      relationships,
      keywords,
      lifeThemes,
      communicationStyle: this._guessCommStyle(data)
    });
  }

  /**
   * 从消息中提取关键词
   */
  _extractKeywords(msgs) {
    const text = msgs.map(m => m.content).join(' ');
    const words = [];

    // 提取书名号内容
    const titles = text.match(/《[^》]+》/g);
    if (titles) {
      for (const t of titles.slice(0, 3)) {
        words.push(t.replace(/《|》/g, ''));
      }
    }

    // 高频词
    const freqWords = ['酒', '月', '剑', '游', '愁', '归', '梦', '仙', '诗', '友',
      '工作', '生活', '搬家', '加油', '周末', '吃饭', '晚安',
      '长安', '江湖', '天涯', '故乡', '山水', '自由', '理想'];
    for (const w of freqWords) {
      if (text.includes(w) && !words.includes(w)) {
        words.push(w);
      }
      if (words.length >= 5) break;
    }

    return words;
  }

  /**
   * 提取人生主题
   */
  _extractLifeThemes(text) {
    const themes = [];
    if (text.includes('酒') || text.includes('醉')) themes.push('饮酒寄情');
    if (text.includes('月') || text.includes('明月')) themes.push('月下独思');
    if (text.includes('友') || text.includes('送') || text.includes('别')) themes.push('友情离别');
    if (text.includes('游') || text.includes('山') || text.includes('水')) themes.push('山水漫游');
    if (text.includes('愁') || text.includes('悲') || text.includes('泪')) themes.push('忧思悲怀');
    if (text.includes('剑') || text.includes('侠')) themes.push('剑客豪情');
    if (text.includes('仙') || text.includes('鹏') || text.includes('天')) themes.push('仙风道骨');
    if (text.includes('故') || text.includes('乡') || text.includes('归')) themes.push('思乡之情');
    if (text.includes('理想') || text.includes('志') || text.includes('济')) themes.push('理想抱负');
    if (themes.length === 0) themes.push('人生百味', '岁月如歌');
    return themes;
  }

  /**
   * 猜测性格特征
   */
  _guessPersonality(text) {
    const traits = [];
    if (text.includes('酒') && text.includes('月')) traits.push('豪放不羁');
    if (text.includes('愁') || text.includes('悲')) traits.push('多愁善感');
    if (text.includes('剑') || text.includes('侠')) traits.push('侠骨柔情');
    if (text.includes('仙') || text.includes('鹏')) traits.push('超然物外');
    if (text.includes('友') || text.includes('送')) traits.push('重情重义');
    if (text.includes('山') || text.includes('水')) traits.push('热爱自然');
    if (text.includes('安能') || text.includes('不屈') || text.includes('不肯')) traits.push('傲骨铮铮');
    if (traits.length === 0) traits.push('真实自然', '认真生活');
    return traits.slice(0, 5);
  }

  /**
   * 猜测沟通风格
   */
  _guessCommStyle(data) {
    const selfMsgs = (data.messages || []).filter(m => m.isSelf);
    const avgLen = selfMsgs.length > 0
      ? selfMsgs.reduce((s, m) => s + m.content.length, 0) / selfMsgs.length
      : 0;

    if (avgLen > 100) return '长篇抒怀，气势磅礴';
    if (avgLen > 50) return '言之有物，情感充沛';
    if (avgLen > 20) return '简洁有力，点到即止';
    return '惜字如金，意在不言';
  }

  /**
   * 基于实际数据生成碑文
   */
  _generateSmartEpitaph(stats, yearlySamples, data) {
    const years = Object.keys(stats.yearBreakdown).map(Number).sort((a, b) => a - b);
    const allMsgs = data.messages || [];
    const selfMsgs = allMsgs.filter(m => m.isSelf);
    const otherMsgs = allMsgs.filter(m => !m.isSelf);

    // 提取代表性诗句/语录
    const works = selfMsgs
      .filter(m => m.content.includes('《'))
      .map(m => {
        const lines = m.content.split('\n');
        const title = lines[0].match(/《[^》]+》/)?.[0] || '';
        const body = lines.slice(1).join(' ').substring(0, 60);
        return { title, body, year: new Date(m.timestamp * 1000).getFullYear() };
      })
      .slice(0, 8);

    // 提取友人评价
    const evaluations = otherMsgs
      .filter(m => m.type === 'text' && m.content.length > 20 && m.sender !== '史官')
      .slice(-5);

    // 提取史料记载
    const histories = otherMsgs
      .filter(m => m.sender === '史官' || m.type === 'system')
      .slice(0, 5);

    // 构建碑文
    const parts = [];

    // 开篇：时间跨度
    const startYear = years[0];
    const endYear = years[years.length - 1];
    parts.push(`这是一个人的一生。`);
    parts.push(`从${startYear}年到${endYear}年，跨越${endYear - startYear}年光阴。`);
    parts.push(`${stats.totalMessages}条记录，${stats.totalContacts}个与他有过交集的人。`);
    parts.push('');

    // 人生轨迹
    if (histories.length > 0) {
      parts.push('—— 生平 ——');
      for (const h of histories.slice(0, 4)) {
        const content = h.content.replace(/【[^】]+】/g, '').trim();
        parts.push(content.substring(0, 80) + (content.length > 80 ? '...' : ''));
      }
      parts.push('');
    }

    // 代表作
    if (works.length > 0) {
      parts.push('—— 他写下的 ——');
      for (const work of works.slice(0, 5)) {
        parts.push(`${work.title}（${work.year}年）`);
        if (work.body) parts.push(`  ${work.body}...`);
      }
      parts.push('');
    }

    // 友人
    const friends = (data.contacts || [])
      .filter(c => c.name !== '创作记录' && c.name !== '史料记载' && c.name !== '后人评价' && c.name !== '书信文书' && c.name !== '生活轶事')
      .sort((a, b) => b.msgCount - a.msgCount)
      .slice(0, 5);

    if (friends.length > 0) {
      parts.push('—— 与他同行的人 ——');
      for (const f of friends) {
        parts.push(`${f.name}：${f.msgCount}次往来`);
      }
      parts.push('');
    }

    // 后人评价
    if (evaluations.length > 0) {
      parts.push('—— 别人眼中的他 ——');
      for (const e of evaluations.slice(0, 3)) {
        const content = e.content.replace(/《[^》]+》/g, '').trim();
        parts.push(`${e.sender}：${content.substring(0, 60)}${content.length > 60 ? '...' : ''}`);
      }
      parts.push('');
    }

    // 结语
    parts.push('——');
    parts.push('如果有人路过这座碑，');
    parts.push('请知道：这里有一个人，认真地活过、写过、爱过。');
    parts.push(`他的${stats.totalMessages}条记录，是留给世界最后的礼物。`);

    return parts.join('\n');
  }
}
