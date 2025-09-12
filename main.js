// main.js —— 正式版流程控制（必須搭配四個 stages/*.js）

// ===== 狀態與導入文案 =====
const GameState = { stage:0 };
const INTRO = {
  title: '尋找線索，守護婚禮',
  lead: '有人預告會「借走」一件重要物件。請化身調查員，按順序破解四道關卡。'
};

// ===== DOM =====
const $ = (s, el=document)=> el.querySelector(s);
const app = $('#app');
const badge = $('#stageBadge');
const setStageLabel = n => {
  const m={1:'Stage1 QxQy',2:'Stage2 配對',3:'Stage3 Q1–Q4',4:'Stage4 快速點擊'};
  if(badge) badge.textContent = m[n] || '初始化';
};

// ===== 工具 =====
const pwEqual = (a,b)=>{
  if(!b) return true;
  const norm=s=>(s||'').trim().toLowerCase();
  return norm(a)===norm(b);
};
const getParams = ()=>{
  const p = new URLSearchParams(location.search);
  return {
    useModules: p.get('useModules')==='1',
    s1: p.get('s1') || '/stages/qxy.js',
    s2: p.get('s2') || '/stages/match.js',
    s3: p.get('s3') || '/stages/q14.js',
    s4: p.get('s4') || '/stages/fasttap.js',
    p2: p.get('p2') || ''
  };
};

// ===== 四關模組 =====
let Stages=[null,null,null,null,null]; // index 1-4

async function setupStages(){
  const p = getParams();
  if(!p.useModules) return;
  const adapt = m => ({ mount:()=>m.mount(), run:()=>m.run() });
  try{ const m1=await import(p.s1); if(m1.mount&&m1.run) Stages[1]=adapt(m1);}catch(e){console.error(e);}
  try{ const m2=await import(p.s2); if(m2.mount&&m2.run) Stages[2]=adapt(m2);}catch(e){console.error(e);}
  try{ const m3=await import(p.s3); if(m3.mount&&m3.run) Stages[3]=adapt(m3);}catch(e){console.error(e);}
  try{ const m4=await import(p.s4); if(m4.mount&&m4.run) Stages[4]=adapt(m4);}catch(e){console.error(e);}
}

// ===== 導入畫面 =====
function renderIntro(){
  app.innerHTML = `
    <h2>${INTRO.title}</h2>
    <p class="muted" style="font-size:16px;line-height:1.6">${INTRO.lead}</p>
    <ol class="muted" style="margin:12px 0 16px 18px">
      <li>Stage 1：守門題 QxQy</li>
      <li>Stage 2：配對遊戲</li>
      <li>Stage 3：Q1–Q4（需口令）</li>
      <li>Stage 4：快速點擊</li>
    </ol>
    <button id="startBtn" class="btn">開始查案</button>
  `;
  $('#startBtn').onclick = ()=> runPipeline();
}

// ===== Gate2（Stage2→Stage3 口令2） =====
function renderGate2(){
  const { p2 } = getParams();
  return new Promise(resolve=>{
    app.innerHTML = `
      <h2>口令關卡（前往 Stage3）</h2>
      <p class="muted">請輸入口令 2 後繼續。</p>
      <div class="row">
        <input id="pw2" type="text" placeholder="輸入口令 2" />
        <button class="btn" id="go">進入 Stage3</button>
      </div>
      <p id="pwhint2" class="muted" style="margin-top:8px"></p>
    `;
    const hint = $('#pwhint2');
    if(!p2) hint.textContent = '提示：未設定 ?p2=...（開發模式任意通過）';
    $('#go').onclick = ()=>{
      const val = $('#pw2').value;
      if(!pwEqual(val, p2)){ hint.textContent='口令不正確'; return; }
      resolve(true);
    };
    if(!p2) setTimeout(()=> resolve(true), 200);
  });
}

// ===== 主流程 =====
async function runPipeline(){
  // Stage1
  GameState.stage=1; setStageLabel(1); Stages[1].mount();
  if(!(await Stages[1].run())) return endFail('Stage1 未通過');

  // Stage2
  GameState.stage=2; setStageLabel(2); Stages[2].mount();
  if(!(await Stages[2].run())) return retryOrStop(2);

  // Gate2 → Stage3
  if(!(await renderGate2())) return endFail('口令 2 未通過');

  // Stage3
  GameState.stage=3; setStageLabel(3); Stages[3].mount();
  if(!(await Stages[3].run())) return retryOrStop(3);

  // Stage4
  GameState.stage=4; setStageLabel(4); Stages[4].mount();
  if(!(await Stages[4].run())) return retryOrStop(4);

  return endOk();
}

// ===== 結束與重試 =====
function endOk(){
  app.innerHTML = `<h2>完成</h2><p class="muted">你已完成全部關卡。</p><button class="btn" id="restart">重新開始</button>`;
  $('#restart').onclick = ()=> location.reload();
}
function endFail(msg){
  app.innerHTML = `<h2>中止</h2><p class="muted">${msg}</p><button class="btn" id="restart">重新開始</button>`;
  $('#restart').onclick = ()=> location.reload();
}
function retryOrStop(stageNo){
  app.innerHTML = `
    <h2>未通過 · Stage ${stageNo}</h2>
    <div class="row">
      <button class="btn" id="retry">重試本關</button>
      <button class="btn" id="stop" style="background:var(--bad)">結束</button>
    </div>
    <p class="muted">依原規則可重試本關。</p>`;
  $('#retry').onclick = ()=>{
    const S = Stages[stageNo]; setStageLabel(stageNo); S.mount();
    S.run().then(ok => ok ? runPipelineFrom(stageNo+1) : retryOrStop(stageNo));
  };
  $('#stop').onclick = ()=> endFail(`Stage ${stageNo} 失敗`);
}
async function runPipelineFrom(next){
  switch(next){
    case 2: { GameState.stage=2; setStageLabel(2); Stages[2].mount(); if(!(await Stages[2].run())) return retryOrStop(2); return runPipelineFrom(3); }
    case 3: { GameState.stage=3; setStageLabel(3); Stages[3].mount(); if(!(await Stages[3].run())) return retryOrStop(3); return runPipelineFrom(4); }
    case 4: { GameState.stage=4; setStageLabel(4); Stages[4].mount(); if(!(await Stages[4].run())) return retryOrStop(4); return endOk(); }
    default: return endOk();
  }
}

// ===== 啟動 =====
setupStages().finally(()=> renderIntro());
