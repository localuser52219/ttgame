// Stage4: 字母快速點擊（A–Z 隨機格）
// 成功即跳轉 https://ttwedding.jp/timetravel
// 規則：30 秒內依序點擊目標字串（預設 'Happymarriage'；可用 URL ?target=... 覆寫），格子為 A–Z 隨機，保證含正確字母。

let _resolve;
let state;

export function mount(){
  const app = document.querySelector('#app');
  ensureStyle();
  app.innerHTML = `
    <h2>Stage4: 快速點擊字母</h2>
    <div class="row" style="justify-content:center;gap:16px;margin-bottom:8px">
      <div>下一個字母：<b id="next">A</b></div>
      <div>剩餘時間：<b id="time">30.0</b>s</div>
      <div>失誤：<b id="mistakes">0</b></div>
      <div class="spacer" style="flex:1"></div>
      <button id="restart" class="btn">重新開始</button>
      <button id="giveup" class="btn" style="background:var(--bad)">放棄</button>
    </div>
    <section id="tap-grid" class="tap-grid" aria-label="快速點擊區"></section>
    <div id="tap-msg" class="muted" style="text-align:center;margin-top:8px"></div>
  `;

  const { target } = parseQuery();
  const DEFAULT = 'Happymarriage';
  state = { 
    word: (target && target.trim()) ? target : DEFAULT,
    idx:0, secs:30, mistakes:0, playing:false, rafId:null, tStart:0
  };
  state.word = state.word.toUpperCase();

  document.querySelector('#restart').onclick = restart;
  document.querySelector('#giveup').onclick = ()=>{ finish(false, '放棄'); };

  buildGrid();
  start();
}

export function run(){ return new Promise(r=>{ _resolve = r; }); }

function buildGrid(){
  const grid = qs('#tap-grid');
  const letters = Array.from({length:8}, ()=> randLetter());
  const need = state.word[state.idx];
  const insertAt = Math.floor(Math.random()*9);
  letters.splice(insertAt, 0, need);

  grid.innerHTML = '';
  letters.forEach(ch=>{
    const btn = document.createElement('button');
    btn.className = 'tap-btn';
    btn.textContent = ch;
    btn.onclick = ()=> onTap(ch, btn);
    grid.appendChild(btn);
  });

  setText('#next', need);
  setText('#mistakes', state.mistakes);
  setText('#time', state.secs.toFixed(1));
  setText('#tap-msg','請依序點擊目標字串');
}

function start(){ state.playing = true; state.tStart = performance.now(); tick(); }
function restart(){ cancelAnim(); state.idx=0; state.mistakes=0; buildGrid(); start(); }

function tick(){
  if(!state.playing) return;
  const elapsed = (performance.now() - state.tStart)/1000;
  const remain = Math.max(0, 30 - elapsed);
  setText('#time', remain.toFixed(1));
  if(remain <= 0) return finish(false, '時間到');
  state.rafId = requestAnimationFrame(tick);
}

function onTap(ch, btn){
  if(!state.playing) return;
  const need = state.word[state.idx];
  if(ch !== need){
    state.mistakes++;
    setText('#mistakes', state.mistakes);
    btn.classList.add('bad');
    setTimeout(()=> btn.classList.remove('bad'), 200);
    return finish(false, '點錯順序');
  }
  btn.disabled = true;
  btn.classList.add('ok');
  state.idx++;
  if(state.idx >= state.word.length){ return finish(true); }
  buildGrid();
}

function finish(ok, reason=''){
  cancelAnim();
  state.playing = false;
  if(ok){
    window.location.href = 'https://ttwedding.jp/timetravel';
    setTimeout(()=> _resolve?.(true), 0);
  } else {
    setText('#tap-msg', reason ? `失敗：${reason}` : '失敗');
    _resolve?.(false);
  }
}

function cancelAnim(){ if(state?.rafId) cancelAnimationFrame(state.rafId); state.rafId=null; }

function qs(s){ return document.querySelector(s); }
function setText(sel, t){ const el = qs(sel); if(el) el.textContent = String(t); }
function randLetter(){ const A=65; return String.fromCharCode(A + Math.floor(Math.random()*26)); }

function ensureStyle(){
  if(document.getElementById('fasttap-style')) return;
  const css = `
  .tap-grid{display:grid;grid-template-columns:repeat(3,80px);gap:10px;justify-content:center}
  .tap-btn{width:80px;height:80px;border-radius:12px;border:2px solid var(--primary);background:#f1e4f8;font-size:28px;font-weight:700;cursor:pointer}
  .tap-btn.ok{background:#e3f2e7;border-color:var(--ok)}
  .tap-btn.bad{background:#fdecea;border-color:var(--bad)}
  `;
  const style = document.createElement('style');
  style.id = 'fasttap-style';
  style.textContent = css;
  document.head.appendChild(style);
}

function parseQuery(){ const p=new URLSearchParams(location.search); return { target:p.get('target')||'' }; }
