// stages/match.js — 最終版（4×4｜20秒｜使用 ttWEDDING 圖片）
// 成功 → resolve(true)；逾時或放棄 → resolve(false)
// 依賴全域 CSS（.match-grid / .match-card 等）

let _resolve;
let state;

export function mount(){
  const app = document.querySelector('#app');
  app.innerHTML = `
    <h2>Stage2: 配對遊戲</h2>
    <header class="hud row" style="justify-content:center;gap:16px;margin-bottom:8px">
      <div>配對：<b id="pairs">0</b>/8</div>
      <div>剩餘時間：<b id="time">20.0</b>s</div>
      <div>翻牌次數：<b id="moves">0</b></div>
      <div class="spacer" style="flex:1"></div>
      <button id="restart" class="btn">重新開始</button>
      <button id="giveup" class="btn" style="background:var(--bad)">放棄</button>
    </header>
    <section id="grid" class="match-grid" aria-label="翻牌記憶遊戲區"></section>
    <footer class="actions" style="text-align:center;margin-top:8px">
      <div id="result" class="result"></div>
    </footer>
  `;

  el.grid = qs('#grid');
  el.pairs = qs('#pairs');
  el.time = qs('#time');
  el.moves = qs('#moves');
  el.restart = qs('#restart');

  qs('#giveup').addEventListener('click', ()=>{ cleanup(); _resolve?.(false); });
  el.restart.addEventListener('click', restart);

  init();
}

export function run(){ return new Promise(r=>{ _resolve = r; }); }

// ===== 設定（固定使用你的外部站圖片） =====
const CONFIG = {
  previewMs: 3000,
  timeLimitSec: 20,
  assets: {
    fronts: [
      "https://ttwedding.jp/images/front_01.png",
      "https://ttwedding.jp/images/front_02.png",
      "https://ttwedding.jp/images/front_03.png",
      "https://ttwedding.jp/images/front_04.png",
      "https://ttwedding.jp/images/front_05.png",
      "https://ttwedding.jp/images/front_06.png",
      "https://ttwedding.jp/images/front_07.png",
      "https://ttwedding.jp/images/front_08.png"
    ],
    back: "https://ttwedding.jp/images/back.png"
  },
  onWin: ({timeSec, moves}) => {
    setText('#result', `完成，用時 ${timeSec.toFixed(1)}s，翻牌 ${moves} 次`);
    qs('#result').className = 'result ok';
    setTimeout(()=> _resolve?.(true), 200);
  },
  onFail: (reason='') => {
    setText('#result', reason ? `失敗：${reason}` : '失敗');
    qs('#result').className = 'result fail';
    setTimeout(()=> _resolve?.(false), 0);
  }
};

const el = { grid:null, pairs:null, time:null, moves:null, restart:null };

// ===== 核心流程 =====
function init(){
  buildDeck();
  mountGrid();
  preloadAssets().then(startPreview);
  setText('#result', '');
}

function restart(){
  cancelAnim();
  resetStats();
  buildDeck();
  mountGrid();
  preloadAssets().then(startPreview);
  setText('#result', '');
  qs('#result').className = 'result';
}

function resetStats(){
  state = state || {};
  state.first = null;
  state.lock = false;
  state.pairs = 0;
  state.moves = 0;
  state.timedOut = false;
  state.playing = false;
  setNum(el.pairs, 0);
  setNum(el.moves, 0);
  setNum(el.time, CONFIG.timeLimitSec.toFixed(1));
}

function buildDeck(){
  const fronts = CONFIG.assets.fronts.slice(0,8);
  const deck = [];
  fronts.forEach((src, i)=>{ deck.push({ key:i, src }); deck.push({ key:i, src }); });
  shuffle(deck);
  state.deck = deck.map((d, idx)=>({ id:idx, key:d.key, src:d.src, el:null, matched:false, flipped:false }));
}

function mountGrid(){
  el.grid.innerHTML = '';
  state.deck.forEach(card=>{
    const root = document.createElement('button');
    root.className = 'match-card';
    root.setAttribute('aria-label', '卡片');
    root.addEventListener('click', ()=> onFlip(card));

    const front = document.createElement('div');
    front.className = 'face front as-image';
    front.style.backgroundImage = `url("${card.src}")`;

    const back = document.createElement('div');
    back.className = 'face back as-image';
    back.style.backgroundImage = `url("${CONFIG.assets.back}")`;

    root.appendChild(front);
    root.appendChild(back);
    el.grid.appendChild(root);
    card.el = root;
  });
}

function startPreview(){
  resetStats();
  state.deck.forEach(c=>{ c.flipped=true; c.el.classList.add('is-flipped'); });
  setTimeout(()=>{
    state.deck.forEach(c=>{ c.flipped=false; c.el.classList.remove('is-flipped'); });
    startCountdown();
  }, CONFIG.previewMs);
}

function startCountdown(){
  state.playing = true;
  state.tStart = performance.now();
  tick();
}

function tick(){
  if(!state.playing) return;
  const elapsed = (performance.now() - state.tStart) / 1000;
  const remain = Math.max(0, CONFIG.timeLimitSec - elapsed);
  el.time.textContent = remain.toFixed(1);
  if(remain <= 0){ state.timedOut=true; state.playing=false; state.lock=true; CONFIG.onFail('時間到'); return; }
  state.rafId = requestAnimationFrame(tick);
}

function onFlip(card){
  if(!state.playing) return;
  if(state.lock) return;
  if(card.matched || card.flipped) return;
  flipUp(card);
  if(!state.first){ state.first = card; return; }
  state.moves++; setNum(el.moves, state.moves);
  if(state.first.key === card.key){
    matchCards(state.first, card);
    state.first = null;
    state.pairs++; setNum(el.pairs, state.pairs);
    if(state.pairs === 8) return win();
  } else {
    const a = state.first, b = card;
    state.first = null; state.lock = true;
    setTimeout(()=>{ flipDown(a); flipDown(b); state.lock = false; }, 800);
  }
}

function matchCards(a,b){ a.matched=b.matched=true; a.el.classList.add('is-matched'); b.el.classList.add('is-matched'); }
function flipUp(c){ c.flipped=true; c.el.classList.add('is-flipped'); }
function flipDown(c){ c.flipped=false; c.el.classList.remove('is-flipped'); }

function win(){
  cancelAnim();
  state.playing=false; state.lock=true;
  const timePassed = (performance.now() - state.tStart) / 1000;
  const timeSec = Math.min(CONFIG.timeLimitSec, timePassed);
  const moves = state.moves;
  CONFIG.onWin({ timeSec, moves });
}

function cancelAnim(){ if(state?.rafId) cancelAnimationFrame(state.rafId); state.rafId=null; }

// ===== 工具 =====
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
function qs(s){return document.querySelector(s)}
function setNum(elOrSel, n){ const el = typeof elOrSel==='string'?qs(elOrSel):elOrSel; el.textContent = String(n); }
function setText(sel, t){ const node = qs(sel); if(node) node.textContent = t; }

// 圖片預載（加速首輪體驗；任何一張失敗也不阻擋）
function preloadAssets(){
  const urls = [...CONFIG.assets.fronts, CONFIG.assets.back];
  return Promise.all(urls.map(src=>new Promise(res=>{
    const img=new Image(); img.onload=img.onerror=()=>res(); img.src=src;
  })));
}

function cleanup(){ cancelAnim(); }
