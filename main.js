// combined.js: 所有 JavaScript 檔案的合併版本

// 全局命名空間，用於存放各個關卡的模組
const GameStages = {};

// ===== Stage 1: qxy.js =====
GameStages.stage1 = (() => {
  // Stage1: QxQy 遊戲 Adapter（對接 1strisk 的 Qx/Qy 守門）
  // 依據 1strisk 現有題庫與正解，僅實作 Qx 與 Qy，過關才 resolve(true)
  // 失敗可重選；提供「放棄」按鈕可直接 resolve(false)

  // ---- 取自 1strisk ----
  const correctGateAnswers = [2, 3]; // Qx: C, Qy: H
  const choiceLabels = {
    X: ["A", "B", "C", "D"],
    Y: ["E", "F", "G", "H"]
  };
  const gateStoryTexts = [
    "【序章】有人預告會「借走」一件重要物件。請先通過兩題守門問題。",
    "【提示】留意京都、八阪之塔、紫色與婚禮線索。"
  ];

  // ---- 本關狀態 ----
  let _resolve;
  let gateChoices = [null, null];

  function mount() {
    const app = document.querySelector('#app');
    app.innerHTML = `
      <h2>Stage1: QxQy 守門</h2>
      <div id="story-text" class="muted" style="text-align:center;margin-bottom:12px"></div>

      <div class="question-block">
        <div id="gate-question-x">
          <div class="q">Qx: Tracy 最喜歡的季節是？</div>
          <div class="choices" id="choicesX"></div>
        </div>

        <div id="gate-question-y" style="margin-top:8px">
          <div class="q">Qy: Dennis 最喜歡的遊戲類型是？</div>
          <div class="choices" id="choicesY"></div>
        </div>

        <div class="row" style="justify-content:center;margin-top:12px">
          <button id="submit" class="btn" disabled>確認</button>
          <button id="giveup" class="btn" style="background:var(--bad)">放棄</button>
        </div>
      </div>
    `;

    // 打字機敘事
    typeStory(gateStoryTexts.join("\n\n"));

    // 繪製選項
    makeGateChoices(0);
    makeGateChoices(1);

    // 事件
    document.querySelector('#submit').addEventListener('click', () => {
      const passed = gateChoices[0] === correctGateAnswers[0] && gateChoices[1] === correctGateAnswers[1];
      if (passed) { _resolve?.(true); }
    });
    document.querySelector('#giveup').addEventListener('click', () => _resolve?.(false));
  }

  function run() {
    return new Promise(resolve => { _resolve = resolve; });
  }

  // ---- 小工具 ----
  function makeGateChoices(qnum) {
    const key = qnum === 0 ? 'X' : 'Y';
    const labels = choiceLabels[key];
    const container = document.getElementById(qnum === 0 ? 'choicesX' : 'choicesY');
    container.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const btn = document.createElement('button');
      btn.textContent = labels[i];
      btn.className = gateChoices[qnum] === i ? 'selected' : '';
      btn.onclick = (e) => {
        addHeartBurst(e);
        gateChoices[qnum] = i;
        makeGateChoices(qnum);
        refreshSubmit();
      };
      container.appendChild(btn);
    }
    refreshSubmit();
  }
  function refreshSubmit() {
    const submit = document.getElementById('submit');
    const ready = gateChoices[0] !== null && gateChoices[1] !== null;
    const passed = gateChoices[0] === correctGateAnswers[0] && gateChoices[1] === correctGateAnswers[1];
    submit.disabled = !ready || !passed;
  }
  function typeStory(text) {
    const el = document.getElementById('story-text');
    if (!el) return; el.textContent = '';
    let i = 0; const speed = 45;
    (function tick() {
      if (i < text.length) { el.textContent += text.charAt(i++); setTimeout(tick, speed); }
    })();
  }
  function addHeartBurst(e) {
    const clickedElement = e.target; if (!clickedElement) return;
    for (let i = 0; i < 2; i++) {
      const heart = document.createElement('span');
      heart.className = 'heart';
      heart.style.left = e.offsetX + 'px';
      heart.style.top = e.offsetY + 'px';
      const randomX = Math.random() * 40 - 20;
      const randomY = Math.random() * -80 - 30;
      const randomRot = Math.random() * 20 - 10;
      heart.style.transform = `translate(${randomX}px, ${randomY}px) scale(1) rotate(${-45 + randomRot}deg)`;
      clickedElement.appendChild(heart);
      setTimeout(() => heart.remove(), 1000);
    }
  }

  return { mount, run };
})();


// ===== Stage 2: match.js =====
GameStages.stage2 = (() => {
  // stages/match.js — 最終版（4×4｜20秒｜使用 ttWEDDING 圖片）
  // 成功 → resolve(true)；逾時或放棄 → resolve(false)
  // 依賴全域 CSS（.match-grid / .match-card 等）

  let _resolve;
  let state;

  function mount() {
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

    qs('#giveup').addEventListener('click', () => { cleanup(); _resolve?.(false); });
    el.restart.addEventListener('click', restart);

    init();
  }

  function run() { return new Promise(r => { _resolve = r; }); }

  // ===== 設定（固定使用你的外部站圖片） =====
  const CONFIG = {
    previewMs: 3000,
    timeLimitSec: 20,
 assets: {
      fronts: [
        "/images/front_01.png",
        "/images/front_02.png",
        "/images/front_03.png",
        "/images/front_04.png",
        "/images/front_05.png",
        "/images/front_06.png",
        "/images/front_07.png",
        "/images/front_08.png"
      ],
      back: "/images/back.png"
    },
    onWin: ({ timeSec, moves }) => {
      setText('#result', `完成，用時 ${timeSec.toFixed(1)}s，翻牌 ${moves} 次`);
      qs('#result').className = 'result ok';
      setTimeout(() => _resolve?.(true), 200);
    },
    onFail: (reason = '') => {
      setText('#result', reason ? `失敗：${reason}` : '失敗');
      qs('#result').className = 'result fail';
      setTimeout(() => _resolve?.(false), 0);
    }
  };

  const el = { grid: null, pairs: null, time: null, moves: null, restart: null };

  // ===== 核心流程 =====
  function init() {
    buildDeck();
    mountGrid();
    preloadAssets().then(startPreview);
    setText('#result', '');
  }

  function restart() {
    cancelAnim();
    resetStats();
    buildDeck();
    mountGrid();
    preloadAssets().then(startPreview);
    setText('#result', '');
    qs('#result').className = 'result';
  }

  function resetStats() {
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

  function buildDeck() {
    const fronts = CONFIG.assets.fronts.slice(0, 8);
    const deck = [];
    fronts.forEach((src, i) => { deck.push({ key: i, src }); deck.push({ key: i, src }); });
    shuffle(deck);
    state.deck = deck.map((d, idx) => ({ id: idx, key: d.key, src: d.src, el: null, matched: false, flipped: false }));
  }

  function mountGrid() {
    el.grid.innerHTML = '';
    state.deck.forEach(card => {
      const root = document.createElement('button');
      root.className = 'match-card';
      root.setAttribute('aria-label', '卡片');
      root.addEventListener('click', () => onFlip(card));

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

  function startPreview() {
    resetStats();
    state.deck.forEach(c => { c.flipped = true; c.el.classList.add('is-flipped'); });
    setTimeout(() => {
      state.deck.forEach(c => { c.flipped = false; c.el.classList.remove('is-flipped'); });
      startCountdown();
    }, CONFIG.previewMs);
  }

  function startCountdown() {
    state.playing = true;
    state.tStart = performance.now();
    tick();
  }

  function tick() {
    if (!state.playing) return;
    const elapsed = (performance.now() - state.tStart) / 1000;
    const remain = Math.max(0, CONFIG.timeLimitSec - elapsed);
    el.time.textContent = remain.toFixed(1);
    if (remain <= 0) { state.timedOut = true; state.playing = false; state.lock = true; CONFIG.onFail('時間到'); return; }
    state.rafId = requestAnimationFrame(tick);
  }

  function onFlip(card) {
    if (!state.playing) return;
    if (state.lock) return;
    if (card.matched || card.flipped) return;
    flipUp(card);
    if (!state.first) { state.first = card; return; }
    state.moves++; setNum(el.moves, state.moves);
    if (state.first.key === card.key) {
      matchCards(state.first, card);
      state.first = null;
      state.pairs++; setNum(el.pairs, state.pairs);
      if (state.pairs === 8) return win();
    } else {
      const a = state.first, b = card;
      state.first = null; state.lock = true;
      setTimeout(() => { flipDown(a); flipDown(b); state.lock = false; }, 800);
    }
  }

  function matchCards(a, b) { a.matched = b.matched = true; a.el.classList.add('is-matched'); b.el.classList.add('is-matched'); }
  function flipUp(c) { c.flipped = true; c.el.classList.add('is-flipped'); }
  function flipDown(c) { c.flipped = false; c.el.classList.remove('is-flipped'); }

  function win() {
    cancelAnim();
    state.playing = false; state.lock = true;
    const timePassed = (performance.now() - state.tStart) / 1000;
    const timeSec = Math.min(CONFIG.timeLimitSec, timePassed);
    const moves = state.moves;
    CONFIG.onWin({ timeSec, moves });
  }

  function cancelAnim() { if (state?.rafId) cancelAnimationFrame(state.rafId); state.rafId = null; }

  // ===== 工具 =====
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; }
  function qs(s) { return document.querySelector(s) }
  function setNum(elOrSel, n) { const el = typeof elOrSel === 'string' ? qs(elOrSel) : elOrSel; el.textContent = String(n); }
  function setText(sel, t) { const node = qs(sel); if (node) node.textContent = t; }

  // 圖片預載（加速首輪體驗；任何一張失敗也不阻擋）
  function preloadAssets() {
    const urls = [...CONFIG.assets.fronts, CONFIG.assets.back];
    return Promise.all(urls.map(src => new Promise(res => {
      const img = new Image(); img.onload = img.onerror = () => res(); img.src = src;
    })));
  }

  function cleanup() { cancelAnim(); }

  return { mount, run };
})();


// ===== Stage 3: q14.js =====
GameStages.stage3 = (() => {
  // Stage3: Q1–Q4（1strisk）+ 開始口令
  // - 入口先輸入口令（URL 參數 p3，忽略前後空白與大小寫；未設定視為開發模式）
  // - 題目與選項取自 1strisk：正解 C, A, B, D（索引 2,0,1,3）
  // - 點選每題會顯示對應提示文案（打字機效果）
  // - 全對顯示「我已經知道真相」按鈕 → resolve(true)
  // - 任一題錯誤顯示相同按鈕 → 轉頁 https://ttwedding.jp/altermoment（保留原答錯轉頁）

  let _resolve;

  // ===== 資料（來自 1strisk） =====
  const correctAnswers = [2, 0, 1, 3];
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
  let selected = [null, null, null, null];
  let typingTid = null;

  // 工具
  function pwEqual(a, b) { const norm = s => (s || '').trim().toLowerCase(); if (!b) return true; return norm(a) === norm(b); }
  function qs(s) { return document.querySelector(s); }

  function mount() {
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
    if (!p3) hint.textContent = '提醒：URL 未設定 p3。暫以任意值通過（開發模式）。';
    qs('#go3').onclick = () => {
      const val = qs('#pw3').value;
      if (!pwEqual(val, p3)) { hint.textContent = '口令不正確。'; return; }
      startQ14();
    };
    if (e2e) { setTimeout(() => startQ14(), 200); }
  }

  function run() { return new Promise(r => { _resolve = r; }); }

  function startQ14() {
    // 顯示故事與題目
    qs('#stage3-gate').style.display = 'none';
    const story = qs('#story-text');
    const main = qs('#main-questions');
    const results = qs('#results-container');
    if (story) { story.style.display = 'block'; }
    if (main) { main.style.display = 'block'; }
    if (results) { results.style.display = 'none'; results.innerHTML = ''; }

    // 打字機開場
    typeStory("神秘人偷偷留下的線索，提到一樣「重要的物品」將會被「借走」。為了守護這場婚禮，邀請你一同找出真相。但要解開這場謎題，你需要對新人的故事足夠了解。那個才是可疑的人呢？");

    // 渲染四題
    for (let k = 1; k <= 4; k++) makeChoices(k);
  }

  function makeChoices(qnum) {
    const div = qs('#choices' + qnum);
    const labels = choiceLabels[String(qnum)];
    if (!div || !labels) return;
    div.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const btn = document.createElement('button');
      btn.textContent = labels[i];
      btn.className = selected[qnum - 1] === i ? 'selected' : '';
      btn.onclick = () => {
        selected[qnum - 1] = i;
        typeStory(answerTips[qnum - 1]);
        makeChoices(qnum);
        if (selected.every(c => c !== null)) checkFinalAnswers();
      };
      div.appendChild(btn);
    }
  }

  function checkFinalAnswers() {
    const allCorrect = selected.every((c, i) => c === correctAnswers[i]);
    const results = qs('#results-container');
    const main = qs('#main-questions');
    const story = qs('#story-text');
    if (!results) return;
    results.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'result-btn ' + (allCorrect ? 'correct' : 'incorrect');
    btn.textContent = '我已經知道真相';
    btn.onclick = () => {
      if (allCorrect) { _resolve?.(true); }
      else { window.location.href = 'https://ttwedding.jp/altermoment'; }
    };
    results.appendChild(btn);
    results.style.display = 'flex';
    if (main) main.style.display = 'block';
    if (story) story.style.display = 'none';
  }

  function typeStory(text) {
    const el = qs('#story-text');
    if (!el) return;
    if (typingTid) clearTimeout(typingTid);
    el.style.display = 'block';
    el.textContent = '';
    let i = 0; const speed = 55;
    (function tick() {
      if (i < text.length) { el.textContent += text.charAt(i++); typingTid = setTimeout(tick, speed); }
      else { typingTid = null; }
    })();
  }

  function parseQuery() {
    const p = new URLSearchParams(location.search);
    return { p3: p.get('p3') || '', e2e: p.get('e2e') === '1' };
  }

  return { mount, run };
})();


// ===== Stage 4: fasttap.js =====
GameStages.stage4 = (() => {
  // Stage4: 字母快速點擊（A–Z 隨機格）
  // 成功即跳轉 https://ttwedding.jp/timetravel
  // 規則：30 秒內依序點擊目標字串（預設 'Happymarriage'；可用 URL ?target=... 覆寫），格子為 A–Z 隨機，保證含正確字母。

  let _resolve;
  let state;

  function mount() {
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
      idx: 0, secs: 30, mistakes: 0, playing: false, rafId: null, tStart: 0
    };
    state.word = state.word.toUpperCase();

    document.querySelector('#restart').onclick = restart;
    document.querySelector('#giveup').onclick = () => { finish(false, '放棄'); };

    buildGrid();
    start();
  }

  function run() { return new Promise(r => { _resolve = r; }); }

  function buildGrid() {
    const grid = qs('#tap-grid');
    const letters = Array.from({ length: 8 }, () => randLetter());
    const need = state.word[state.idx];
    const insertAt = Math.floor(Math.random() * 9);
    letters.splice(insertAt, 0, need);

    grid.innerHTML = '';
    letters.forEach(ch => {
      const btn = document.createElement('button');
      btn.className = 'tap-btn';
      btn.textContent = ch;
      btn.onclick = () => onTap(ch, btn);
      grid.appendChild(btn);
    });

    setText('#next', need);
    setText('#mistakes', state.mistakes);
    setText('#time', state.secs.toFixed(1));
    setText('#tap-msg', '請依序點擊目標字串');
  }

  function start() { state.playing = true; state.tStart = performance.now(); tick(); }
  function restart() { cancelAnim(); state.idx = 0; state.mistakes = 0; buildGrid(); start(); }

  function tick() {
    if (!state.playing) return;
    const elapsed = (performance.now() - state.tStart) / 1000;
    const remain = Math.max(0, 30 - elapsed);
    setText('#time', remain.toFixed(1));
    if (remain <= 0) return finish(false, '時間到');
    state.rafId = requestAnimationFrame(tick);
  }

  function onTap(ch, btn) {
    if (!state.playing) return;
    const need = state.word[state.idx];
    if (ch !== need) {
      state.mistakes++;
      setText('#mistakes', state.mistakes);
      btn.classList.add('bad');
      setTimeout(() => btn.classList.remove('bad'), 200);
      return finish(false, '點錯順序');
    }
    btn.disabled = true;
    btn.classList.add('ok');
    state.idx++;
    if (state.idx >= state.word.length) { return finish(true); }
    buildGrid();
  }

  function finish(ok, reason = '') {
    cancelAnim();
    state.playing = false;
    if (ok) {
      window.location.href = 'https://ttwedding.jp/timetravel';
      setTimeout(() => _resolve?.(true), 0);
    } else {
      setText('#tap-msg', reason ? `失敗：${reason}` : '失敗');
      _resolve?.(false);
    }
  }

  function cancelAnim() { if (state?.rafId) cancelAnimationFrame(state.rafId); state.rafId = null; }

  function qs(s) { return document.querySelector(s); }
  function setText(sel, t) { const el = qs(sel); if (el) el.textContent = String(t); }
  function randLetter() { const A = 65; return String.fromCharCode(A + Math.floor(Math.random() * 26)); }

  function ensureStyle() {
    // This function is kept for structural integrity but is redundant
    // if the main CSS file is correctly linked in the HTML.
    if (document.getElementById('fasttap-style')) return;
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

  function parseQuery() { const p = new URLSearchParams(location.search); return { target: p.get('target') || '' }; }

  return { mount, run };
})();


// ===== Main Controller: main.js =====
(() => {
  // main.js —— 正式版流程控制（合併版）

  // ===== 狀態與導入文案 =====
  const GameState = { stage: 0 };
  const INTRO = {
    title: '尋找線索，守護婚禮',
    lead: '有人預告會「借走」一件重要物件。請化身調查員，按順序破解四道關卡。'
  };

  // ===== DOM =====
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app');
  const badge = $('#stageBadge');
  const setStageLabel = n => {
    const m = { 1: 'Stage1 QxQy', 2: 'Stage2 配對', 3: 'Stage3 Q1–Q4', 4: 'Stage4 快速點擊' };
    if (badge) badge.textContent = m[n] || '初始化';
  };

  // ===== 工具 =====
  const pwEqual = (a, b) => {
    if (!b) return true;
    const norm = s => (s || '').trim().toLowerCase();
    return norm(a) === norm(b);
  };
  const getParams = () => {
    const p = new URLSearchParams(location.search);
    return {
      p2: p.get('p2') || ''
    };
  };

  // ===== 四關模組 =====
  let Stages = [null, null, null, null, null]; // index 1-4

  function setupStages() {
    // 從全局 GameStages 物件加載關卡
    Stages[1] = GameStages.stage1;
    Stages[2] = GameStages.stage2;
    Stages[3] = GameStages.stage3;
    Stages[4] = GameStages.stage4;
  }

  // ===== 導入畫面 =====
  function renderIntro() {
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
    $('#startBtn').onclick = () => runPipeline();
  }

  // ===== Gate2（Stage2→Stage3 口令2） =====
  function renderGate2() {
    const { p2 } = getParams();
    return new Promise(resolve => {
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
      if (!p2) hint.textContent = '提示：未設定 ?p2=...（開發模式任意通過）';
      $('#go').onclick = () => {
        const val = $('#pw2').value;
        if (!pwEqual(val, p2)) { hint.textContent = '口令不正確'; return; }
        resolve(true);
      };
      if (!p2) setTimeout(() => resolve(true), 200);
    });
  }

  // ===== 主流程 =====
  async function runPipeline() {
    // Stage1
    GameState.stage = 1; setStageLabel(1); Stages[1].mount();
    if (!(await Stages[1].run())) return endFail('Stage1 未通過');

    // Stage2
    GameState.stage = 2; setStageLabel(2); Stages[2].mount();
    if (!(await Stages[2].run())) return retryOrStop(2);

    // Gate2 → Stage3
    if (!(await renderGate2())) return endFail('口令 2 未通過');

    // Stage3
    GameState.stage = 3; setStageLabel(3); Stages[3].mount();
    if (!(await Stages[3].run())) return retryOrStop(3);

    // Stage4
    GameState.stage = 4; setStageLabel(4); Stages[4].mount();
    if (!(await Stages[4].run())) return retryOrStop(4);

    return endOk();
  }

  // ===== 結束與重試 =====
  function endOk() {
    app.innerHTML = `<h2>完成</h2><p class="muted">你已完成全部關卡。</p><button class="btn" id="restart">重新開始</button>`;
    $('#restart').onclick = () => location.reload();
  }
  function endFail(msg) {
    app.innerHTML = `<h2>中止</h2><p class="muted">${msg}</p><button class="btn" id="restart">重新開始</button>`;
    $('#restart').onclick = () => location.reload();
  }
  function retryOrStop(stageNo) {
    app.innerHTML = `
      <h2>未通過 · Stage ${stageNo}</h2>
      <div class="row">
        <button class="btn" id="retry">重試本關</button>
        <button class="btn" id="stop" style="background:var(--bad)">結束</button>
      </div>
      <p class="muted">依原規則可重試本關。</p>`;
    $('#retry').onclick = () => {
      const S = Stages[stageNo]; setStageLabel(stageNo); S.mount();
      S.run().then(ok => ok ? runPipelineFrom(stageNo + 1) : retryOrStop(stageNo));
    };
    $('#stop').onclick = () => endFail(`Stage ${stageNo} 失敗`);
  }
  async function runPipelineFrom(next) {
    switch (next) {
      case 2: { GameState.stage = 2; setStageLabel(2); Stages[2].mount(); if (!(await Stages[2].run())) return retryOrStop(2); return runPipelineFrom(3); }
      case 3: { if (!(await renderGate2())) return endFail('口令 2 未通過'); GameState.stage = 3; setStageLabel(3); Stages[3].mount(); if (!(await Stages[3].run())) return retryOrStop(3); return runPipelineFrom(4); }
      case 4: { GameState.stage = 4; setStageLabel(4); Stages[4].mount(); if (!(await Stages[4].run())) return retryOrStop(4); return endOk(); }
      default: return endOk();
    }
  }

  // ===== 啟動 =====
  setupStages();
  renderIntro();
})();
