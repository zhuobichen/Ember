export const defaultTheme = {
  name: 'default',
  css: `
:root {
  --bg: #0a0a0f; --bg2: #15151f; --bg3: #1e1e2e;
  --ink: #e8e4d8; --muted: #8a8580; --rule: #2a2a3a;
  --accent: #d4a574; --accent2: #5fb8a8;
  --glow: rgba(212,165,116,0.15);
}
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background: var(--bg); color: var(--ink);
  font-family: 'Georgia', 'Noto Serif SC', serif;
  line-height: 1.9; -webkit-font-smoothing: antialiased;
}
body::before {
  content:''; position:fixed; top:0;left:0;right:0;bottom:0;
  background: radial-gradient(ellipse at 50% 0%, var(--glow) 0%, transparent 60%);
  pointer-events:none; z-index:0;
}
.container { max-width:720px; margin:0 auto; padding:0 1.5rem; position:relative; z-index:1; }

.hero { text-align:center; padding:6rem 0 4rem; }
.hero-title {
  font-size:2.5rem; font-weight:400; color:var(--ink);
  letter-spacing:0.1em; margin-bottom:0.5rem;
}
.hero-subtitle { font-size:0.85rem; color:var(--accent2); letter-spacing:0.3em; text-transform:uppercase; }
.hero-meta { margin-top:2rem; font-size:0.8rem; color:var(--muted); font-family:monospace; }

.epitaph-section { padding:3rem 0; }
.epitaph-text {
  font-size:1.1rem; color:var(--ink); line-height:2.1;
  white-space:pre-wrap; text-align:justify;
  padding:2.5rem; background:var(--bg2); border-radius:8px;
  border-left:3px solid var(--accent);
  position:relative; overflow:hidden;
}
.epitaph-text::before {
  content:'"'; position:absolute; top:-1rem; left:1rem;
  font-size:5rem; color:var(--accent); opacity:0.1;
}

.section { padding:3rem 0; }
.section-title {
  font-size:1.3rem; color:var(--accent); margin-bottom:1.5rem;
  font-weight:400; letter-spacing:0.05em;
  display:flex; align-items:center; gap:0.75rem;
}
.section-title::after { content:''; flex:1; height:1px; background:linear-gradient(90deg,var(--rule),transparent); }

.year-block { display:flex; gap:1.5rem; margin-bottom:1.5rem; align-items:flex-start; }
.year-label {
  font-family:monospace; font-size:1.2rem; color:var(--accent);
  min-width:60px; font-weight:700;
}
.year-content { color:var(--muted); font-size:0.95rem; flex:1; }

.rel-item { margin-bottom:1.25rem; }
.rel-name { font-size:0.95rem; color:var(--ink); }
.rel-role { font-size:0.8rem; color:var(--muted); margin-bottom:0.3rem; }
.rel-bar { height:3px; background:var(--bg2); border-radius:2px; overflow:hidden; }
.rel-bar-fill { height:100%; background:linear-gradient(90deg,var(--accent),var(--accent2)); }

.kw-year { margin-bottom:1.5rem; }
.kw-year-label { font-family:monospace; color:var(--accent2); font-size:0.9rem; margin-bottom:0.5rem; }
.kw-tags { display:flex; flex-wrap:wrap; gap:0.5rem; }
.kw-tag {
  font-size:0.85rem; color:var(--ink); background:var(--bg2);
  padding:4px 12px; border-radius:3px; border:1px solid var(--rule);
}

.stats-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; }
.stat-card { background:var(--bg2); padding:1.5rem; border-radius:6px; text-align:center; border:1px solid var(--rule); }
.stat-num { font-size:1.8rem; color:var(--accent); font-family:monospace; }
.stat-label { font-size:0.75rem; color:var(--muted); margin-top:0.3rem; }

.footer { text-align:center; padding:3rem 0; border-top:1px solid var(--rule); margin-top:2rem; }
.footer-quote { font-style:italic; color:var(--accent); font-size:0.95rem; margin-bottom:0.5rem; }
.footer-info { font-size:0.75rem; color:var(--muted); font-family:monospace; }

.word-cloud-container {
  background: var(--bg2);
  border-radius: 8px;
  padding: 2rem;
  border: 1px solid var(--rule);
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
  transition: color 0.2s, transform 0.2s;
  cursor: default;
}
.word-cloud-item:hover {
  color: var(--accent);
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
  border-radius: 6px;
  text-align: center;
  border: 1px solid var(--rule);
}
.sentiment-card.positive .sentiment-num { color: var(--accent2); }
.sentiment-card.negative .sentiment-num { color: #e87878; }
.sentiment-card.neutral .sentiment-num { color: var(--muted); }
.sentiment-num { font-size: 1.5rem; font-family: monospace; font-weight: 700; }
.sentiment-label { font-size: 0.75rem; color: var(--muted); margin-top: 0.3rem; }

.sentiment-chart {
  background: var(--bg2);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid var(--rule);
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
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.3s;
}
.sentiment-bar.positive { background: var(--accent2); }
.sentiment-bar.negative { background: #e87878; }
.sentiment-bar.neutral { background: var(--muted); }
.sentiment-bar-label {
  font-size: 0.7rem;
  color: var(--muted);
  margin-top: 0.5rem;
  font-family: monospace;
}

.schedule-chart {
  background: var(--bg2);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid var(--rule);
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
  border-radius: 2px 2px 0 0;
  min-height: 2px;
  transition: background 0.2s;
}
.schedule-bar.night { background: #6b5b8a; }
.schedule-bar.active { background: var(--accent2); }
.schedule-bar-label {
  font-size: 0.6rem;
  color: var(--muted);
  margin-top: 0.4rem;
  font-family: monospace;
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
.schedule-info-value { color: var(--ink); font-family: monospace; }

.relationship-graph {
  background: var(--bg2);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid var(--rule);
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

@media (max-width:600px) {
  .hero-title { font-size:1.8rem; }
  .epitaph-text { font-size:1rem; padding:1.5rem; }
  .stats-grid { grid-template-columns:1fr; }
  .year-block { flex-direction:column; gap:0.3rem; }
  .sentiment-overview { grid-template-columns:1fr; }
  .schedule-info { grid-template-columns:1fr; }
}
`
};

export default defaultTheme;
