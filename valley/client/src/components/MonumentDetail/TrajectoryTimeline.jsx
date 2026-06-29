import React from 'react';

export function TrajectoryTimeline({ trajectory }) {
  if (!trajectory || trajectory.length === 0) {
    return null;
  }

  return (
    <div className="md-section">
      <h2 className="md-section-title">人生轨迹</h2>
      <div className="md-timeline">
        {trajectory.map((item, index) => (
          <div key={index} className="md-timeline-item">
            <div className="md-timeline-dot"></div>
            <div className="md-timeline-line"></div>
            <div className="md-timeline-year">{item.year}</div>
            <div className="md-timeline-content">{item.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
