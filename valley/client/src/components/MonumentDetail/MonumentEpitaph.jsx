import React from 'react';

export function MonumentEpitaph({ epitaph }) {
  if (!epitaph) {
    return (
      <div className="md-section">
        <h2 className="md-section-title">纪念碑</h2>
        <div className="md-epitaph md-empty">暂无碑文</div>
      </div>
    );
  }

  return (
    <div className="md-section">
      <h2 className="md-section-title">纪念碑</h2>
      <div className="md-epitaph">
        {epitaph.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </div>
  );
}
