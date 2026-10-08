const CHART_COLORS = { grid:"rgba(177,210,255,.14)", text:"#a8bad0", cyan:"#55e1d2", blue:"#67aaff", amber:"#ffc966", coral:"#ff7889", violet:"#b991ff" };
const gaussian = (x, mean, sigma) => Math.exp(-0.5 * ((x - mean) / sigma) ** 2);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function illustrativeRatio(c) { return .72 + .38 * c - .08 * c * c; }

function illustrativeSpectrum(c, options = {}) {
  const pH = options.pH ?? 8.2;
  const temp = options.temp ?? 25;
  const bubble = options.bubble ?? false;
  const fingerprint = options.fingerprint ?? false;
  const noise = options.noise ?? 0;
  const ratio = clamp(illustrativeRatio(c) + (pH - 8.2) * .72, .14, 1.8);
  const a434 = .58 / (1 + ratio * .62);
  const a578 = a434 * ratio;
  const data = [];
  for (let wavelength = 400; wavelength <= 700; wavelength += 2) {
    let y = (1 + (temp - 25) * .004) * (a434 * gaussian(wavelength, 434 - c * .35, 17) + a578 * gaussian(wavelength, 578 + c * .55, 20) + .012);
    if (bubble) y += .025 + .012 * Math.sin(wavelength / 17);
    if (fingerprint) y *= 1.08;
    if (noise) y += noise * (Math.sin(wavelength * 1.71) + Math.sin(wavelength * .37)) / 2;
    data.push({ x: wavelength, y: Math.max(0, y) });
  }
  return { data, a434, a578, ratio };
}

function canvasContext(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function drawChart(canvas, series, config = {}) {
  const { ctx, width, height } = canvasContext(canvas);
  const pad = { left: 54, right: 18, top: 18, bottom: 40 };
  const xMin = config.xMin ?? Math.min(...series.flatMap(s => s.data.map(p => p.x)));
  const xMax = config.xMax ?? Math.max(...series.flatMap(s => s.data.map(p => p.x)));
  const yMin = config.yMin ?? 0;
  const yMax = config.yMax ?? Math.max(...series.flatMap(s => s.data.map(p => p.y))) * 1.12;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const xp = x => pad.left + (x - xMin) / (xMax - xMin) * plotW;
  const yp = y => pad.top + plotH - (y - yMin) / (yMax - yMin) * plotH;
  ctx.clearRect(0, 0, width, height);
  ctx.font = "11px system-ui";
  for (let i=0;i<=5;i++) {
    const value = yMin + (yMax-yMin)*i/5;
    const y = yp(value);
    ctx.strokeStyle = CHART_COLORS.grid; ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(width-pad.right,y); ctx.stroke();
    ctx.fillStyle = CHART_COLORS.text; ctx.textAlign="right"; ctx.textBaseline="middle"; ctx.fillText(value.toFixed(2), pad.left-8, y);
  }
  const ticks = config.xTicks ?? 6;
  for (let i=0;i<=ticks;i++) {
    const value=xMin+(xMax-xMin)*i/ticks; const x=xp(value);
    ctx.strokeStyle=CHART_COLORS.grid; ctx.beginPath(); ctx.moveTo(x,pad.top); ctx.lineTo(x,height-pad.bottom); ctx.stroke();
    ctx.fillStyle=CHART_COLORS.text; ctx.textAlign="center"; ctx.textBaseline="top"; ctx.fillText(config.xFormat?config.xFormat(value):value.toFixed(1),x,height-pad.bottom+8);
  }
  (config.guides||[]).forEach(guide=>{ const x=xp(guide.x); ctx.save();ctx.setLineDash([5,6]);ctx.strokeStyle=guide.color;ctx.beginPath();ctx.moveTo(x,pad.top);ctx.lineTo(x,height-pad.bottom);ctx.stroke();ctx.restore();ctx.fillStyle=guide.color;ctx.textAlign="center";ctx.fillText(guide.label,x,pad.top+4); });
  series.forEach(s=>{ ctx.strokeStyle=s.color;ctx.lineWidth=s.width??2.5;ctx.beginPath();s.data.forEach((p,i)=>{if(i)ctx.lineTo(xp(p.x),yp(p.y));else ctx.moveTo(xp(p.x),yp(p.y));});ctx.stroke();if(s.points)s.data.forEach(p=>{ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(xp(p.x),yp(p.y),4,0,Math.PI*2);ctx.fill();}); });
  ctx.fillStyle=CHART_COLORS.text;ctx.textAlign="center";ctx.textBaseline="bottom";ctx.fillText(config.xLabel||"",pad.left+plotW/2,height-2);
  ctx.save();ctx.translate(13,pad.top+plotH/2);ctx.rotate(-Math.PI/2);ctx.fillText(config.yLabel||"",0,0);ctx.restore();
}

function invertIllustrativeRatio(target) {
  let low=0, high=1.6;
  for(let i=0;i<40;i++){const mid=(low+high)/2;if(illustrativeRatio(mid)<target)low=mid;else high=mid;}
  return (low+high)/2;
}

