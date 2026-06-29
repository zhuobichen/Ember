import React from 'react';

export function KeywordCloud({ keywords }) {
  if (!keywords || keywords.length === 0) {
    return null;
  }

  return (
    <div className="md-section">
      <h2 className="md-section-title">年度关键词</h2>
      <div className="md-keywords">
        {keywords.map((item, index) => (
          <div key={index} className="md-kw-year">
            <div className="md-kw-year-label">{item.year}</div>
            <div className="md-kw-tags">
              {(item.words || []).map((word, i) => (
                <span key={i} className="md-kw-tag">{word}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
