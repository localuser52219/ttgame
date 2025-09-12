// Stage2: 配對遊戲 Adapter（doubletap 對接版，4×4｜20 秒）
// 目的：將 doubletap 的 HTML/JS 包成 ESM，提供 mount()/run() 介面給 main.js
// 成功 → resolve(true)；失敗或放棄 → resolve(false)

let _resolve;
let state;

export function mount(){
  const app = document.querySelector('#app');
  ensureStyle();
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
    <section id="grid" class="grid" aria-label="翻牌記憶遊戲區"></section>
    <footer class="actions" style="text-align:center;margin-top:8px">
      <div id="result" class="result"></div>
    </footer>
  `;
  // 綁定元素快取
  el.grid = qs('#grid');
  el.pairs = qs('#pairs');
  el.time = qs('#time');
  el.moves = qs('#moves');
  el.restart = qs('#restart');
  qs('#giveup').addEventListener('click', ()=>{ cleanup(); _resolve?.(false); });
  init();
}

export function run(){
  return new Promise(r=>{ _resolve = r; });
}

// ===== 核心邏輯（依 doubletap 規格改寫） =====
const CONFIG = {
  previewMs: 3000,
  timeLimitSec: 20,
  // 若外部有提供 window.DOUBLETAP_ASSETS（fronts/back），優先使用；
  // 否則退回 emoji 卡面以確保可立即運作。
  assets: (()=>{
    const fallback = { fronts:['🍑','🍇','🍒','🍋','🥝','🍎','🥥','🍓'], back:'❔' };
    const a = (typeof window!=='undefined' && window.DOUBLETAP_ASSETS) || null;
    if(!a) return fallback;
    if(Array.isArray(a.fronts) && a.fronts.length>=8 && a.back) return a;
    return fallback;
  })(),
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

function init(){
  buildDeck();
  mountGrid();
  preloadAssets().then(startPreview);
  el.restart.addEventListener('click', restart);
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
  fronts.forEach((sym, i)=>{ deck.push({ key:i, sym }); deck.push({ key:i, sym }); });
  shuffle(deck);
  state.deck = deck.map((d, idx)=>({ id:idx, key:d.key, sym:d.sym, el:null, matched:false, flipped:false }));
}

function mountGrid(){
  el.grid.innerHTML = '';
  const useImage = typeof CONFIG.assets.fronts[0] === 'string' && /^https?:\/\//.test(CONFIG.assets.fronts[0]);
  const backIsImage = typeof CONFIG.assets.back === 'string' && /^https?:\/\//.test(CONFIG.assets.back);

  state.deck.forEach(card=>{
    const root = document.createElement('button');
    root.className = 'card';
    root.setAttribute('aria-label', '卡片');
    root.addEventListener('click', ()=> onFlip(card));

    const front = document.createElement('div');
    front.className = 'face front';
    if(useImage){
      front.style.backgroundImage = `url("${card.sym}")`;
      front.classList.add('as-image');
    }else{
      front.textContent = card.sym;
    }

    const back = document.createElement('div');
    back.className = 'face back';
    if(backIsImage){
      back.style.backgroundImage = `url("${CONFIG.assets.back}")`;
      back.classList.add('as-image');
    }else{
      back.textContent = CONFIG.assets.back;
    }

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

// 工具
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
function qs(s){return document.querySelector(s)}
function setNum(elOrSel, n){ const el = typeof elOrSel==='string'?qs(elOrSel):elOrSel; el.textContent = String(n); }
function setText(sel, t){ const node = qs(sel); if(node) node.textContent = t; }

// 資產預載（若是 emoji 不需預載）
function preloadAssets(){
  const isUrl = v => typeof v==='string' && /^https?:\/\//.test(v);
  const urls = [
    ...CONFIG.assets.fronts.filter(isUrl),
    ...(isUrl(CONFIG.assets.back) ? [CONFIG.assets.back] : [])
  ];
  if(urls.length===0) return Promise.resolve();
  return Promise.all(urls.map(src=>new Promise(res=>{ const img=new Image(); img.onload=img.onerror=()=>res(); img.src=src; })));
}

// 最小樣式（若站點已有 doubletap 的 CSS 可移除此段）
function ensureStyle(){
  if(document.getElementById('match-style')) return;
  const css = `
  .grid{display:grid;grid-template-columns:repeat(4,80px);gap:12px;justify-content:center}
  .card{position:relative;width:80px;height:80px;border:none;border-radius:10px;perspective:800px;background:transparent;cursor:pointer}
  .card .face{display:flex;align-items:center;justify-content:center;font-size:28px;position:absolute;inset:0;background:#f1e4f8;border-radius:10px;backface-visibility:hidden;transition:transform .35s ease}
  .card .face.as-image{background-size:cover;background-position:center;font-size:0}
  .card .back{background:#ece2f3;transform:rotateY(0deg)}
  .card .front{transform:rotateY(180deg)}
  .card.is-flipped .back{transform:rotateY(-180deg)}
  .card.is-flipped .front{transform:rotateY(0deg)}
  .card.is-matched{outline:2px solid var(--primary);}
  .result{min-height:20px}
  .result.ok{color:var(--ok)}
  .result.fail{color:var(--bad)}
  `;
  const style = document.createElement('style');
  style.id = 'match-style';
  style.textContent = css;
  document.head.appendChild(style);
}
