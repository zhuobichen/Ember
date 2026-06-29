export const warmTheme = {
  name: 'warm',
  css: `
:root {
  --bg: #fdf8f3; --bg2: #faf0e6; --bg3: #f5e6d3;
  --ink: #5c4a3d; --muted: #9a8b7c; --rule: #e8d5c4;
  --accent: #d4a574; --accent2: #c2956e;
  --glow: rgba(212,165,116,0.1);
}
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background: var(--bg); color: var(--ink);
  font-family: 'Comic Sans MS', 'Segoe Print', 'Bradley Hand', 'Noto Sans SC', cursive, sans-serif;
  line-height: 1.9; -webkit-font-smoothing: antialiased;
}
body::before {
  content:''; position:fixed; top:0;left:0;right:0;bottom:0;
  background:
    radial-gradient(circle at 10% 20%, rgba(255,200,150,0.15) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(255,180,120,0.1) 0%, transparent 40%);
  pointer-events:none; z-index:0;
}
.container { max-width:700px; margin:0 auto; padding:0 1.5rem; position:relative; z-index:1; }

.hero { text-align:center; padding:5rem 0 3rem; }
.hero-title {
  font-size:2.6rem; font-weight:400; color:var(--ink);
  letter-spacing:0.1em; margin-bottom:0.75rem;
}
.hero-subtitle { font-size:0.85rem; color:var(--accent); letter-spacing:0.3em; text-transform:uppercase; }
.hero-meta { margin-top:2rem; font-size:0.85rem; color:var(--muted); }

.epitaph-section { padding:3rem 0; }
.epitaph-text {
  font-size:1.1rem; color:var(--ink); line-height:2;
  white-space:pre-wrap; text-align:justify;
  padding:2.5rem; background:var(--bg2); border-radius:20px;
  position:relative; overflow:hidden;
  box-shadow: 0 2px 20px rgba(212,165,116,0.1);
}
.epitaph-text::before {
  content:'♡'; position:absolute; top:1rem; right:1.5rem;
  font-size:1.5rem; color:var(--accent); opacity:0.4;
}

.section { padding:3rem 0; }
.section-title {
  font-size:1.25rem; color:var(--accent); margin-bottom:1.75rem;
  font-weight:500; letter-spacing:0.05em;
  display:flex; align-items:center; gap:0.75rem;
  justify-content:center;
}
.section-title::before,
.section-title::after { content:''; width:40px; height:2px; background:var(--rule); border-radius:1px; }

.year-block { display:flex; gap:1.5rem; margin-bottom:1.75rem; align-items:flex-start; background:var(--bg2); padding:1.25rem; border-radius:12px; }
.year-label {
  font-size:1.1rem; color:var(--accent);
  min-width:55px; font-weight:600;
  padding-top:0.1rem;
}
.year-content { color:var(--muted); font-size:0.95rem; flex:1; }

.rel-item { margin-bottom:1.25rem; background:var(--bg2); padding:1rem; border-radius:10px; }
.rel-name { font-size:0.95rem; color:var(--ink); font-weight:500; }
.rel-role { font-size:0.8rem; color:var(--muted); margin-bottom:0.5rem; }
.rel-bar { height:6px; background:var(--bg3); border-radius:3px; overflow:hidden; }
.rel-bar-fill { height:100%; background:linear-gradient(90deg,var(--accent),var(--accent2)); border-radius:3px; }

.kw-year { margin-bottom:1.5rem; background:var(--bg2); padding:1rem 1.25rem; border-radius:12px; }
.kw-year-label { color:var(--accent); font-size:0.9rem; margin-bottom:0.75rem; font-weight:500; }
.kw-tags { display:flex; flex-wrap:wrap; gap:0.5rem; }
.kw-tag {
  font-size:0.85rem; color:var(--ink); background:var(--bg);
  padding:5px 14px; border-radius:20px; border:1px solid var(--rule);
}

.stats-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; }
.stat-card { background:var(--bg2); padding:1.75rem 1rem; border-radius:16px; text-align:center; }
.stat-num { font-size:2rem; color:var(--accent); font-weight:600; }
.stat-label { font-size:0.8rem; color:var(--muted); margin-top:0.5rem; }

.word-cloud-container {
  background: var(--bg2);
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}
.word-cloud-item {
  display: inline-block;
  color: var(--ink);
  cursor: default;
  transition: transform 0.2s;
}
.word-cloud-item:hover {
  transform: scale(1.1);
}

.sentiment-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.sentiment-card {
  background: var(--bg2);
  padding: 1.25rem;
  border-radius: 12px;
  text-align: center;
}
.sentiment-card.positive .sentiment-num { color: #7ab88a; }
.sentiment-card.negative .sentiment-num { color: #e8a0a0; }
.sentiment-card.neutral .sentiment-num { color: var(--muted); }
.sentiment-num { font-size: 1.5rem; font-weight: 600; }
.sentiment-label { font-size: 0.75rem; color: var(--muted); margin-top: 0.3rem; }

.sentiment-chart {
  background: var(--bg2);
  border-radius: 16px;
  padding: 1.5rem;
}
.sentiment-bars {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  height: 150px;
  padding-top: 1rem;
}
.sentiment-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}
.sentiment-bar {
  width: 100%;
  border-radius: 6px 6px 0 0;
  min-height: 4px;
}
.sentiment-bar.positive { background: #7ab88a; }
.sentiment-bar.negative { background: #e8a0a0; }
.sentiment-bar.neutral { background: var(--muted); }
.sentiment-bar-label {
  font-size: 0.7rem;
  color: var(--muted);
  margin-top: 0.5rem;
}

.schedule-chart {
  background: var(--bg2);
  border-radius: 16px;
  padding: 1.5rem;
}
.schedule-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 150px;
}
.schedule-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}
.schedule-bar {
  width: 100%;
  background: var(--accent);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
}
.schedule-bar.night { background: #b8a0d0; }
.schedule-bar.active { background: var(--accent2); }
.schedule-bar-label {
  font-size: 0.6rem;
  color: var(--muted);
  margin-top: 0.4rem;
}
.schedule-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}
.schedule-info-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}
.schedule-info-label { color: var(--muted); }
.schedule-info-value { color: var(--ink); }

.relationship-graph {
  background: var(--bg2);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.relationship-placeholder {
  color: var(--muted);
  font-size: 0.9rem;
}
.relationship-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}
.relationship-legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--muted);
}
.relationship-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.footer { text-align:center; padding:3rem 0; border-top:2px dashed var(--rule); margin-top:2rem; }
.footer-quote { font-style:italic; color:var(--accent); font-size:1rem; margin-bottom:0.75rem; }
.footer-info { font-size:0.75rem; color:var(--muted); }

@media (max-width:600px) {
  .hero-title { font-size:2rem; }
  .epitaph-text { font-size:1rem; padding:1.75rem; }
  .stats-grid { grid-template-columns:1fr; }
  .year-block { flex-direction:column; gap:0.4rem; padding:1rem; }
  .sentiment-overview { grid-template-columns:1fr; }
  .schedule-info { grid-template-columns:1fr; }
}
`
};

export default warmTheme;
