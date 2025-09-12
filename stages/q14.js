// Stage3: Q1–Q4（1strisk）+ 開始口令
// - 入口先輸入口令（URL 參數 p3，忽略前後空白與大小寫；未設定視為開發模式）
// - 題目與選項取自 1strisk：正解 C, A, B, D（索引 2,0,1,3）
// - 點選每題會顯示對應提示文案（打字機效果）
// - 全對顯示「我已經知道真相」按鈕 → resolve(true)
// - 任一題錯誤顯示相同按鈕 → 轉頁 https://ttwedding.jp/altermoment（保留原答錯轉頁）

let _resolve;

// ===== 資料（來自 1strisk） =====
const correctAnswers = [2,0,1,3];
const answerTips = [
  "他不是陌生人。",
  "他只想再借一次當年的那道光。",
  "他知道你會懷疑，但他也知道，只有你會懂那份重量。",
  "他曾經在這裡承諾一生，想再說一次。"
];
const choiceLabels = {
  "1": ["A. 2017", "B. 2018", "C. 2019", "D. 2020"],
  "2": ["A. ttwedding.jp", "B. wedding25.jp", "C. tracydennis.jp", "D. loveintokyo.jp"],
  "3": ["A. 草泥馬", "B. 蝴蝶", "C. 老虎", "D. 狐狸"],
  "4": ["A. 新娘的美麗", "B. 新郎的元氣", "C. 賓客的祝福", "D. 求婚的戒指"],
};

// ===== 狀態 =====
let selected = [null,null,null,null];
let typingTid = null;

// 工具
function pwEqual(a,b){ const norm=s=>(s||'').trim().toLowerCase(); if(!b) return true; return norm(a)===norm(b); }
function qs(s){ return document.querySelector(s); }

export function mount(){
  const app = qs('#app');
  app.innerHTML = `
    <h2>Stage3: 問題 Q1–Q4</h2>
    <div id="stage3-gate" class="row" style="justify-content:center;margin-bottom:12px">
      <input id="pw3" type="text" placeholder="輸入口令 3" />
      <button class="btn" id="go3">開始答題</button>
      <p id="pwhint3" class="muted" style="margin:6px 0 0 0;width:100%;text-align:center"></p>
    </div>

    <div id="story-text" style="display:none;text-align:center; font-size:18px; margin-bottom:12px; color:#5c3e67;"></div>

    <div id="main-questions" style="display:none">
      <div class="q">Q1: Tracy 與 Dennis 是在哪一年認識的？</div>
      <div class="choices" id="choices1"></div>

      <div class="q">Q2: 他們的婚禮網站網址是？</div>
      <div class="choices" id="choices2"></div>

      <div class="q">Q3: 京都情書中，哪種小動物沒有出現？</div>
      <div class="choices" id="choices3"></div>

      <div class="q">Q4: 神秘人想要偷走的東西是？</div>
      <div class="choices" id="choices4"></div>
    </div>

    <div id="results-container" style="display:none"></div>
  `;

  // 綁定口令事件
  const { p3, e2e } = parseQuery();
  const hint = qs('#pwhint3');
  if(!p3) hint.textContent = '提醒：URL 未設定 p3。暫以任意值通過（開發模式）。';
  qs('#go3').onclick = ()=>{
    const val = qs('#pw3').value;
    if(!pwEqual(val, p3)){ hint.textContent = '口令不正確。'; return; }
    startQ14();
  };
  if(e2e){ setTimeout(()=> startQ14(), 200); }
}

export function run(){ return new Promise(r=>{ _resolve = r; }); }

function startQ14(){
  // 顯示故事與題目
  qs('#stage3-gate').style.display = 'none';
  const story = qs('#story-text');
  const main = qs('#main-questions');
  const results = qs('#results-container');
  if(story){ story.style.display='block'; }
  if(main){ main.style.display='block'; }
  if(results){ results.style.display='none'; results.innerHTML=''; }

  // 打字機開場
  typeStory("神秘人偷偷留下的線索，提到一樣「重要的物品」將會被「借走」。為了守護這場婚禮，邀請你一同找出真相。但要解開這場謎題，你需要對新人的故事足夠了解。那個才是可疑的人呢？");

  // 渲染四題
  for(let k=1;k<=4;k++) makeChoices(k);
}

function makeChoices(qnum){
  const div = qs('#choices'+qnum);
  const labels = choiceLabels[String(qnum)];
  if(!div || !labels) return;
  div.innerHTML = '';
  for(let i=0;i<4;i++){
    const btn = document.createElement('button');
    btn.textContent = labels[i];
    btn.className = selected[qnum-1] === i ? 'selected' : '';
    btn.onclick = ()=>{
      selected[qnum-1] = i;
      typeStory(answerTips[qnum-1]);
      makeChoices(qnum);
      if(selected.every(c=>c!==null)) checkFinalAnswers();
    };
    div.appendChild(btn);
  }
}

function checkFinalAnswers(){
  const allCorrect = selected.every((c,i)=> c === correctAnswers[i]);
  const results = qs('#results-container');
  const main = qs('#main-questions');
  const story = qs('#story-text');
  if(!results) return;
  results.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'result-btn ' + (allCorrect ? 'correct' : 'incorrect');
  btn.textContent = '我已經知道真相';
  btn.onclick = ()=>{
    if(allCorrect){ _resolve?.(true); }
    else { window.location.href = 'https://ttwedding.jp/altermoment'; }
  };
  results.appendChild(btn);
  results.style.display = 'flex';
  if(main) main.style.display = 'block';
  if(story) story.style.display = 'none';
}

function typeStory(text){
  const el = qs('#story-text');
  if(!el) return;
  if(typingTid) clearTimeout(typingTid);
  el.style.display='block';
  el.textContent='';
  let i=0; const speed=55;
  (function tick(){
    if(i<text.length){ el.textContent += text.charAt(i++); typingTid = setTimeout(tick, speed); }
    else { typingTid = null; }
  })();
}

function parseQuery(){
  const p = new URLSearchParams(location.search);
  return { p3:p.get('p3')||'', e2e:p.get('e2e')==='1' };
}
