import React from 'react';

export function StatsCards({ stats, meta }) {
  if (!stats && !meta) {
    return null;
  }

  const cards = [
    { label: '总消息数', value: stats?.totalMessages || 0 },
    { label: '联系人数', value: stats?.totalContacts || 0 },
    { label: '日均消息', value: stats?.avgMessagesPerDay || 0 },
    { label: '自己发言比例', value: `${((stats?.selfMessageRatio || 0) * 100).toFixed(0)}%` }
  ];

  return (
    <div className="md-section">
      <h2 className="md-section-title">数据印记</h2>
      <div className="md-stats-grid">
        {cards.map((card, index) => (
          <div key={index} className="md-stat-card">
            <div className="md-stat-num">{card.value}</div>
            <div className="md-stat-label">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
