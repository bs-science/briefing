const byId = id => document.getElementById(id);

function setupSpectrumSimulation() {
  const canvas = byId("spectrum-chart"); if (!canvas) return;
  const slider = byId("salt-range");
  const render = () => {
    const c = Number(slider.value); const base = illustrativeSpectrum(0); const current = illustrativeSpectrum(c);
    byId("salt-output").textContent = `${c.toFixed(1)} M`;
    byId("a434-output").textContent = current.a434.toFixed(3);
    byId("a578-output").textContent = current.a578.toFixed(3);
    byId("ratio-output").textContent = current.ratio.toFixed(3);
    drawChart(canvas,[{data:base.data,color:CHART_COLORS.blue,width:1.8},{data:current.data,color:CHART_COLORS.cyan,width:3}],{xMin:400,xMax:700,yMin:0,yMax:.55,xLabel:"파장 (nm)",yLabel:"흡광도 (가상)",xFormat:v=>v.toFixed(0),guides:[{x:434,label:"434",color:CHART_COLORS.amber},{x:578,label:"578",color:CHART_COLORS.violet}]});
  };
  slider.addEventListener("input",render);window.addEventListener("resize",render);render();
}

function setupControlSimulation() {
  const canvas=byId("control-chart"); if(!canvas)return;
  const ph=byId("ph-range"),temp=byId("temp-range");
  const render=()=>{const p=Number(ph.value),t=Number(temp.value);const base=illustrativeSpectrum(.8);const changed=illustrativeSpectrum(.8,{pH:p,temp:t});byId("ph-output").textContent=p.toFixed(2);byId("temp-output").textContent=`${t.toFixed(0)} ℃`;const ok=Math.abs(p-8.2)<=.05&&Math.abs(t-25)<=1;byId("control-state").textContent=ok?"통제 범위 안":"통제 범위 이탈";byId("control-state").className=`status ${ok?"":"warn"}`;drawChart(canvas,[{data:base.data,color:CHART_COLORS.blue,width:2},{data:changed.data,color:CHART_COLORS.amber,width:3}],{xMin:400,xMax:700,yMin:0,yMax:.62,xLabel:"파장 (nm)",yLabel:"흡광도 (가상)",xFormat:v=>v.toFixed(0)});};
  ph.addEventListener("input",render);temp.addEventListener("input",render);window.addEventListener("resize",render);render();
}

function setupCalibrationSimulation() {
  const canvas=byId("calibration-chart"); if(!canvas)return;
  const standards=[0,.2,.4,.6,.8,1.0,1.2,1.6];
  let unknown=null;
  const render=()=>{const curve=Array.from({length:81},(_,i)=>({x:i*.02,y:illustrativeRatio(i*.02)}));const points=standards.map(c=>({x:c,y:illustrativeRatio(c)}));const series=[{data:curve,color:CHART_COLORS.cyan,width:2.5},{data:points,color:CHART_COLORS.blue,points:true,width:0}];if(unknown)series.push({data:[unknown],color:CHART_COLORS.amber,points:true,width:0});drawChart(canvas,series,{xMin:0,xMax:1.6,yMin:.65,yMax:1.25,xLabel:"NaCl 농도 (M)",yLabel:"A₅₇₈/A₄₃₄",xTicks:8,xFormat:v=>v.toFixed(1)});};
  byId("unknown-button").addEventListener("click",()=>{const actual=Number(byId("unknown-select").value);const measured=illustrativeRatio(actual)+(actual<1?.009:-.012);const prediction=invertIllustrativeRatio(measured);unknown={x:prediction,y:measured};byId("prediction-output").textContent=`${prediction.toFixed(2)} M`;byId("error-output").textContent=`${(Math.abs(prediction-actual)/actual*100).toFixed(1)}%`;render();});
  window.addEventListener("resize",render);render();
}

function setupErrorSimulation() {
  const canvas=byId("error-chart"); if(!canvas)return;
  const render=()=>{const active=Object.fromEntries([...document.querySelectorAll("[data-error]")].map(el=>[el.dataset.error,el.checked]));const base=illustrativeSpectrum(.8);const changed=illustrativeSpectrum(.8,{pH:active.ph?8.32:8.2,temp:active.temp?28:25,bubble:active.bubble,fingerprint:active.fingerprint,noise:active.noise?.012:0});const count=Object.values(active).filter(Boolean).length;byId("error-state").textContent=count?`${count}개 오차 적용`:"정상 측정";byId("error-state").className=`status ${count?"warn":""}`;drawChart(canvas,[{data:base.data,color:CHART_COLORS.cyan,width:2},{data:changed.data,color:CHART_COLORS.coral,width:2.7}],{xMin:400,xMax:700,yMin:0,yMax:.62,xLabel:"파장 (nm)",yLabel:"흡광도 (가상)",xFormat:v=>v.toFixed(0)});};
  document.querySelectorAll("[data-error]").forEach(el=>el.addEventListener("change",render));window.addEventListener("resize",render);render();
}

setupSpectrumSimulation();setupControlSimulation();setupCalibrationSimulation();setupErrorSimulation();

