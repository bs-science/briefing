const COLORS = {
  grid: "rgba(169, 204, 255, 0.12)",
  text: "#a8bad0",
  cyan: "#58e0d1",
  blue: "#65a9ff",
  violet: "#bd8cff",
  amber: "#ffc86b",
  danger: "#ff7f8f"
};

const q = (selector) => document.querySelector(selector);
const qa = (selector) => [...document.querySelectorAll(selector)];
const gauss = (x, mean, sigma) => Math.exp(-0.5 * ((x - mean) / sigma) ** 2);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function ratioModel(c) {
  return 0.72 + 0.38 * c - 0.08 * c * c;
}

function spectrum(c, options = {}) {
  const pH = options.pH ?? 8.2;
  const temp = options.temp ?? 25;
  const dye = options.dye ?? 0.2;
  const bubble = options.bubble ?? false;
  const fingerprint = options.fingerprint ?? false;
  const noise = options.noise ?? 0;
  const pHShift = (pH - 8.2) * 0.72;
  const saltShift = c * 0.10;
  const ratio = clamp(ratioModel(c) + pHShift, 0.14, 1.8);
  const scale = dye / 0.2;
  const a434 = scale * 0.58 / (1 + ratio * 0.62);
  const a578 = a434 * ratio;
  const temperatureFactor = 1 + (temp - 25) * 0.004;
  const points = [];

  for (let wavelength = 400; wavelength <= 700; wavelength += 2) {
    let absorbance = temperatureFactor * (
      a434 * gauss(wavelength, 434 - c * 0.35, 17) +
      a578 * gauss(wavelength, 578 + c * 0.55, 20) +
      0.012
    );
    if (bubble) absorbance += 0.025 + 0.012 * Math.sin(wavelength / 17);
    if (fingerprint) absorbance *= 1.08;
    if (noise) absorbance += noise * (Math.sin(wavelength * 1.71) + Math.sin(wavelength * 0.37)) / 2;
    points.push({ x: wavelength, y: Math.max(0, absorbance) });
  }
  return { points, a434, a578, ratio };
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function drawChart(canvas, series, config = {}) {
  const { ctx, width, height } = setupCanvas(canvas);
  const pad = { left: 54, right: 20, top: 20, bottom: 42 };
  const xMin = config.xMin ?? Math.min(...series.flatMap(s => s.data.map(p => p.x)));
  const xMax = config.xMax ?? Math.max(...series.flatMap(s => s.data.map(p => p.x)));
  const yMin = config.yMin ?? 0;
  const dataMax = Math.max(...series.flatMap(s => s.data.map(p => p.y)), 0.01);
  const yMax = config.yMax ?? Math.ceil(dataMax * 10 * 1.12) / 10;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const xp = x => pad.left + (x - xMin) / (xMax - xMin) * plotW;
  const yp = y => pad.top + plotH - (y - yMin) / (yMax - yMin) * plotH;

  ctx.clearRect(0, 0, width, height);
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 5; i++) {
    const value = yMin + (yMax - yMin) * i / 5;
    const y = yp(value);
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.fillText(value.toFixed(config.yDecimals ?? 2), pad.left - 9, y);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const xTicks = config.xTicks ?? 6;
  for (let i = 0; i <= xTicks; i++) {
    const value = xMin + (xMax - xMin) * i / xTicks;
    const x = xp(value);
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, height - pad.bottom); ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.fillText(config.xFormat ? config.xFormat(value) : value.toFixed(1), x, height - pad.bottom + 10);
  }

  if (config.guides) {
    config.guides.forEach(guide => {
      const x = xp(guide.x);
      ctx.save();
      ctx.setLineDash([5, 6]);
      ctx.strokeStyle = guide.color || COLORS.amber;
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, height - pad.bottom); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = guide.color || COLORS.amber;
      ctx.textAlign = "center";
      ctx.fillText(guide.label, x, pad.top + 5);
    });
  }

  series.forEach(s => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width ?? 2.5;
    ctx.beginPath();
    s.data.forEach((point, index) => {
      const x = xp(point.x); const y = yp(point.y);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    if (s.points) {
      s.data.forEach(point => {
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(xp(point.x), yp(point.y), 4, 0, Math.PI * 2); ctx.fill();
      });
    }
  });

  ctx.fillStyle = COLORS.text;
  ctx.textAlign = "center";
  ctx.fillText(config.xLabel || "", pad.left + plotW / 2, height - 15);
  ctx.save();
  ctx.translate(14, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(config.yLabel || "", 0, 0);
  ctx.restore();
}

function markCurrentPage() {
  const file = location.pathname.split("/").pop() || "index.html";
  qa(".nav a").forEach(link => {
    if (link.getAttribute("href") === file) link.setAttribute("aria-current", "page");
  });
}

function initSpectrum() {
  const slider = q("#salt");
  const canvas = q("#spectrumChart");
  const render = () => {
    const c = Number(slider.value);
    const current = spectrum(c);
    const baseline = spectrum(0);
    q("#saltValue").textContent = `${c.toFixed(1)} M`;
    q("#a434").textContent = current.a434.toFixed(3);
    q("#a578").textContent = current.a578.toFixed(3);
    q("#ratio").textContent = current.ratio.toFixed(3);
    q("#lambda").textContent = `${(578 + c * .55).toFixed(1)} nm`;
    drawChart(canvas, [
      { data: baseline.points, color: COLORS.blue, width: 1.6 },
      { data: current.points, color: COLORS.cyan, width: 3 }
    ], { xMin: 400, xMax: 700, yMin: 0, yMax: .55, xLabel: "파장 (nm)", yLabel: "흡광도 (가상)", xFormat: v => v.toFixed(0), guides: [{x:434,label:"434",color:COLORS.amber},{x:578,label:"578",color:COLORS.violet}] });
  };
  slider.addEventListener("input", render);
  window.addEventListener("resize", render);
  render();
}

const standards = [0, .2, .4, .6, .8, 1.0, 1.2, 1.6];

function initCalibration() {
  const canvas = q("#calibrationChart");
  const render = () => {
    const data = standards.map((c, i) => ({ x: c, y: ratioModel(c) + Math.sin(i * 2.2) * .012 }));
    const curve = Array.from({length: 81}, (_, i) => ({ x: i * .02, y: ratioModel(i * .02) }));
    drawChart(canvas, [
      { data: curve, color: COLORS.cyan, width: 2.5 },
      { data, color: COLORS.amber, points: true, width: 0 }
    ], { xMin: 0, xMax: 1.6, yMin: .65, yMax: 1.25, xLabel: "NaCl 농도 (M)", yLabel: "A₅₇₈ / A₄₃₄", xTicks: 8, xFormat: v => v.toFixed(1) });
  };
  window.addEventListener("resize", render);
  render();
}

function invertRatio(target) {
  let lo = 0, hi = 1.6;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (ratioModel(mid) < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function initUnknown() {
  const select = q("#unknownSelect");
  const button = q("#measureUnknown");
  const canvas = q("#unknownChart");
  let measured = null;
  const render = () => {
    const actual = Number(select.value);
    const base = standards.map(c => ({ x: c, y: ratioModel(c) }));
    const curve = Array.from({length:81}, (_, i) => ({x:i*.02,y:ratioModel(i*.02)}));
    const series = [{data:curve,color:COLORS.blue,width:2},{data:base,color:COLORS.cyan,points:true,width:0}];
    if (measured) series.push({data:[measured],color:COLORS.amber,points:true,width:0});
    drawChart(canvas, series, { xMin:0,xMax:1.6,yMin:.65,yMax:1.25,xLabel:"NaCl 농도 (M)",yLabel:"흡광도비",xTicks:8,xFormat:v=>v.toFixed(1) });
    if (!measured) return;
    const prediction = invertRatio(measured.y);
    const error = Math.abs(prediction - actual) / actual * 100;
    q("#measuredRatio").textContent = measured.y.toFixed(3);
    q("#predicted").textContent = `${prediction.toFixed(2)} M`;
    q("#actual").textContent = `${actual.toFixed(2)} M`;
    q("#relativeError").textContent = `${error.toFixed(1)}%`;
  };
  button.addEventListener("click", () => {
    const actual = Number(select.value);
    const offset = actual < 1 ? .009 : -.012;
    measured = { x: invertRatio(ratioModel(actual) + offset), y: ratioModel(actual) + offset };
    render();
  });
  select.addEventListener("change", () => { measured = null; render(); });
  window.addEventListener("resize", render);
  render();
}

function initControls() {
  const ids = ["salt", "ph", "temp", "dye"];
  const canvas = q("#controlsChart");
  const render = () => {
    const values = Object.fromEntries(ids.map(id => [id, Number(q(`#${id}`).value)]));
    q("#saltValue").textContent = `${values.salt.toFixed(1)} M`;
    q("#phValue").textContent = values.ph.toFixed(2);
    q("#tempValue").textContent = `${values.temp.toFixed(0)} ℃`;
    q("#dyeValue").textContent = `${values.dye.toFixed(2)} mL`;
    const baseline = spectrum(values.salt);
    const changed = spectrum(values.salt, {pH:values.ph,temp:values.temp,dye:values.dye});
    drawChart(canvas,[{data:baseline.points,color:COLORS.blue,width:2},{data:changed.points,color:COLORS.amber,width:3}],{xMin:400,xMax:700,yMin:0,yMax:.9,xLabel:"파장 (nm)",yLabel:"흡광도 (가상)",xFormat:v=>v.toFixed(0)});
    const stable = Math.abs(values.ph-8.2)<=.05 && Math.abs(values.temp-25)<=1 && Math.abs(values.dye-.2)<.001;
    q("#controlStatus").className = `status ${stable ? "" : "danger"}`;
    q("#controlStatus").textContent = stable ? "통제 조건 충족" : "통제 조건 이탈";
  };
  ids.forEach(id => q(`#${id}`).addEventListener("input", render));
  window.addEventListener("resize", render);
  render();
}

function initErrors() {
  const canvas = q("#errorChart");
  const render = () => {
    const active = Object.fromEntries(qa("[data-error]").map(el => [el.dataset.error, el.checked]));
    const clean = spectrum(.8);
    const changed = spectrum(.8, {
      pH: active.ph ? 8.32 : 8.2,
      temp: active.temp ? 28 : 25,
      bubble: active.bubble,
      fingerprint: active.fingerprint,
      noise: active.noise ? .012 : 0
    });
    drawChart(canvas,[{data:clean.points,color:COLORS.cyan,width:2},{data:changed.points,color:COLORS.danger,width:2.7}],{xMin:400,xMax:700,yMin:0,yMax:.6,xLabel:"파장 (nm)",yLabel:"흡광도 (가상)",xFormat:v=>v.toFixed(0)});
    const count = Object.values(active).filter(Boolean).length;
    q("#errorStatus").className = `status ${count ? "danger" : ""}`;
    q("#errorStatus").textContent = count ? `${count}개 오차 활성화` : "정상 측정";
  };
  qa("[data-error]").forEach(el => el.addEventListener("change", render));
  q("#resetErrors").addEventListener("click", () => { qa("[data-error]").forEach(el => el.checked=false); render(); });
  window.addEventListener("resize", render);
  render();
}

function initWorkflow() {
  const details = [
    ["원액 제조", "2.00 M NaCl 원액과 0.04% mCP 원액을 제조합니다.", ["NaCl 23.376 g을 녹여 최종 200 mL", "mCP 원액은 차광 보관", "모든 시료에 동일한 원액 사용"]],
    ["농도별 시료", "NaCl 농도만 달리하고 나머지 조건은 동일하게 맞춥니다.", ["최종 부피 10.00 mL", "각 농도에서 독립 시료 3개", "pH 8.2, 25±1℃ 확인"]],
    ["바탕 보정", "각 NaCl 농도에 대응하는 mCP 제외 바탕용액으로 영점을 맞춥니다.", ["NaCl·완충용액·증류수 포함", "농도별 바탕용액 사용", "용매 배경과 산란 영향 감소"]],
    ["스펙트럼 측정", "400~700 nm 범위의 흡수 스펙트럼을 같은 조건에서 저장합니다.", ["혼합 후 3분에 측정", "큐벳 방향과 청결 유지", "CSV 또는 XLSX로 저장"]],
    ["검량선 작성", "농도별 평균과 표준편차를 계산하고 스펙트럼 지표와 농도의 관계를 모델링합니다.", ["A₄₃₄, A₅₇₈, 흡광도비 비교", "잔차·RMSE·과적합 검토", "단순하고 재현성 높은 모델 선택"]],
    ["미지 시료 검증", "검량선에 사용하지 않은 시료의 농도를 예측하고 상대오차를 계산합니다.", ["제조자와 분석자 역할 분리", "0.7 M와 1.3 M 사용", "실제값 공개 후 상대오차 계산"]]
  ];
  const renderDetail = index => {
    qa(".step").forEach((step,i)=>step.classList.toggle("active",i===index));
    const [title, desc, bullets] = details[index];
    q("#stepIndex").textContent = `STEP ${String(index+1).padStart(2,"0")}`;
    q("#stepTitle").textContent = title;
    q("#stepDescription").textContent = desc;
    q("#stepBullets").innerHTML = bullets.map(item=>`<li>${item}</li>`).join("");
  };
  qa(".step").forEach((step,index)=>step.addEventListener("click",()=>renderDetail(index)));
  renderDetail(0);
}

markCurrentPage();
const page = document.body.dataset.page;
if (page === "spectrum") initSpectrum();
if (page === "calibration") initCalibration();
if (page === "unknown") initUnknown();
if (page === "controls") initControls();
if (page === "errors") initErrors();
if (page === "workflow") initWorkflow();

