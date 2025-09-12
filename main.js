// main.js —— 合體流程 Orchestrator（純離線）
// 可選動態模組：?useModules=1&s1=/stages/qxy.js&s2=/stages/match.js&s3=/stages/q14.js&s4=/stages/fasttap.js

// ===== 全域狀態與導入文案 =====
const GameState = { stage:0, seed:Date.now(), score:0 };
const INTRO = {
  title: '尋找線索，守護婚禮',
  lead: '有人預告會「借走」一件重要物件。請你化身調查員，按順序破解四道關卡，找出真相並守護儀式。'
};
const Test = (()=>{ const p=new URLSearchParams(location.search); return {
  e2e:p.get('e2e')==='1',
  failStage:p.get('failStage')?Number(p.get('failStage')):null
};})();

// ===== DOM helpers =====
const $ = (sel, el=document) => el.querySelector(sel);
const app = $('#app');
const badge = $('#stageBadge');
function setStageLabel(n){
  const map={1:'Stage1 QxQy',2:'Stage2 配對',3:'Stage3 Q1–Q4',4:'Stage4 快速點擊'};
  badge.textContent = map[n] || '初始化';
}
function pwEqual(input, target){
  if(!target) return true;
  const norm=s=>(s||'').trim().toLowerCase();
  return norm(input)===norm(target);
}

// ===== 內建四關（若以 ESM 匯入會覆蓋） =====
const Stage1_QxQy = {
  mount(){ app.innerHTML = `
      <h2>Stage1: 問題 QxQy</h2>
      <div id="qxy-root"></div>
      <div class="row"><button id="debugPass" class="btn">暫代通過</button></div>
      <p class="muted">在此掛載 1strisk 的 QxQy 畫面與檢核。</p>`;
    $('#debugPass').addEventListener('click', ()=> this._resolve?.(true));
    if(Test.e2e){ setTimeout(()=> this._resolve?.(Test.failStage===1?false:true), 100); }
  },
  run(){ return new Promise(r=> this._resolve=r); }
};

const Stage2_Match = {
  mount(){ app.innerHTML = `
      <h2>Stage2: 配對遊戲</h2>
      <div id="match-root"></div>
      <div class="row">
        <button id="debugPass" class="btn">暫代通過</button>
        <button id="debugFail" class="btn" style="background:var(--bad)">暫代失敗</button>
      </div>
      <p class="muted">在此掛載 doubletap 的配對邏輯與結算。</p>`;
    $('#debugPass').addEventListener('click', ()=> this._resolve?.(true));
    $('#debugFail').addEventListener('click', ()=> this._resolve?.(false));
    if(Test.e2e){ setTimeout(()=> this._resolve?.(Test.failStage===2?false:true), 100); }
  },
  run(){ return new Promise(r=> this._resolve=r); }
};

const Stage3_Q14 = {
  mount(){ app.innerHTML = `
      <h2>Stage3: 問題 Q1–Q4</h2>
      <div id="q14-root"></div>
      <p class="muted">保留：打字機效果、答錯轉頁。</p>
      <div class="row"><button id="debugPass" class="btn">暫代全對</button></div>`;
    $('#debugPass').addEventListener('click', ()=> this._resolve?.(true));
    if(Test.e2e){ setTimeout(()=> this._resolve?.(Test.failStage===3?false:true), 100); }
  },
  run(){ return new Promise(r=> this._resolve=r); }
};

const Stage4_FastTap = {
  mount(){ app.innerHTML = `
      <h2>Stage4: 快速點擊文字</h2>
      <div id="tap-root"></div>
      <div class="row">
        <button id="debugPass" class="btn">暫代完成</button>
        <button id="debugFail" class="btn" style="background:var(--bad)">暫代失敗</button>
      </div>
      <p class="muted">在此掛載既有的字母快速點擊。</p>`;
    $('#debugPass').addEventListener('click', ()=> this._resolve?.(true));
    $('#debugFail').addEventListener('click', ()=> this._resolve?.(false));
    if(Test.e2e){ setTimeout(()=> this._resolve?.(Test.failStage===4?false:true), 100); }
  },
  run(){ return new Promise(r=> this._resolve=r); }
};

let Stages = [null, Stage1_QxQy, Stage2_Match, Stage3_Q14, Stage4_FastTap];

// ===== 動態載入外部模組（可連結 4 部分） =====
async function setupStages(){
  const p = new URLSearchParams(location.search);
  if(p.get('useModules') !== '1') return;
  const paths = {
    s1: p.get('s1') || '/stages/qxy.js',
    s2: p.get('s2') || '/stages/match.js',
    s3: p.get('s3') || '/stages/q14.js',
    s4: p.get('s4') || '/stages/fasttap.js'
  };
  const adapt = (m)=> ({ mount:(...a)=>m.mount?.(...a), run:(...a)=>m.run?.(...a) });
  try{ const m1=await import(paths.s1); if(m1.mount&&m1.run) Stages[1]=adapt(m1);}catch{}
  try{ const m2=await import(paths.s2); if(m2.mount&&m2.run) Stages[2]=adapt(m2);}catch{}
  try{ const m3=await import(paths.s3); if(m3.mount&&m3.run) Stages[3]=adapt(m3);}catch{}
  try{ const m4=await import(paths.s4); if(m4.mount&&m4.run) Stages[4]=adapt(m4);}catch{}
}

// ===== 導入畫面（標題＋查案說明） =====
function renderIntro(){
  app.innerHTML = `
    <h2>${INTRO.title}</h2>
    <p class="muted" style="font-size:16px;line-height:1.6">${INTRO.lead}</p>
    <ol class="muted" style="margin:12px 0 16px 18px">
      <li>Stage 1：守門題 Qx/Qy</li>
      <li>Stage 2：配對遊戲</li>
      <li>Stage 3：Q1–Q4（需口令）</li>
      <li>Stage 4：快速點擊</li>
    </ol>
    <button id="startBtn" class="btn">開始查案</button>
  `;
  $('#startBtn').onclick = ()=> runPipeline();
}

// ===== Gate2（Stage2 → Stage3 的口令2） =====
function parseQuery(){
  const p = new URLSearchParams(location.search);
  return { p2:p.get('p2')||'', e2e:p.get('e2e')==='1' };
}
function renderGate2(){
  const { p2, e2e } = parseQuery();
  return new Promise(resolve=>{
    app.innerHTML = `
      <h2>口令關卡（前往 Stage3）</h2>
      <p class="muted">主持人口頭公布 <strong>口令 2</strong>。輸入正確後進入 Stage3。</p>
      <div class="row">
        <input id="pw2" type="text" placeholder="輸入口令 2" />
        <button class="btn" id="go">進入 Stage3</button>
      </div>
      <p id="pwhint2" class="muted" style="margin-top:8px"></p>
    `;
    const hint = $('#pwhint2');
    if(!p2){ hint.textContent = '提醒：URL 未設定 p2。暫以任意值通過（開發模式）。'; }
    $('#go').addEventListener('click', ()=>{
      const val = $('#pw2').value;
      if(!pwEqual(val, p2)){ hint.textContent = '口令不正確。'; return; }
      resolve(true);
    });
    if(e2e){ setTimeout(()=> resolve(true), 200); }
  });
}

// ===== 主流程（四關依序） =====
async function runPipeline(){
  // Stage1
  GameState.stage = 1; setStageLabel(1); Stages[1].mount();
  if(!(await Stages[1].run())) return endFail('Stage1 未通過');

  // Stage2
  GameState.stage = 2; setStageLabel(2); Stages[2].mount();
  const s2ok = await Stages[2].run(); if(!s2ok) return retryOrStop(2);

  // Gate2 → Stage3
  const okGate2 = await renderGate2(); if(!okGate2) return endFail('口令 2 未通過');

  // Stage3
  GameState.stage = 3; setStageLabel(3); Stages[3].mount();
  if(!(await Stages[3].run())) return retryOrStop(3);

  // Stage4
  GameState.stage = 4; setStageLabel(4); Stages[4].mount();
  const s4ok = await Stages[4].run(); if(!s4ok) return retryOrStop(4);

  return endOk();
}

// ===== 結束與重試 =====
function endOk(){
  app.innerHTML = `<h2>完成</h2><p class="muted">恭喜，你已完成全部關卡。</p><button class="btn" id="restart">重新開始</button>`;
  $('#restart').addEventListener('click', ()=> location.reload());
}
function endFail(msg){
  app.innerHTML = `<h2>中止</h2><p class="muted">${msg}</p><button class="btn" id="restart">重新開始</button>`;
  $('#restart').addEventListener('click', ()=> location.reload());
}
function retryOrStop(stageNo){
  app.innerHTML = `
    <h2>未通過 · Stage ${stageNo}</h2>
    <div class="row">
      <button class="btn" id="retry">重試本關</button>
      <button class="btn" id="stop" style="background:var(--bad)">結束</button>
    </div>
    <p class="muted">依原規則你可選擇重試本關。</p>`;
  $('#retry').addEventListener('click', ()=>{
    const S = Stages[stageNo]; setStageLabel(stageNo); S.mount();
    S.run().then(ok => ok ? runPipelineFrom(stageNo+1) : retryOrStop(stageNo));
  });
  $('#stop').addEventListener('click', ()=> endFail(`Stage ${stageNo} 失敗`));
}
async function runPipelineFrom(next){
  switch(next){
    case 2: { GameState.stage=2; setStageLabel(2); Stages[2].mount(); const s2=await Stages[2].run(); if(!s2) return retryOrStop(2); return runPipelineFrom(3); }
    case 3: { GameState.stage=3; setStageLabel(3); Stages[3].mount(); if(!(await Stages[3].run())) return retryOrStop(3); return runPipelineFrom(4); }
    case 4: { GameState.stage=4; setStageLabel(4); Stages[4].mount(); const s4=await Stages[4].run(); if(!s4) return retryOrStop(4); return endOk(); }
    default: return endOk();
  }
}

// ===== 啟動：可選載入外部模組 → 顯示導入畫面 =====
setupStages().finally(()=> renderIntro());
