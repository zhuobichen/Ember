export const cyberTheme = {
  name: 'cyber',
  css: `
:root {
  --bg: #05050a; --bg2: #0d0d1a; --bg3: #15152a;
  --ink: #e0e0ff; --muted: #6a6a9a; --rule: #2a2a4a;
  --accent: #ff00ff; --accent2: #00ffff;
  --glow: rgba(255,0,255,0.1);
  --glow2: rgba(0,255,255,0.1);
}
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background: var(--bg); color: var(--ink);
  font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
  line-height: 1.7; -webkit-font-smoothing: antialiased;
}
body::before {
  content:''; position:fixed; top:0;left:0;right:0;bottom:0;
  background:
    linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.1) 50%),
    linear-gradient(90deg, rgba(255,0,255,0.03) 0%, transparent 50%, rgba(0,255,255,0.03) 100%);
  background-size: 100% 4px, 100% 100%;
  pointer-events:none; z-index:0;
}
body::after {
  content:''; position:fixed; top:0;left:0;right:0;bottom:0;
  background:
    radial-gradient(ellipse at 0% 0%, var(--glow) 0%, transparent 40%),
    radial-gradient(ellipse at 100% 100%, var(--glow2) 0%, transparent 40%);
  pointer-events:none; z-index:0;
}
.container { max-width:760px; margin:0 auto; padding:0 1.5rem; position:relative; z-index:1; }

.hero { text-align:center; padding:5rem 0 3rem; position:relative; }
.hero::before {
  content:'══════════════════════════════════════';
  position:absolute; top:3rem; left:50%; transform:translateX(-50%);
  color:var(--accent); opacity:0.3; font-size:0.7rem;
  white-space:nowrap; overflow:hidden;
}
.hero-title {
  font-size:2.5rem; font-weight:700;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing:0.15em; margin-bottom:0.75rem;
  text-shadow: 0 0 30px rgba(255,0,255,0.3);
}
.hero-subtitle { font-size:0.75rem; color:var(--accent2); letter-spacing:0.4em; text-transform:uppercase; }
.hero-meta { margin-top:2rem; font-size:0.75rem; color:var(--muted); }

.epitaph-section { padding:3rem 0; }
.epitaph-text {
  font-size:1rem; color:var(--ink); line-height:1.9;
  white-space:pre-wrap; text-align:justify;
  padding:2rem; background:var(--bg2);
  border:1px solid var(--rule);
  position:relative; overflow:hidden;
}
.epitaph-text::before {
  content:'>'; position:absolute; top:1rem; left:1rem;
  font-size:1rem; color:var(--accent); opacity:0.5;
}
.epitaph-text::after {
  content:'_'; position:absolute; bottom:1rem; right:1rem;
  font-size:1rem; color:var(--accent2);
  animation: blink 1s step-end infinite;
}
@keyframes blink { 50% { opacity:0; } }

.section { padding:3rem 0; position:relative; }
.section-title {
  font-size:1rem; color:var(--accent); margin-bottom:1.5rem;
  font-weight:700; letter-spacing:0.1em;
  display:flex; align-items:center; gap:0.75rem;
  text-transform: uppercase;
}
.section-title::before {
  content:'▸'; color:var(--accent2);
}
.section-title::after {
  content:''; flex:1; height:1px;
  background: linear-gradient(90deg, var(--rule), transparent);
}

.year-block { display:flex; gap:1.5rem; margin-bottom:1.5rem; align-items:flex-start; }
.year-label {
  font-family: 'Courier New', monospace; font-size:1rem; color:var(--accent2);
  min-width:70px; font-weight:700;
  padding:0.2rem 0.5rem; background:var(--bg2); border:1px solid var(--rule);
  text-align:center;
}
.year-content { color:var(--muted); font-size:0.9rem; flex:1; }

.rel-item { margin-bottom:1.25rem; padding:0.75rem; background:var(--bg2); border-left:2px solid var(--accent); }
.rel-name { font-size:0.9rem; color:var(--ink); font-weight:700; }
.rel-role { font-size:0.75rem; color:var(--muted); margin-bottom:0.5rem; }
.rel-bar { height:4px; background:var(--bg3); overflow:hidden; }
.rel-bar-fill {
  height:100%;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
  box-shadow: 0 0 10px rgba(255,0,255,0.5);
}

.kw-year { margin-bottom:1.5rem; }
.kw-year-label { color:var(--accent2); font-size:0.85rem; margin-bottom:0.75rem; font-weight:700; letter-spacing:0.05em; }
.kw-tags { display:flex; flex-wrap:wrap; gap:0.5rem; }
.kw-tag {
  font-size:0.8rem; color:var(--ink); background:var(--bg2);
  padding:4px 12px; border:1px solid var(--rule);
  font-family: 'Courier New', monospace;
}
.kw-tag:hover {
  border-color: var(--accent);
  box-shadow: 0 0 10px rgba(255,0,255,0.3);
}

.stats-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; }
.stat-card {
  background:var(--bg2); padding:1.5rem; text-align:center;
  border:1px solid var(--rule); position:relative; overflow:hidden;
}
.stat-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
}
.stat-num {
  font-size:2rem; color:var(--accent);
  font-family: 'Courier New', monospace; font-weight:700;
  text-shadow: 0 0 15px rgba(255,0,255,0.5);
}
.stat-label { font-size:0.7rem; color:var(--muted); margin-top:0.5rem; text-transform:uppercase; letter-spacing:0.1em; }

.word-cloud-container {
  background: var(--bg2);
  padding: 2rem;
  border: 1px solid var(--rule);
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  position: relative;
  overflow: hidden;
}
.word-cloud-container::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
}
.word-cloud-item {
  display: inline-block;
  color: var(--ink);
  cursor: default;
  transition: color 0.2s, text-shadow 0.2s;
}
.word-cloud-item:hover {
  color: var(--accent);
  text-shadow: 0 0 10px rgba(255,0,255,0.5);
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
  border: 1px solid var(--rule);
  position: relative;
}
.sentiment-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
}
.sentiment-card.positive .sentiment-num { color: #00ff88; text-shadow: 0 0 10px rgba(0,255,136,0.5); }
.sentiment-card.negative .sentiment-num { color: #ff4466; text-shadow: 0 0 10px rgba(255,68,102,0.5); }
.sentiment-card.neutral .sentiment-num { color: var(--muted); }
.sentiment-num { font-size: 1.5rem; font-family: 'Courier New', monospace; font-weight: 700; }
.sentiment-label { font-size: 0.7rem; color: var(--muted); margin-top: 0.3rem; text-transform: uppercase; letter-spacing: 0.1em; }

.sentiment-chart {
  background: var(--bg2);
  padding: 1.5rem;
  border: 1px solid var(--rule);
  position: relative;
}
.sentiment-chart::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
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
.sentiment-bar.positive { background: #00ff88; box-shadow: 0 0 10px rgba(0,255,136,0.5); }
.sentiment-bar.negative { background: #ff4466; box-shadow: 0 0 10px rgba(255,68,102,0.5); }
.sentiment-bar.neutral { background: var(--muted); }
.sentiment-bar-label {
  font-size: 0.65rem;
  color: var(--muted);
  margin-top: 0.5rem;
  font-family: 'Courier New', monospace;
}

.schedule-chart {
  background: var(--bg2);
  padding: 1.5rem;
  border: 1px solid var(--rule);
  position: relative;
}
.schedule-chart::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
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
  min-height: 2px;
  box-shadow: 0 0 5px rgba(255,0,255,0.3);
}
.schedule-bar.night { background: #6b5b8a; box-shadow: none; }
.schedule-bar.active { background: var(--accent2); box-shadow: 0 0 10px rgba(0,255,255,0.5); }
.schedule-bar-label {
  font-size: 0.6rem;
  color: var(--muted);
  margin-top: 0.4rem;
  font-family: 'Courier New', monospace;
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
  font-size: 0.8rem;
  font-family: 'Courier New', monospace;
}
.schedule-info-label { color: var(--muted); }
.schedule-info-value { color: var(--ink); }

.relationship-graph {
  background: var(--bg2);
  padding: 1.5rem;
  border: 1px solid var(--rule);
  text-align: center;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.relationship-graph::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
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
  font-size: 0.75rem;
  color: var(--muted);
  font-family: 'Courier New', monospace;
}
.relationship-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 5px currentColor;
}

.footer {
  text-align:center; padding:3rem 0; margin-top:2rem;
  border-top:1px solid var(--rule);
  position:relative;
}
.footer::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background: linear-gradient(90deg, transparent, var(--accent), var(--accent2), transparent);
}
.footer-quote { font-style:normal; color:var(--accent2); font-size:0.85rem; margin-bottom:0.75rem; }
.footer-info { font-size:0.7rem; color:var(--muted); }

@media (max-width:600px) {
  .hero-title { font-size:1.8rem; }
  .epitaph-text { font-size:0.95rem; padding:1.5rem; }
  .stats-grid { grid-template-columns:1fr; }
  .year-block { flex-direction:column; gap:0.5rem; }
  .sentiment-overview { grid-template-columns:1fr; }
  .schedule-info { grid-template-columns:1fr; }
}
`
};

export default cyberTheme;
