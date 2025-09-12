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

export function mount(){
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
  typeStory(gateStoryTexts.join("

"));

  // 繪製選項
  makeGateChoices(0);
  makeGateChoices(1);

  // 事件
  document.querySelector('#submit').addEventListener('click', ()=>{
    const passed = gateChoices[0] === correctGateAnswers[0] && gateChoices[1] === correctGateAnswers[1];
    if(passed){ _resolve?.(true); }
  });
  document.querySelector('#giveup').addEventListener('click', ()=> _resolve?.(false));
}

export function run(){
  return new Promise(resolve=>{ _resolve = resolve; });
}

// ---- 小工具 ----
function makeGateChoices(qnum){
  const key = qnum === 0 ? 'X' : 'Y';
  const labels = choiceLabels[key];
  const container = document.getElementById(qnum===0 ? 'choicesX' : 'choicesY');
  container.innerHTML = '';
  for(let i=0;i<4;i++){
    const btn = document.createElement('button');
    btn.textContent = labels[i];
    btn.className = gateChoices[qnum] === i ? 'selected' : '';
    btn.onclick = (e)=>{
      addHeartBurst(e);
      gateChoices[qnum] = i;
      makeGateChoices(qnum);
      refreshSubmit();
    };
    container.appendChild(btn);
  }
  refreshSubmit();
}
function refreshSubmit(){
  const submit = document.getElementById('submit');
  const ready = gateChoices[0] !== null && gateChoices[1] !== null;
  const passed = gateChoices[0] === correctGateAnswers[0] && gateChoices[1] === correctGateAnswers[1];
  submit.disabled = !ready || !passed;
}
function typeStory(text){
  const el = document.getElementById('story-text');
  if(!el) return; el.textContent = '';
  let i=0; const speed=45;
  (function tick(){
    if(i<text.length){ el.textContent += text.charAt(i++); setTimeout(tick, speed); }
  })();
}
function addHeartBurst(e){
  const clickedElement = e.target; if(!clickedElement) return;
  for(let i=0;i<2;i++){
    const heart = document.createElement('span');
    heart.className = 'heart';
    heart.style.left = e.offsetX + 'px';
    heart.style.top = e.offsetY + 'px';
    const randomX = Math.random()*40 - 20;
    const randomY = Math.random()*-80 - 30;
    const randomRot = Math.random()*20 - 10;
    heart.style.transform = `translate(${randomX}px, ${randomY}px) scale(1) rotate(${-45 + randomRot}deg)`;
    clickedElement.appendChild(heart);
    setTimeout(()=> heart.remove(), 1000);
  }
}
