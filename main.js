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
const Stage1_QxQy = { /* ...略（暫代通過按鈕）... */ };
const Stage2_Match = { /* ...略（暫代通過／失敗）... */ };
const Stage3_Q14   = { /* ...略（暫代全對）... */ };
const Stage4_FastTap = { /* ...略（暫代完成／失敗）... */ };

let Stages = [null, Stage1_QxQy, Stage2_Match, Stage3_Q14, Stage4_FastTap];

// ===== 動態載入外部模組（可連結 4 部分） =====
async function setupStages(){ /* ...動態 import ... */ }

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
function renderGate2(){ /* ...輸入口令2 → resolve(true/false)... */ }

// ===== 主流程（四關依序） =====
async function runPipeline(){
  GameState.stage = 1; setStageLabel(1); Stages[1].mount();
  if(!(await Stages[1].run())) return endFail('Stage1 未通過');

  GameState.stage = 2; setStageLabel(2); Stages[2].mount();
  const s2ok = await Stages[2].run(); if(!s2ok) return retryOrStop(2);

  const okGate2 = await renderGate2(); if(!okGate2) return endFail('口令 2 未通過');

  GameState.stage = 3; setStageLabel(3); Stages[3].mount();
  if(!(await Stages[3].run())) return retryOrStop(3);

  GameState.stage = 4; setStageLabel(4); Stages[4].mount();
  const s4ok = await Stages[4].run(); if(!s4ok) return retryOrStop(4);

  return endOk();
}

// ===== 結束與重試 =====
function endOk(){ /* ...顯示完成 → restart reload... */ }
function endFail(msg){ /* ...顯示中止 → restart reload... */ }
function retryOrStop(stageNo){ /* ...重試/結束邏輯... */ }
async function runPipelineFrom(next){ /* ...部分重跑邏輯... */ }

// ===== 啟動 =====
setupStages().finally(()=> renderIntro());
