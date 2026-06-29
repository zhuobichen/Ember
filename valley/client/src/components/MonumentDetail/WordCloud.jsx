import React from 'react';

export function WordCloud({ wordCloud }) {
  if (!wordCloud || wordCloud.length === 0) {
    return null;
  }

  const maxCount = Math.max(...wordCloud.map(w => w.count), 1);
  const minSize = 12;
  const maxSize = 36;

  return (
    <div className="md-section">
      <h2 className="md-section-title">词云</h2>
      <div className="md-word-cloud">
        {wordCloud.slice(0, 50).map((item, index) => {
          const ratio = item.count / maxCount;
          const size = minSize + ratio * (maxSize - minSize);
          const opacity = 0.5 + ratio * 0.5;
          return (
            <span
              key={index}
              className="md-word-cloud-item"
              style={{
                fontSize: `${size.toFixed(1)}px`,
                opacity: opacity.toFixed(2)
              }}
            >
              {item.word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
