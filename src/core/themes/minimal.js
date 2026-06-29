export const minimalTheme = {
  name: 'minimal',
  css: `
:root {
  --bg: #ffffff; --bg2: #fafafa; --bg3: #f5f5f5;
  --ink: #171717; --muted: #737373; --rule: #e5e5e5;
  --accent: #262626; --accent2: #525252;
  --glow: transparent;
}
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background: var(--bg); color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Helvetica Neue', sans-serif;
  line-height: 1.7; -webkit-font-smoothing: antialiased;
  font-weight: 300;
}
.container { max-width:640px; margin:0 auto; padding:0 2rem; position:relative; z-index:1; }

.hero { text-align:left; padding:8rem 0 5rem; }
.hero-title {
  font-size:3rem; font-weight:200; color:var(--ink);
  letter-spacing:-0.02em; margin-bottom:1rem;
}
.hero-subtitle { font-size:0.75rem; color:var(--muted); letter-spacing:0.2em; text-transform:uppercase; font-weight:500; }
.hero-meta { margin-top:3rem; font-size:0.8rem; color:var(--muted); font-weight:400; }

.epitaph-section { padding:4rem 0; }
.epitaph-text {
  font-size:1.1rem; color:var(--ink); line-height:1.9;
  white-space:pre-wrap; text-align:left;
  padding:0; background:transparent;
  border-left:2px solid var(--ink);
  padding-left:2rem;
  font-weight:300;
}

.section { padding:4rem 0; }
.section-title {
  font-size:0.8rem; color:var(--muted); margin-bottom:2.5rem;
  font-weight:500; letter-spacing:0.15em;
  text-transform: uppercase;
}

.year-block { display:flex; gap:2rem; margin-bottom:2rem; align-items:flex-start; }
.year-label {
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  font-size:0.85rem; color:var(--muted);
  min-width:50px; font-weight:500;
  padding-top:0.15rem;
}
.year-content { color:var(--ink); font-size:0.95rem; flex:1; font-weight:300; }

.rel-item { margin-bottom:1.5rem; display:flex; align-items:center; gap:1rem; }
.rel-name { font-size:0.9rem; color:var(--ink); flex:1; font-weight:400; }
.rel-role { font-size:0.75rem; color:var(--muted); }
.rel-bar { height:1px; background:var(--bg3); flex:1; max-width:120px; }
.rel-bar-fill { height:100%; background:var(--ink); }

.kw-year { margin-bottom:2rem; }
.kw-year-label { color:var(--muted); font-size:0.75rem; margin-bottom:0.75rem; letter-spacing:0.1em; text-transform:uppercase; font-weight:500; }
.kw-tags { display:flex; flex-wrap:wrap; gap:0.4rem; }
.kw-tag {
  font-size:0.8rem; color:var(--ink); background:transparent;
  padding:3px 10px; border:1px solid var(--rule);
  font-weight:400;
}

.stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1.5rem; }
.stat-card { background:transparent; padding:0; text-align:left; }
.stat-num { font-size:1.5rem; color:var(--ink); font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; font-weight:200; }
.stat-label { font-size:0.7rem; color:var(--muted); margin-top:0.25rem; letter-spacing:0.05em; }

.footer { text-align:left; padding:4rem 0; border-top:1px solid var(--rule); margin-top:3rem; }
.footer-quote { font-style:normal; color:var(--muted); font-size:0.85rem; margin-bottom:1rem; font-weight:300; }
.footer-info { font-size:0.75rem; color:var(--muted); font-weight:400; }

.word-cloud-container {
  padding: 2rem 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  justify-content: flex-start;
  align-items: center;
  min-height: 150px;
}
.word-cloud-item {
  display: inline-block;
  color: var(--ink);
  cursor: default;
  font-weight: 300;
}

.sentiment-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 2rem;
}
.sentiment-card {
  padding: 0;
  text-align: left;
}
.sentiment-card.positive .sentiment-num { color: #2a9d6a; }
.sentiment-card.negative .sentiment-num { color: #e05a5a; }
.sentiment-card.neutral .sentiment-num { color: var(--muted); }
.sentiment-num { font-size: 1.5rem; font-weight: 200; }
.sentiment-label { font-size: 0.7rem; color: var(--muted); margin-top: 0.25rem; letter-spacing: 0.05em; }

.sentiment-chart {
  padding: 1.5rem 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}
.sentiment-bars {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  height: 120px;
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
  min-height: 1px;
}
.sentiment-bar.positive { background: #2a9d6a; }
.sentiment-bar.negative { background: #e05a5a; }
.sentiment-bar.neutral { background: var(--muted); }
.sentiment-bar-label {
  font-size: 0.65rem;
  color: var(--muted);
  margin-top: 0.5rem;
  font-weight: 400;
}

.schedule-chart {
  padding: 1.5rem 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}
.schedule-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 120px;
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
  background: var(--ink);
  min-height: 1px;
  opacity: 0.8;
}
.schedule-bar.night { background: #999; opacity: 0.5; }
.schedule-bar.active { background: var(--ink); opacity: 1; }
.schedule-bar-label {
  font-size: 0.6rem;
  color: var(--muted);
  margin-top: 0.4rem;
  font-weight: 400;
}
.schedule-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
}
.schedule-info-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}
.schedule-info-label { color: var(--muted); }
.schedule-info-value { color: var(--ink); font-weight: 400; }

.relationship-graph {
  padding: 2rem 0;
  text-align: center;
  min-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}
.relationship-placeholder {
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 300;
}
.relationship-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: flex-start;
  margin-top: 1rem;
}
.relationship-legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--muted);
}
.relationship-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

@media (max-width:600px) {
  .container { padding:0 1.5rem; }
  .hero { padding:5rem 0 3rem; }
  .hero-title { font-size:2.2rem; }
  .epitaph-text { font-size:1rem; padding-left:1.5rem; }
  .section { padding:3rem 0; }
  .stats-grid { grid-template-columns:repeat(2,1fr); gap:1rem; }
  .year-block { flex-direction:column; gap:0.25rem; }
  .rel-item { flex-wrap:wrap; gap:0.5rem; }
  .rel-bar { order:3; width:100%; max-width:none; }
  .sentiment-overview { grid-template-columns:1fr; gap:1rem; }
  .schedule-info { grid-template-columns:1fr; }
}
`
};

export default minimalTheme;
