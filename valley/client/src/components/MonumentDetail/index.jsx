import React from 'react';
import { MonumentEpitaph } from './MonumentEpitaph.jsx';
import { TrajectoryTimeline } from './TrajectoryTimeline.jsx';
import { RelationshipGraph } from './RelationshipGraph.jsx';
import { KeywordCloud } from './KeywordCloud.jsx';
import { SentimentChart } from './SentimentChart.jsx';
import { ScheduleChart } from './ScheduleChart.jsx';
import { StatsCards } from './StatsCards.jsx';
import { WordCloud } from './WordCloud.jsx';

export function MonumentDetail({ content }) {
  if (!content) {
    return (
      <div className="md-empty-state">
        <p>暂无内容</p>
      </div>
    );
  }

  const stats = content.stats || {};
  const meta = content.meta || {};

  const startDate = meta?.timeRange?.start
    ? new Date(meta.timeRange.start * 1000).toLocaleDateString('zh-CN')
    : '';
  const endDate = meta?.timeRange?.end
    ? new Date(meta.timeRange.end * 1000).toLocaleDateString('zh-CN')
    : '';

  return (
    <div className="md-container">
      <div className="md-hero">
        <h1 className="md-hero-title">一个人的纪念碑</h1>
        <div className="md-hero-subtitle">A Person's Monument</div>
        {(startDate || endDate) && (
          <div className="md-hero-meta">
            {startDate} &mdash; {endDate}
            {stats?.totalMessages ? ` | ${stats.totalMessages} 条消息` : ''}
            {meta?.platforms?.length ? ` | ${meta.platforms.join(' / ')}` : ''}
          </div>
        )}
      </div>

      <MonumentEpitaph epitaph={content.epitaph} />

      {content.trajectory && content.trajectory.length > 0 && (
        <TrajectoryTimeline trajectory={content.trajectory} />
      )}

      {content.relationships && content.relationships.length > 0 && (
        <div className="md-section">
          <h2 className="md-section-title">重要的人</h2>
          <div className="md-relationships">
            {content.relationships.map((rel, index) => (
              <div key={index} className="md-rel-item">
                <div className="md-rel-name">{rel.name}</div>
                <div className="md-rel-role">{rel.role}</div>
                <div className="md-rel-bar">
                  <div
                    className="md-rel-bar-fill"
                    style={{ width: `${((rel.intimacy || 0) * 100).toFixed(0)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.keywords && content.keywords.length > 0 && (
        <KeywordCloud keywords={content.keywords} />
      )}

      <StatsCards stats={stats} meta={meta} />

      <WordCloud wordCloud={stats.wordCloud} />

      <SentimentChart sentiment={stats.sentiment} />

      <ScheduleChart schedule={stats.schedule} />

      <RelationshipGraph relationships={stats.relationships} />

      <div className="md-footer">
        <div className="md-footer-quote">"人永远都值得被记得和记住。"</div>
        <div className="md-footer-info">
          一个人的纪念碑<br />
          原始数据已焚毁 &middot; 仅此留存
        </div>
      </div>
    </div>
  );
}

export { MonumentEpitaph } from './MonumentEpitaph.jsx';
export { TrajectoryTimeline } from './TrajectoryTimeline.jsx';
export { RelationshipGraph } from './RelationshipGraph.jsx';
export { KeywordCloud } from './KeywordCloud.jsx';
export { SentimentChart } from './SentimentChart.jsx';
export { ScheduleChart } from './ScheduleChart.jsx';
export { StatsCards } from './StatsCards.jsx';
export { WordCloud } from './WordCloud.jsx';
