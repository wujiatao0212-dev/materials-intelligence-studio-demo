"use strict";

const figures = [
  {src:"assets/v2-matlab-comsol-profile.png",title:"Reduced MoS₂ thermal verification",type:"COMSOL 6.0 / MATLAB R2024a",source:"Saved V2 COMSOL mesh-node profile and MATLAB analytical check.",meaning:"The specified reduced steady equation is numerically reproduced for illustrative inputs.",limit:"This is not a measured MoS₂ device temperature or an identified film conductivity."},
  {src:"assets/v5-thermal-evidence.png",title:"Literature-informed thermal reference",type:"MoS₂ V5 / COMSOL",source:"Saved V5 parameter-evidence figure using the Gertych restacked-film thermal reference.",meaning:"Reported thermal inputs and assumed terms are displayed separately.",limit:"The restacked sample is not the private Fe-containing AACVD film."},
  {src:"assets/v7-silicon-slice-clean.png",title:"Genuine 3D Si temperature field",type:"COMSOL 6.0 / verified VTU slice",source:"Hash-checked V7 3D silicon solution and complete section at z = −1 µm.",meaning:"The silicon field is genuinely solved and linked to a saved MPH.",limit:"The MoS₂ and oxide fields were not solved in 3D; their mean drops are algebraic."},
  {src:"assets/yalon-five-point-audit.png",title:"Five published-figure readings",type:"V7 / MATLAB + Python audit",source:"Five manually read Yalon et al. Figure 3a markers and saved reduced-model response.",meaning:"The five point-by-point residuals have mixed signs.",limit:"The same publication supplied fitted silicon conductivity and interface conductance; this is not independent validation."},
  {src:"assets/battery-solver-comparison.png",title:"LG M50 cross-solver voltage",type:"COMSOL 6.0 / PyBaMM 25.10.2",source:"Genuine 111-time pinned Chen2020 isothermal 5 A solver exports.",meaning:"Maximum voltage difference 3.926163 mV and RMSE 0.800538 mV.",limit:"Exact model-form equivalence and experimental cell validation are not established."},
  {src:"assets/battery-lithium-inventory.png",title:"Total lithium conservation",type:"COMSOL / PyBaMM / MATLAB",source:"Saved V3.3 domain-integrated solver fields.",meaning:"Both start at 0.289333815 mol and total inventory drifts only near floating-point scale.",limit:"Global inventory agreement does not prove local equation identity."},
  {src:"assets/ocp-residual-intervention.png",title:"OCP regularisation intervention",type:"PyBaMM re-solves / MATLAB",source:"Frozen COMSOL baseline with original and OCP-only intervention PyBaMM solutions.",meaning:"Maximum terminal shift is 15.37 µV; the larger cross-solver residual remains.",limit:"The intervention is not a complete decomposition of solver or physical-model error."},
  {src:"assets/ocp-correction-discharge.png",title:"OCP correction over discharge",type:"PyBaMM 25.10.2 / MATLAB",source:"Installed source formula evaluated at genuine saved concentrations.",meaning:"The correction changes with electrode stoichiometry and sign.",limit:"Behaviour near depletion or outside the sampled state range is unverified."},
  {src:"assets/pinn-profile.png",title:"Experimental PINN pilot",type:"PyTorch / exact and finite-difference reference",source:"Existing three-seed V1 fixed-parameter pilot result.",meaning:"The neural approximation was tested against an exact solution.",limit:"It gave no measured accuracy or repeated-query speed advantage; no material parameter was learned."}
];

const steps = ["Choose reference","Inspect evidence","Set parameters","Generate result","Read report"];
const state = {
  step:0, furthest:0, selected:"mos2", gate:false, result:null,
  params:{mos2:{q:25,K:2,g:10},battery:{i:17.5}}
};
const content = document.querySelector("#step-content");
const nav = document.querySelector("#step-nav");
const dialog = document.querySelector("#figure-dialog");

function caseName(){return state.selected==="mos2"?"MoS₂ thermal":"Battery tutorial";}
function fmt(n,d=3){return Number(n).toFixed(d);}
function exact(x,K,g,q,L){const lambda=Math.sqrt(K/g);return q/g*(1-Math.cosh((x-L/2)/lambda)/Math.cosh(L/(2*lambda)));}
function finiteDifference(K,g,q,L,n){
  const h=L/(n-1),a=-K/(h*h),b=2*K/(h*h)+g,m=n-2;
  const c=new Array(m).fill(0),d=new Array(m).fill(0),y=new Array(n).fill(0);
  c[0]=a/b;d[0]=q/b;
  for(let i=1;i<m;i++){const den=b-a*c[i-1];c[i]=i===m-1?0:a/den;d[i]=(q-a*d[i-1])/den;}
  y[n-2]=d[m-1];for(let i=m-2;i>=0;i--)y[i+1]=d[i]-c[i]*y[i+2];
  return y;
}
function thermalResult(){
  const {q:qm,K:km,g:gm}=state.params.mos2,q=qm*1e6,K=km*1e-7,g=gm*1e6,L=1e-6,n=81;
  const fd=finiteDifference(K,g,q,L,n);
  const rows=fd.map((value,i)=>{const x=L*i/(n-1),analytical=exact(x,K,g,q,L);return {x_um:x*1e6,exact_K:analytical,finite_difference_K:value,error_K:value-analytical};});
  const peak=exact(L/2,K,g,q,L);
  return {kind:"thermal",params:{q_area_W_m2:q,K_W_K:K,g_W_m2_K:g,L_m:L,boundary_temperature_K:300,fd_nodes:n},peak_rise_K:peak,peak_temperature_K:300+peak,max_fd_abs_error_K:Math.max(...rows.map(r=>Math.abs(r.error_K))),rows};
}
function chargeAt(t,i){if(t<=2000)return i*t;if(t<=2300)return i*2000;if(t<=4300)return i*(4300-t);return 0;}
function batteryResult(){
  const i=state.params.battery.i;
  const times=[0,500,1000,1500,1990,2000,2300,2500,3300,4290,4300,5000,8000];
  const rows=times.map(t=>({time_s:t,applied_current_A_m2:[2000,2300,4300].includes(t)?null:t<2000?i:t<2300?0:t<4300?-i:0,signed_charge_C_m2:chargeAt(t,i)}));
  return {kind:"charge",params:{current_magnitude_A_m2:i,discharge_s:[0,2000],rest_1_s:[2000,2300],charge_s:[2300,4300],rest_2_s:[4300,8000],tutorial_nominal_1C_hour_C_m2:63000},discharge_charge_C_m2:i*2000,charge_return_C_m2:i*2000,net_charge_C_m2:0,utilisation_of_tutorial_nominal_reference_percent:i*2000/63000*100,rows};
}
function svgPath(points,X,Y){return points.map((p,i)=>`${i?"L":"M"}${X(p[0]).toFixed(2)},${Y(p[1]).toFixed(2)}`).join(" ");}
function graph(result){
  const isThermal=result.kind==="thermal";
  const data=isThermal?result.rows.map(r=>[r.x_um,r.exact_K]):result.rows.map(r=>[r.time_s,r.signed_charge_C_m2]);
  const second=isThermal?result.rows.map(r=>[r.x_um,r.finite_difference_K]):null;
  const xmax=isThermal?1:8000,ymax=Math.max(...data.map(p=>p[1]))*1.12||1;
  const X=x=>62+x/xmax*590,Y=y=>276-y/ymax*226;
  let out='<svg viewBox="0 0 700 330" role="img" aria-label="'+(isThermal?"Temperature rise profile, analytical and finite difference":"Exact integrated areal charge from the tutorial current schedule")+'"><rect width="700" height="330" fill="white"/>';
  for(let k=0;k<=4;k++){let y=Y(ymax*k/4);out+=`<line x1="62" x2="652" y1="${y}" y2="${y}" stroke="#e1e7e8"/><text x="52" y="${y+4}" text-anchor="end" font-size="11" fill="#263b45">${(ymax*k/4).toFixed(isThermal?1:0)}</text>`;}
  for(let k=0;k<=4;k++){let x=X(xmax*k/4);out+=`<text x="${x}" y="296" text-anchor="middle" font-size="11" fill="#263b45">${(xmax*k/4).toFixed(isThermal?2:0)}</text>`;}
  out+=`<line x1="62" y1="50" x2="62" y2="276" stroke="#38505d"/><line x1="62" y1="276" x2="652" y2="276" stroke="#38505d"/><path d="${svgPath(data,X,Y)}" fill="none" stroke="#087f82" stroke-width="3.5"/>`;
  if(second)out+=`<path d="${svgPath(second,X,Y)}" fill="none" stroke="#b27323" stroke-width="2" stroke-dasharray="8 5"/>`;
  out+=`<text x="355" y="323" text-anchor="middle" font-size="12" fill="#263b45">${isThermal?"Position x (µm)":"Time (s)"}</text><text x="16" y="170" transform="rotate(-90 16 170)" text-anchor="middle" font-size="12" fill="#263b45">${isThermal?"Rise θ (K)":"Charge (C/m²)"}</text></svg>`;
  return out;
}
function dataTable(result){
  const thermal=result.kind==="thermal";
  const rows=thermal?result.rows.filter((_,i)=>i%10===0):result.rows;
  const headers=thermal?["x (µm)","Exact rise (K)","FD rise (K)","FD − exact (K)"]:["Time (s)","Current (A/m²)","Signed charge (C/m²)"];
  const cells=rows.map(r=>thermal?[fmt(r.x_um,3),fmt(r.exact_K,5),fmt(r.finite_difference_K,5),r.error_K.toExponential(2)]:[r.time_s,r.applied_current_A_m2===null?"switch":fmt(r.applied_current_A_m2,2),fmt(r.signed_charge_C_m2,1)]);
  return `<div class="table-scroll"><table class="output-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${cells.map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function stepChoose(){
  return `<h3>Choose a reference case</h3><p class="intro">These are two real branches of the local Studio. Select one to follow its evidence and numerical outputs.</p>
    <div class="case-grid">
      <button class="case-card ${state.selected==="mos2"?"selected":""}" type="button" data-case="mos2" aria-pressed="${state.selected==="mos2"}"><img src="assets/v7-silicon-surface-clean.png" alt="Complete V7 3D silicon heat field"><span class="case-card-body"><small>01 / ELECTROTHERMAL</small><strong>MoS₂ thin film</strong><em>Illustrative heat-equation calculation with separate saved V5/V7 COMSOL evidence.</em></span></button>
      <button class="case-card ${state.selected==="battery"?"selected":""}" type="button" data-case="battery" aria-pressed="${state.selected==="battery"}"><img src="assets/battery-voltage-soc-clean.png" alt="Complete saved official battery tutorial voltage and state plots"><span class="case-card-body"><small>02 / ELECTROCHEMICAL</small><strong>Lithium-ion tutorial</strong><em>Source-matched current and charge accounting beside an actual saved COMSOL solution.</em></span></button>
    </div><div class="inline-callout">The private C2DB atlas contains 16,905 source-native records. It does not provide the thermal or electrochemical parameters required by either reference.</div>`;
}
function stepEvidence(){
  const mos2=state.selected==="mos2";
  const rows=mos2?[
    ["Model identity","V1 reduced 1D steady heat equation","Illustrative numerical-verification case"],
    ["Thermal inputs","q″, K, g, L and fixed boundary temperature","Declared inputs; not Fe-doped-film measurements"],
    ["Saved higher-fidelity evidence","V5 saved COMSOL model peak 336.908 K; V7 solved 3D Si field","Different models; values are not direct V1 error targets"],
    ["Missing material evidence","Specimen-specific conductivity and interface conductance","Independent device-level observations remain absent"]
  ]:[
    ["Model identity","COMSOL 6.0 official 1D carbon / LiMn₂O₄ tutorial","Isothermal tutorial, not an LG M50 cell"],
    ["Geometry","100 µm negative electrode · 52 µm separator · 174 µm positive electrode","From installed model audit"],
    ["Load and outputs","±17.5 A/m² stages; 801 points at 10 s; saved terminal voltage","Genuine solver output; no experimental cell data"],
    ["Comparable calculation","dq/dt = i_app(t); nominal reference 63,000 C/m²","MATLAB charge accounting, not a voltage or SOC solver"]
  ];
  return `<h3>Inspect the evidence before running</h3><p class="intro">The parameter gate establishes which facts support this tour's calculation. It does not convert missing material measurements into known coefficients.</p>
  <table class="evidence-table"><tbody>${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table>
  <div class="inline-callout ${state.gate?"good":""}"><strong>${state.gate?"TOUR EVIDENCE CHECKED":"REVIEW REQUIRED"}</strong> · ${mos2?"The browser will solve only the V1 reduced equation.":"The browser will integrate only the prescribed tutorial current."} The actual Studio performs its own parameter gate before a licensed run.</div>
  <div class="gate-check"><button id="check-evidence" class="button ${state.gate?"secondary":"primary"}" type="button">${state.gate?"Evidence reviewed ✓":"Check evidence for this tour"}</button><span class="gate-status ${state.gate?"ready":""}">${state.gate?"Continue to parameters":"Next step locked until review"}</span></div>`;
}
function stepParams(){
  if(state.selected==="mos2"){
    const p=state.params.mos2;
    return `<h3>Set a bounded thermal case</h3><p class="intro">The preset reproduces the original V1 browser reference. Adjusting these values creates a new analytical/finite-difference calculation, not a new COMSOL solution.</p>
    <div class="equation-card" role="math" aria-label="negative K second derivative of theta with respect to x plus g theta equals q double prime; theta at both ends equals zero">−K d²θ/dx² + gθ = q″ &nbsp;·&nbsp; θ(0) = θ(L) = 0</div>
    <div class="parameter-grid">
      <div class="parameter-card"><label for="q-input">Areal heating q″ · MW/m²</label><input id="q-input" data-param="q" type="number" min="5" max="50" step="1" value="${p.q}"><input data-slider="q" aria-label="Adjust areal heating" type="range" min="5" max="50" step="1" value="${p.q}"><small>Preset 25 · allowed 5–50</small></div>
      <div class="parameter-card"><label for="K-input">Lateral conductance K · 10⁻⁷ W/K</label><input id="K-input" data-param="K" type="number" min="0.5" max="5" step="0.1" value="${p.K}"><input data-slider="K" aria-label="Adjust lateral conductance" type="range" min="0.5" max="5" step="0.1" value="${p.K}"><small>Preset 2.0 · allowed 0.5–5</small></div>
      <div class="parameter-card"><label for="g-input">Substrate loss g · MW/(m² K)</label><input id="g-input" data-param="g" type="number" min="2" max="20" step="0.5" value="${p.g}"><input data-slider="g" aria-label="Adjust substrate loss" type="range" min="2" max="20" step="0.5" value="${p.g}"><small>Preset 10 · allowed 2–20</small></div>
    </div><div class="live-preview"><div class="plot-panel" id="live-preview-plot"></div><aside><span class="kicker">LIVE ANALYTICAL PREVIEW</span><strong id="live-preview-value"></strong><p>Changing a slider updates this reduced 1D model immediately. The verified 3D COMSOL field below remains the saved V7 result.</p></aside></div><div class="inline-callout good">Fixed geometry L = 1 µm; end temperature 300 K; 81-node finite-difference check. All are illustrative V1 inputs.</div><button id="reset-params" class="button secondary" type="button">Restore V1 preset</button>`;
  }
  const p=state.params.battery;
  return `<h3>Set the prescribed current</h3><p class="intro">The preset is the installed official tutorial's 1C current magnitude. The browser integrates a source-matched piecewise schedule; only the unchanged 17.5 A/m² preset corresponds to the saved COMSOL voltage plot.</p>
  <div class="equation-card" role="math" aria-label="rate of change of areal charge equals applied current">dq/dt = i<sub>app</sub>(t) &nbsp;·&nbsp; q(0) = 0</div>
  <div class="parameter-grid"><div class="parameter-card"><label for="i-input">Current magnitude · A/m²</label><input id="i-input" data-param="i" type="number" min="5" max="25" step="0.5" value="${p.i}"><input data-slider="i" aria-label="Adjust applied current" type="range" min="5" max="25" step="0.5" value="${p.i}"><small>Official tutorial preset 17.5</small></div><div class="parameter-card"><label>Discharge</label><strong>0–2000 s</strong><small>+i; source-defined stage</small></div><div class="parameter-card"><label>Charge</label><strong>2300–4300 s</strong><small>−i; rest otherwise to 8000 s</small></div></div><div class="live-preview"><div class="plot-panel" id="live-preview-plot"></div><aside><span class="kicker">LIVE CHARGE PREVIEW</span><strong id="live-preview-value"></strong><p>This is exact integration of the chosen current. It does not recalculate COMSOL voltage or electrode SOC.</p></aside></div>
  <div class="inline-callout">Nominal tutorial 1C-hour reference: 17.5 A/m² × 3600 s = 63,000 C/m². The resulting charge fraction is not the COMSOL electrode-average SOC.</div><button id="reset-params" class="button secondary" type="button">Restore tutorial preset</button>`;
}
function stepRun(){
  const thermal=state.selected==="mos2",r=state.result;
  let resultHtml="";
  if(r){
    resultHtml=thermal?`<div class="readouts"><div class="readout"><span>Analytical peak rise</span><strong>${fmt(r.peak_rise_K,4)} K</strong></div><div class="readout"><span>Peak temperature</span><strong>${fmt(r.peak_temperature_K,3)} K</strong></div><div class="readout"><span>Max FD-node error</span><strong>${r.max_fd_abs_error_K.toExponential(2)} K</strong></div></div>`:
    `<div class="readouts"><div class="readout"><span>Discharge charge</span><strong>${fmt(r.discharge_charge_C_m2,0)} C/m²</strong></div><div class="readout"><span>Net external charge</span><strong>0 C/m²</strong></div><div class="readout"><span>Of tutorial 1C-hour</span><strong>${fmt(r.utilisation_of_tutorial_nominal_reference_percent,2)}%</strong></div></div>`;
    resultHtml+=`<div class="result-layout"><div class="plot-panel">${graph(r)}</div><div class="saved-panel"><img src="${thermal?"assets/v5-thermal-evidence.png":"assets/battery-voltage-soc-clean.png"}" alt="${thermal?"Complete saved V5 parameter evidence figure, separate from V1 browser calculation":"Complete saved official COMSOL battery voltage and SOC figure"}"><div><strong>${thermal?"SAVED COMSOL V5 · SEPARATE MODEL":"SAVED COMSOL 6.0 TUTORIAL · ACTUAL SOLVE"}</strong><small>${thermal?"336.908 K film peak under V5 assumptions. It is not the V1 browser peak.":"801 saved time points; terminal voltage 4.10059 → 4.21766 V. Altered browser current does not re-solve voltage."}</small></div></div></div>${dataTable(r)}<div class="download-actions"><button id="download-csv" class="button secondary" type="button">Download generated CSV</button><span class="output-badge">BROWSER-CALCULATED · SOURCE-LABELLED</span></div>`;
  }
  return `<h3>Generate and inspect the result</h3><p class="intro">${thermal?"Solve the declared V1 equation analytically and with an independent 81-node finite difference grid.":"Integrate the official tutorial's four-stage current schedule. Saved COMSOL voltage and electrode SOC remain separate solver observations."}</p>
    <button id="run-browser" class="button primary run-action" type="button">${r?"Regenerate calculation":"Generate numerical result"} ↗</button>
    ${r?resultHtml:`<div class="inline-callout">No result generated yet. The button runs only the declared browser calculation; it does not start a remote COMSOL or MATLAB process.</div>`}`;
}
function stepReport(){
  const r=state.result,thermal=r.kind==="thermal";
  const metrics=thermal?
    `<div><dt>Exact peak rise</dt><dd>${fmt(r.peak_rise_K,4)} K</dd></div><div><dt>Finite-difference maximum error</dt><dd>${r.max_fd_abs_error_K.toExponential(2)} K</dd></div>`:
    `<div><dt>Integrated discharge</dt><dd>${fmt(r.discharge_charge_C_m2,0)} C/m²</dd></div><div><dt>Cycle net external charge</dt><dd>0 C/m²</dd></div>`;
  const boundary=thermal?"The saved V5 model peak of 336.908 K and the V7 3D silicon field are distinct COMSOL results. The browser V1 calculation is not an independent experimental validation of an Fe-containing device.":"The browser calculation checks the imposed current and integrated areal charge. The saved COMSOL voltage and electrode-average SOC come from the tutorial PDE solution; MATLAB charge fraction is a different state definition. Changing current here does not re-solve the tutorial.";
  return `<h3>A report with claims attached</h3><p class="intro">This concise record can be downloaded with the exact inputs and generated rows. The original research reports remain available below.</p>
  <div class="report-paper"><div class="paper-kicker">MATERIALS INTELLIGENCE STUDIO · GENERATED PUBLIC TOUR RECORD</div><h4>${thermal?"MoS₂ reduced electrothermal equation":"Official battery tutorial charge accounting"}</h4>
  <p><strong>Method.</strong> ${thermal?"Analytical solution and an 81-node finite-difference discretisation of the declared V1 steady 1D equation.":"Exact time integration of the declared four-stage current program; nominal 1C-hour comparison uses the official 17.5 A/m² reference."}</p>
  <dl>${metrics}<div><dt>Input preset state</dt><dd>${thermal?(state.params.mos2.q===25&&state.params.mos2.K===2&&state.params.mos2.g===10?"V1 preset":"Modified illustrative"):(state.params.battery.i===17.5?"Tutorial preset":"Modified current")}</dd></div><div><dt>Experimental validation</dt><dd>Not established</dd></div></dl>
  <p class="paper-limit"><strong>Interpretation boundary.</strong> ${boundary}</p></div>
  <div class="download-actions"><button id="download-json" class="button primary" type="button">Download reproducible JSON</button><button id="download-csv" class="button secondary" type="button">Download generated CSV</button></div>
  <div class="report-links"><a class="button secondary" href="downloads/Materials_Intelligence_Studio_Research_Overview.pdf">Research overview PDF</a><a class="button secondary" href="downloads/Selected_Scientific_Results.pdf">Result figures PDF</a><a class="button secondary" href="downloads/Reproducibility_Appendix.pdf">Reproducibility PDF</a></div>`;
}
function render(){
  nav.innerHTML=steps.map((label,i)=>`<button type="button" data-step="${i}" class="${i===state.step?"active":i<state.step?"done":""}" ${i>state.furthest?"disabled":""} ${i===state.step?'aria-current="step"':""}><span class="step-num">${String(i+1).padStart(2,"0")}</span>${label}</button>`).join("");
  document.querySelector("#step-kicker").textContent=`STEP ${String(state.step+1).padStart(2,"0")} / 05`;
  document.querySelector("#case-tag").textContent=caseName();
  content.innerHTML=[stepChoose,stepEvidence,stepParams,stepRun,stepReport][state.step]();
  document.querySelector("#previous-step").disabled=state.step===0;
  const next=document.querySelector("#next-step");
  next.disabled=state.step===4||(state.step===1&&!state.gate)||(state.step===3&&!state.result);
  next.textContent=state.step===3?"Build report →":"Continue →";
  document.querySelector("#step-count").textContent=`${state.step+1} of 5 · ${caseName()}`;
  if(state.step===2)renderLivePreview();
}
function renderLivePreview(){
  const plot=document.querySelector("#live-preview-plot"),value=document.querySelector("#live-preview-value");
  if(!plot||!value)return;
  const r=state.selected==="mos2"?thermalResult():batteryResult();
  plot.innerHTML=graph(r);
  value.textContent=r.kind==="thermal"?`${fmt(r.peak_temperature_K,2)} K peak`:`${fmt(r.discharge_charge_C_m2,0)} C/m²`;
}
function move(delta){const next=state.step+delta;if(next<0||next>4)return;if(delta>0&&((state.step===1&&!state.gate)||(state.step===3&&!state.result)))return;state.step=next;state.furthest=Math.max(state.furthest,next);render();document.querySelector("#tour").scrollIntoView({behavior:"smooth",block:"start"});}
function csvText(r){
  const keys=r.kind==="thermal"?["x_um","exact_K","finite_difference_K","error_K"]:["time_s","applied_current_A_m2","signed_charge_C_m2"];
  return keys.join(",")+"\n"+r.rows.map(row=>keys.map(k=>row[k]===null?"":row[k]).join(",")).join("\n")+"\n";
}
function download(name,body,type){const blob=new Blob([body],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function reportJSON(){
  const r=state.result;
  return {record_type:"public_browser_research_tour",generated_at:new Date().toISOString(),case:state.selected,calculation:r,source_reference:state.selected==="mos2"?"simulations/mos2_electrothermal_v1/matlab/default_parameters.m":"COMSOL 6.0 official 1D lithium-ion tutorial; docs/studio_battery_model_audit.md",saved_solver_result_separate:true,independent_experimental_validation:false,warning:state.selected==="mos2"?"V1 browser calculation is illustrative; saved V5/V7 COMSOL results belong to different models.":"Current integration is not a voltage or electrode-SOC solver. Changed current does not change saved COMSOL results."};
}
content.addEventListener("click",e=>{
  const choice=e.target.closest("[data-case]");
  if(choice){state.selected=choice.dataset.case;state.gate=false;state.result=null;state.furthest=0;render();return;}
  if(e.target.closest("#check-evidence")){state.gate=true;render();return;}
  if(e.target.closest("#reset-params")){state.params[state.selected]=state.selected==="mos2"?{q:25,K:2,g:10}:{i:17.5};state.result=null;state.furthest=Math.min(state.furthest,2);render();return;}
  if(e.target.closest("#run-browser")){state.result=state.selected==="mos2"?thermalResult():batteryResult();render();return;}
  if(e.target.closest("#download-csv")&&state.result){download(`studio_${state.selected}_browser_calculation.csv`,csvText(state.result),"text/csv");return;}
  if(e.target.closest("#download-json")&&state.result){download(`studio_${state.selected}_tour_record.json`,JSON.stringify(reportJSON(),null,2)+"\n","application/json");}
});
content.addEventListener("input",e=>{
  const input=e.target.closest("[data-param],[data-slider]");if(!input)return;
  const key=input.dataset.param||input.dataset.slider;
  const value=Number(input.value),min=Number(input.min),max=Number(input.max);
  state.result=null;state.furthest=Math.min(state.furthest,2);
  nav.querySelectorAll("[data-step]").forEach(button=>{if(Number(button.dataset.step)>2)button.disabled=true;});
  if(Number.isFinite(value)&&value>=min&&value<=max){state.params[state.selected][key]=value;
    const counterpart=content.querySelector(input.dataset.slider?`[data-param="${key}"]`:`[data-slider="${key}"]`);
    if(counterpart)counterpart.value=value;
    renderLivePreview();
  }
  document.querySelector("#next-step").disabled=!(Number.isFinite(value)&&value>=min&&value<=max);
});
content.addEventListener("change",e=>{
  const input=e.target.closest("[data-param]");if(!input)return;
  const value=Number(input.value),min=Number(input.min),max=Number(input.max);
  if(!Number.isFinite(value)){input.value=state.params[state.selected][input.dataset.param];return;}
  const bounded=Math.max(min,Math.min(max,value));input.value=bounded;state.params[state.selected][input.dataset.param]=bounded;state.result=null;state.furthest=Math.min(state.furthest,2);render();
});
nav.addEventListener("click",e=>{const button=e.target.closest("[data-step]");if(!button||button.disabled)return;state.step=Number(button.dataset.step);render();});
document.querySelector("#previous-step").addEventListener("click",()=>move(-1));
document.querySelector("#next-step").addEventListener("click",()=>move(1));

const galleryIndices=[1,3,5,6,7,8];
document.querySelector("#gallery").innerHTML=galleryIndices.map(i=>`<button type="button" data-figure="${i}" aria-label="Inspect ${figures[i].title}"><img src="${figures[i].src}" alt="${figures[i].title}" loading="lazy"><span>${figures[i].title}</span></button>`).join("");
document.querySelector("#results-atlas").addEventListener("click",e=>{
  const button=e.target.closest("[data-figure]");if(!button)return;
  const f=figures[Number(button.dataset.figure)];
  document.querySelector("#dialog-image").src=f.src;document.querySelector("#dialog-image").alt=f.title;
  document.querySelector("#dialog-copy").innerHTML=`<h3>${f.title}</h3><p><strong>Source:</strong> ${f.source}</p><p><strong>What it shows:</strong> ${f.meaning}</p><p><strong>Interpretation limit:</strong> ${f.limit}</p>`;
  dialog.showModal();
});
dialog.querySelector(".dialog-close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
let figureZoom=1;
document.querySelector("#figure-zoom-in").addEventListener("click",()=>{figureZoom=Math.min(3,figureZoom+0.25);document.querySelector("#dialog-image").style.width=`${figureZoom*100}%`;});
document.querySelector("#figure-zoom-out").addEventListener("click",()=>{figureZoom=Math.max(1,figureZoom-0.25);document.querySelector("#dialog-image").style.width=`${figureZoom*100}%`;});
render();
