export const inkTheme = {
  name: 'ink',
  css: `
:root {
  --bg: #f5f2eb; --bg2: #ede9e0; --bg3: #e5e0d5;
  --ink: #1a1a1a; --muted: #666666; --rule: #d4cfc4;
  --accent: #2c2c2c; --accent2: #5a5a5a;
  --glow: rgba(0,0,0,0.03);
}
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background: var(--bg); color: var(--ink);
  font-family: 'Noto Serif SC', 'KaiTi', 'STKaiti', serif;
  line-height: 2; -webkit-font-smoothing: antialiased;
  background-image:
    radial-gradient(ellipse at 20% 30%, rgba(0,0,0,0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(0,0,0,0.02) 0%, transparent 50%);
}
body::before {
  content:''; position:fixed; top:0;left:0;right:0;bottom:0;
  background:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events:none; z-index:0; opacity:0.5;
}
.container { max-width:720px; margin:0 auto; padding:0 1.5rem; position:relative; z-index:1; }

.hero { text-align:center; padding:5rem 0 3rem; }
.hero-title {
  font-size:2.8rem; font-weight:400; color:var(--ink);
  letter-spacing:0.2em; margin-bottom:0.5rem;
  font-family: 'Noto Serif SC', 'STKaiti', 'KaiTi', serif;
}
.hero-subtitle { font-size:0.8rem; color:var(--muted); letter-spacing:0.5em; text-transform:uppercase; }
.hero-meta { margin-top:2rem; font-size:0.8rem; color:var(--muted); font-family: 'Noto Serif SC', serif; }

.epitaph-section { padding:3rem 0; }
.epitaph-text {
  font-size:1.15rem; color:var(--ink); line-height:2.2;
  white-space:pre-wrap; text-align:justify;
  padding:3rem 2.5rem; background:var(--bg2);
  position:relative; overflow:hidden;
  border-top:1px solid var(--rule);
  border-bottom:1px solid var(--rule);
}
.epitaph-text::before {
  content:''; position:absolute; top:0; left:0;
  width:80px; height:80px;
  background: radial-gradient(circle at 30% 30%, rgba(0,0,0,0.08) 0%, transparent 70%);
}
.epitaph-text::after {
  content:''; position:absolute; bottom:0; right:0;
  width:100px; height:100px;
  background: radial-gradient(circle at 70% 70%, rgba(0,0,0,0.06) 0%, transparent 70%);
}

.section { padding:3rem 0; }
.section-title {
  font-size:1.4rem; color:var(--ink); margin-bottom:2rem;
  font-weight:400; letter-spacing:0.15em;
  display:flex; align-items:center; gap:0.75rem;
  font-family: 'Noto Serif SC', 'STKaiti', 'KaiTi', serif;
}
.section-title::before {
  content:''; width:3px; height:1.4rem; background:var(--ink);
}
.section-title::after { content:''; flex:1; height:1px; background:var(--rule); }

.year-block { display:flex; gap:1.5rem; margin-bottom:2rem; align-items:flex-start; }
.year-label {
  font-family: 'Noto Serif SC', serif; font-size:1.1rem; color:var(--ink);
  min-width:60px; font-weight:700;
  position:relative; padding-top:0.3rem;
}
.year-label::before {
  content:'●'; position:absolute; left:-1rem; top:0.4rem; font-size:0.5rem; color:var(--muted);
}
.year-content { color:var(--muted); font-size:0.95rem; flex:1; line-height:1.9; }

.rel-item { margin-bottom:1.5rem; }
.rel-name { font-size:0.95rem; color:var(--ink); }
.rel-role { font-size:0.8rem; color:var(--muted); margin-bottom:0.5rem; }
.rel-bar { height:2px; background:var(--bg3); overflow:hidden; }
.rel-bar-fill { height:100%; background: linear-gradient(90deg,var(--ink),var(--muted)); }

.kw-year { margin-bottom:1.5rem; }
.kw-year-label { color:var(--ink); font-size:0.95rem; margin-bottom:0.75rem; font-weight:500; }
.kw-tags { display:flex; flex-wrap:wrap; gap:0.6rem; }
.kw-tag {
  font-size:0.85rem; color:var(--ink); background:transparent;
  padding:5px 14px; border:1px solid var(--rule);
}

.stats-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; }
.stat-card { background:var(--bg2); padding:1.5rem; text-align:center; position:relative; overflow:hidden; }
.stat-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background: linear-gradient(90deg, transparent, var(--rule), transparent);
}
.stat-num { font-size:2rem; color:var(--ink); font-family: 'Noto Serif SC', serif; font-weight:300; }
.stat-label { font-size:0.75rem; color:var(--muted); margin-top:0.5rem; letter-spacing:0.1em; }

.footer { text-align:center; padding:3rem 0; border-top:1px solid var(--rule); margin-top:2rem; }
.footer-quote { font-style:normal; color:var(--muted); font-size:0.95rem; margin-bottom:0.75rem; letter-spacing:0.1em; }
.footer-info { font-size:0.75rem; color:var(--muted); font-family: 'Noto Serif SC', serif; }

.word-cloud-container {
  background: var(--bg2);
  padding: 2rem;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
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
  transition: color 0.2s;
}
.word-cloud-item:hover {
  color: var(--accent);
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
  text-align: center;
  position: relative;
}
.sentiment-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--rule), transparent);
}
.sentiment-card.positive .sentiment-num { color: #3a7a5a; }
.sentiment-card.negative .sentiment-num { color: #a04040; }
.sentiment-card.neutral .sentiment-num { color: var(--muted); }
.sentiment-num { font-size: 1.5rem; font-family: 'Noto Serif SC', serif; font-weight: 300; }
.sentiment-label { font-size: 0.75rem; color: var(--muted); margin-top: 0.5rem; letter-spacing: 0.1em; }

.sentiment-chart {
  background: var(--bg2);
  padding: 1.5rem;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
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
  min-height: 2px;
}
.sentiment-bar.positive { background: #3a7a5a; }
.sentiment-bar.negative { background: #a04040; }
.sentiment-bar.neutral { background: var(--muted); }
.sentiment-bar-label {
  font-size: 0.7rem;
  color: var(--muted);
  margin-top: 0.5rem;
  font-family: 'Noto Serif SC', serif;
}

.schedule-chart {
  background: var(--bg2);
  padding: 1.5rem;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
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
  background: var(--ink);
  min-height: 2px;
  opacity: 0.7;
}
.schedule-bar.night { background: #8a7a9a; opacity: 0.6; }
.schedule-bar.active { background: var(--ink); opacity: 1; }
.schedule-bar-label {
  font-size: 0.6rem;
  color: var(--muted);
  margin-top: 0.4rem;
  font-family: 'Noto Serif SC', serif;
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
  padding: 1.5rem;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
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
  .hero-title { font-size:2rem; }
  .epitaph-text { font-size:1rem; padding:2rem 1.5rem; }
  .stats-grid { grid-template-columns:1fr; }
  .year-block { flex-direction:column; gap:0.3rem; }
  .year-label::before { display:none; }
  .sentiment-overview { grid-template-columns:1fr; }
  .schedule-info { grid-template-columns:1fr; }
}
`
};

export default inkTheme;
