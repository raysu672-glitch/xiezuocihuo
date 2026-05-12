const vocab = [
  { zh: "一系列的问题", en: "a barrage of problems" },
  { zh: "一个产生影响的因素", en: "a contributing factor" },
  { zh: "关注的焦点", en: "a focus of attention" },
  { zh: "越来越多的证据", en: "a growing body of evidence" },
  { zh: "一件备受关注的事", en: "a matter of heightened concern" },
  { zh: "一个更可行的方法", en: "a more feasible approach" },
  { zh: "满足感", en: "a sense of fulfillment" },
  { zh: "一个非常短视的观点", en: "a very shortsighted view" },
  { zh: "重要的组成部分", en: "a vital component" },
  { zh: "大量的信息", en: "a wealth of information" },
  { zh: "一个众所周知的事实", en: "a well-known fact" },
  { zh: "各种各样的选择", en: "a wide range of options" },
  { zh: "大量的证据", en: "ample evidence" },
  { zh: "主要的原因", en: "primary cause" },
  { zh: "一个问题的症结", en: "the crux of a problem" },
  { zh: "迫在眉睫的危机", en: "the looming crisis" },
  { zh: "最主要的障碍", en: "the major barrier" },
  { zh: "自我满足感", en: "a sense of self-fulfillment" },
  { zh: "令人信服的证据", en: "compelling evidence" },
  { zh: "令人信服的理由", en: "compelling reasons" }
];

let currentIndex = 0;
let energy = 0;
let combo = 0;
let maxCombo = 0;
let totalAnswered = 0;
let totalCorrect = 0;
let selectedWords = [];
let isProcessing = false;
let fogMode = false;
let feverMode = false;
let feverTimer = null;
let feverTimeLeft = 0;
let audioCtx = null;
let clearedFogWords = new Set();

function init() {
  createBgParticles();
  shuffleVocab();
  loadQuestion();
  initAudio();
}

function shuffleVocab() {
  for (let i = vocab.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vocab[i], vocab[j]] = [vocab[j], vocab[i]];
  }
}

/* ── Web Audio 音效 ── */
function initAudio() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch(e) { audioCtx = null; }
}
function playKeySound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(2800 + Math.random()*1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.05);
  } catch(e) {}
}
function playCorrectSound() {
  if (!audioCtx) return;
  try {
    [523, 659, 784].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime + i*0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i*0.1 + 0.2);
      osc.start(audioCtx.currentTime + i*0.1);
      osc.stop(audioCtx.currentTime + i*0.1 + 0.25);
    });
  } catch(e) {}
}
function playWrongSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.25);
  } catch(e) {}
}
function playFeverStartSound() {
  if (!audioCtx) return;
  try {
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime + i*0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i*0.08 + 0.15);
      osc.start(audioCtx.currentTime + i*0.08);
      osc.stop(audioCtx.currentTime + i*0.08 + 0.2);
    });
  } catch(e) {}
}

/* ── 迷雾模式 ── */
function generateFogWord(word) {
  if (word.length <= 2) return word;
  const arr = word.split('');
  const hideCount = Math.max(1, Math.floor(arr.length * (0.3 + Math.random()*0.2)));
  const indices = [];
  for (let i = 1; i < arr.length - 1; i++) indices.push(i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const hideIdx = new Set(indices.slice(0, Math.min(hideCount, indices.length)));
  return arr.map((ch, i) => hideIdx.has(i) ? '_' : ch).join('');
}

function showFogModal(word) {
  if (clearedFogWords.has(word)) {
    selectWordAfterFog(word);
    return;
  }

  const fogDisplay = generateFogWord(word);
  const overlay = document.createElement('div');
  overlay.className = 'fog-modal-overlay';
  overlay.id = 'fogModal';

  const displayHtml = fogDisplay.split('').map(function(ch) {
    return ch === '_' ? '<span style="color:#f85149">_</span>' : ch;
  }).join('');

  overlay.innerHTML =
    '<div class="fog-modal">' +
      '<h3>🔮 迷雾模式 — 补全单词</h3>' +
      '<div class="fog-word-display">' + displayHtml + '</div>' +
      '<input class="fog-input" id="fogInput" placeholder="输入完整单词..." autocomplete="off" spellcheck="false">' +
      '<div class="fog-result" id="fogResult"></div>' +
      '<div class="fog-btns">' +
        '<button class="fog-btn fog-btn-confirm" id="fogConfirmBtn">确认</button>' +
        '<button class="fog-btn fog-btn-cancel" id="fogCancelBtn">取消</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const input = document.getElementById('fogInput');
  const result = document.getElementById('fogResult');
  input.focus();

  function close(success) {
    overlay.remove();
    if (success) {
      clearedFogWords.add(word);
      selectWordAfterFog(word);
    }
  }

  document.getElementById('fogConfirmBtn').onclick = function() {
    if (input.value.trim().toLowerCase() === word.toLowerCase()) {
      result.className = 'fog-result success';
      result.textContent = '✓ 正确！';
      setTimeout(function() { close(true); }, 400);
    } else {
      result.className = 'fog-result fail';
      result.textContent = '✗ 再试试';
      input.value = '';
      input.focus();
    }
  };
  document.getElementById('fogCancelBtn').onclick = function() { close(false); };
  input.onkeydown = function(e) {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); document.getElementById('fogConfirmBtn').click(); }
    if (e.key === 'Escape') { e.preventDefault(); close(false); }
    if (audioCtx && e.key.length === 1) playKeySound();
  };
}

function selectWordAfterFog(word) {
  if (!selectedWords.includes(word)) {
    selectedWords.push(word);
  }
  document.querySelectorAll('.word-btn').forEach(function(btn) {
    if (btn.dataset.word === word) {
      btn.classList.remove('fogged');
      btn.classList.add('fog-cleared');
      btn.classList.add('selected');
      btn.textContent = word;
      btn.onclick = function() { toggleWord(word, btn); };
    }
  });
  updateAnswerSlots();
}

/* ── Fever Mode ── */
function enterFeverMode() {
  feverMode = true;
  document.body.classList.add('fever');
  playFeverStartSound();

  document.getElementById('questionHint').textContent = '⚡ FEVER MODE — 直接打字输入！';
  document.getElementById('questionHint').style.color = '#ffd700';

  feverTimeLeft = 12;
  updateFeverTimer();
  feverTimer = setInterval(function() {
    feverTimeLeft--;
    updateFeverTimer();
    if (feverTimeLeft <= 0) {
      clearInterval(feverTimer);
      handleWrong(vocab[currentIndex].en);
      exitFeverMode();
    }
  }, 1000);

  setTimeout(function() { document.getElementById('feverInput').focus(); }, 300);
}

function exitFeverMode() {
  feverMode = false;
  clearInterval(feverTimer);
  document.body.classList.remove('fever');
  document.getElementById('feverInput').value = '';
  document.getElementById('questionHint').textContent = '👆 点击英文单词组成答案 →';
  document.getElementById('questionHint').style.color = '';
}

function updateFeverTimer() {
  let timerEl = document.getElementById('feverTimerDisplay');
  if (!timerEl) {
    timerEl = document.createElement('div');
    timerEl.id = 'feverTimerDisplay';
    timerEl.className = 'fever-timer';
    document.getElementById('questionBox').appendChild(timerEl);
  }
  timerEl.textContent = feverTimeLeft;
  timerEl.classList.toggle('urgent', feverTimeLeft <= 4);
  document.getElementById('feverProgress').textContent = feverTimeLeft <= 4 ? '⏰ 快！' : '剩余 ' + feverTimeLeft + ' 秒';
}

/* ── 加载题目 ── */
function loadQuestion() {
  if (currentIndex >= vocab.length) {
    showFinish();
    return;
  }

  const oldTimer = document.getElementById('feverTimerDisplay');
  if (oldTimer) oldTimer.remove();

  const q = vocab[currentIndex];
  document.getElementById('questionNum').textContent = String(currentIndex+1).padStart(2,'0') + ' / ' + vocab.length;
  document.getElementById('questionChinese').textContent = q.zh;
  document.getElementById('progress').textContent = currentIndex + '/' + vocab.length;
  document.getElementById('feverInput').value = '';
  document.getElementById('feverProgress').textContent = '';

  clearedFogWords = new Set();
  selectedWords = [];
  buildWordPool(q);
  updateAnswerSlots();

  if (feverMode) {
    setTimeout(function() { document.getElementById('feverInput').focus(); }, 100);
    updateFeverTimer();
  }
}

/* ── 构建选词池 ── */
function buildWordPool(q) {
  const pool = document.getElementById('wordPool');
  pool.innerHTML = '';

  const correctWords = q.en.split(' ');
  let allWords = correctWords.slice();

  const otherWords = vocab
    .filter(function(_, i) { return i !== currentIndex; })
    .flatMap(function(v) { return v.en.split(' '); })
    .sort(function() { return Math.random() - 0.5; });

  const targetCount = Math.max(correctWords.length + 4, 8);
  for (let i = 0; allWords.length < targetCount && i < otherWords.length; i++) {
    if (allWords.indexOf(otherWords[i]) === -1) {
      allWords.push(otherWords[i]);
    }
  }
  allWords = allWords.sort(function() { return Math.random() - 0.5; });

  allWords.forEach(function(word) {
    const btn = document.createElement('button');
    btn.className = 'word-btn';
    btn.dataset.word = word;

    if (fogMode && !clearedFogWords.has(word)) {
      btn.classList.add('fogged');
      const fogged = generateFogWord(word);
      btn.innerHTML = '<span class="fog-text">' + fogged + '</span>';
      btn.onclick = function() {
        if (isProcessing) return;
        showFogModal(word);
      };
    } else {
      btn.textContent = word;
      btn.onclick = function() { toggleWord(word, btn); };
    }
    pool.appendChild(btn);
  });
}

function toggleWord(word, btn) {
  if (isProcessing) return;
  const idx = selectedWords.indexOf(word);
  if (idx >= 0) {
    selectedWords.splice(idx, 1);
    btn.classList.remove('selected');
  } else {
    selectedWords.push(word);
    btn.classList.add('selected');
  }
  updateAnswerSlots();
}

function updateAnswerSlots() {
  const slotsEl = document.getElementById('answerSlots');
  slotsEl.innerHTML = '';
  if (selectedWords.length === 0) {
    const hint = document.createElement('span');
    hint.style.color = '#484f58';
    hint.style.fontSize = '15px';
    hint.textContent = feverMode ? '输入答案后按 Enter →' : '点击上方单词组成答案 →';
    slotsEl.appendChild(hint);
    return;
  }
  selectedWords.forEach(function(word) {
    const slot = document.createElement('div');
    slot.className = 'slot filled';
    slot.textContent = word;
    slotsEl.appendChild(slot);
  });
}

function clearSelection() {
  if (isProcessing) return;
  selectedWords = [];
  document.querySelectorAll('.word-btn').forEach(function(b) { b.classList.remove('selected'); });
  updateAnswerSlots();
}

function removeLastWord() {
  if (isProcessing || selectedWords.length === 0) return;
  const word = selectedWords.pop();
  const btns = [];
  document.querySelectorAll('.word-btn.selected').forEach(function(b) { btns.push(b); });
  for (let i = btns.length - 1; i >= 0; i--) {
    if (btns[i].textContent === word) {
      btns[i].classList.remove('selected');
      break;
    }
  }
  updateAnswerSlots();
}

function checkAnswer() {
  if (isProcessing) return;
  isProcessing = true;

  const q = vocab[currentIndex];

  if (feverMode) {
    let userAnswer = document.getElementById('feverInput').value.trim().replace(/\s+/g, ' ');
    if (userAnswer.toLowerCase() === q.en.toLowerCase()) {
      handleCorrect();
    } else {
      handleWrong(q.en);
    }
  } else {
    if (selectedWords.length === 0) { isProcessing = false; return; }
    const userSorted = selectedWords.map(function(w) { return w.toLowerCase(); }).sort().join(' ');
    const ansSorted = q.en.toLowerCase().split(' ').sort().join(' ');
    if (userSorted === ansSorted) {
      handleCorrect();
    } else {
      handleWrong(q.en);
    }
  }
}

/* ── 答对 ── */
function handleCorrect() {
  combo++;
  totalCorrect++;
  totalAnswered++;
  if (combo > maxCombo) maxCombo = combo;

  const gain = Math.min(20 + (combo - 1) * 5, 35);
  energy = Math.min(energy + gain, 100);

  updateEnergyBar();
  updateStats();
  playCorrectSound();

  if (feverMode) {
    showFeverCorrectEffect();
    spawnFeverParticles();
    feverTimeLeft = Math.min(feverTimeLeft + 5, 15);
    updateFeverTimer();
  } else {
    showCorrectEffect();
    spawnParticles();
    if (combo >= 3) {
      spawnFireworks();
      flashScreen('#3fb950');
    }
  }

  const delay = feverMode ? 600 : (combo >= 3 ? 1200 : 800);
  setTimeout(function() {
    currentIndex++;
    isProcessing = false;
    if (!feverMode && (energy >= 100 || combo >= 5)) {
      enterFeverMode();
    }
    loadQuestion();
  }, delay);
}

/* ── 答错 ── */
function handleWrong(correctAnswer) {
  combo = 0;
  totalAnswered++;
  energy = Math.max(energy - 20, 0);
  if (feverMode) {
    energy = Math.max(energy - 30, 0);
  }

  updateEnergyBar();
  updateStats();
  playWrongSound();

  if (feverMode) {
    flashScreen('#f85149');
    exitFeverMode();
    showWrongEffect(correctAnswer);
    setTimeout(function() {
      currentIndex++;
      isProcessing = false;
      loadQuestion();
    }, 1500);
    return;
  }

  showWrongEffect(correctAnswer);
  shakeScreen();

  setTimeout(function() {
    currentIndex++;
    isProcessing = false;
    loadQuestion();
  }, 1800);
}

/* ── 特效 ── */
function showCorrectEffect() {
  const overlay = document.createElement('div');
  overlay.className = 'correct-overlay';
  const msgs = ['正确!', '太棒了!', '完美!', '厉害!', 'Nice!'];
  const text = document.createElement('div');
  text.className = 'correct-text';
  if (combo >= 2) text.classList.add('combo-' + Math.min(combo, 5));
  text.textContent = msgs[Math.floor(Math.random() * msgs.length)];
  overlay.appendChild(text);
  document.body.appendChild(overlay);
  setTimeout(function() { overlay.remove(); }, 900);
}

function showFeverCorrectEffect() {
  const overlay = document.createElement('div');
  overlay.className = 'fever-correct-overlay';
  const text = document.createElement('div');
  text.className = 'fever-correct-text';
  const msgs = ['PERFECT!', 'AMAZING!', 'BRILLIANT!', 'YES!'];
  text.textContent = msgs[Math.floor(Math.random() * msgs.length)];
  overlay.appendChild(text);
  document.body.appendChild(overlay);
  setTimeout(function() { overlay.remove(); }, 700);

  document.getElementById('centerPanel').classList.add('fever-shake');
  setTimeout(function() { document.getElementById('centerPanel').classList.remove('fever-shake'); }, 500);
}

function showWrongEffect(correctAnswer) {
  const box = document.getElementById('questionBox');
  box.classList.add('shake');
  const hint = document.createElement('div');
  hint.id = 'wrongHint';
  hint.style.cssText = 'margin-top:16px;font-size:18px;color:#f85149;animation:fadeIn 0.3s;';
  hint.innerHTML = '✗ 正确答案：<span style="color:#3fb950">' + correctAnswer + '</span>';
  box.appendChild(hint);
  document.querySelectorAll('.word-btn.selected').forEach(function(btn) {
    btn.classList.add('wrong-flash');
  });
  flashScreen('#f85149');
  setTimeout(function() {
    box.classList.remove('shake');
    const oldHint = document.getElementById('wrongHint');
    if (oldHint) oldHint.remove();
    document.querySelectorAll('.word-btn.wrong-flash').forEach(function(b) { b.classList.remove('wrong-flash'); });
  }, 1800);
}

function spawnParticles() {
  const colors = ['#3fb950', '#58a6ff', '#bc8cff', '#f778ba', '#ffd700'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = (window.innerWidth / 2 + (Math.random() - 0.5) * 200) + 'px';
    p.style.top = (window.innerHeight / 2) + 'px';
    p.style.setProperty('--tx', (Math.random() - 0.5) * 400 + 'px');
    p.style.setProperty('--ty', (Math.random() - 1) * 300 + 'px');
    document.body.appendChild(p);
    setTimeout(function() { p.remove(); }, 1000);
  }
}

function spawnFeverParticles() {
  const colors = ['#ffd700', '#ff6b35', '#ff0080', '#00c8ff', '#bc8cff'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'fever-particle';
    p.style.color = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = (window.innerWidth / 2 + (Math.random() - 0.5) * 300) + 'px';
    p.style.top = (window.innerHeight / 2) + 'px';
    p.style.setProperty('--tx', (Math.random() - 0.5) * 300 + 'px');
    p.style.setProperty('--ty', (Math.random() - 1) * 250 + 'px');
    p.textContent = ['✦', '★', '⚡', '✧', '💥'][Math.floor(Math.random()*5)];
    document.body.appendChild(p);
    setTimeout(function() { p.remove(); }, 700);
  }
}

function spawnFeverKeyParticle() {
  const input = document.getElementById('feverInput');
  const rect = input.getBoundingClientRect();
  const p = document.createElement('div');
  p.className = 'fever-particle';
  p.style.color = ['#ffd700','#ff6b35','#00c8ff'][Math.floor(Math.random()*3)];
  p.style.left = (rect.left + Math.random()*rect.width) + 'px';
  p.style.top = (rect.top - 10) + 'px';
  p.style.setProperty('--tx', (Math.random()-0.5)*80+'px');
  p.style.setProperty('--ty', (-20 - Math.random()*40)+'px');
  p.textContent = ['·','✦','•'][Math.floor(Math.random()*3)];
  document.body.appendChild(p);
  setTimeout(function(){ p.remove(); }, 700);
}

function spawnFireworks() {
  const colors = ['#ffd700', '#ff6b35', '#bc8cff', '#3fb950', '#58a6ff'];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  for (let i = 0; i < 30; i++) {
    const fw = document.createElement('div');
    fw.className = 'firework';
    fw.style.background = colors[Math.floor(Math.random() * colors.length)];
    fw.style.left = cx + 'px';
    fw.style.top = cy + 'px';
    const angle = (Math.PI * 2 / 30) * i;
    const dist = 100 + Math.random() * 200;
    fw.style.transition = 'all 0.8s ease-out';
    document.body.appendChild(fw);
    requestAnimationFrame(function() {
      fw.style.transform = 'translate(' + Math.cos(angle)*dist + 'px, ' + Math.sin(angle)*dist + 'px)';
      fw.style.opacity = '0';
    });
    setTimeout(function() { fw.remove(); }, 900);
  }
}

function flashScreen(color) {
  const cls = feverMode ? 'fever-flash' : 'flash-overlay';
  const flash = document.createElement('div');
  flash.className = cls;
  flash.style.background = color;
  document.body.appendChild(flash);
  setTimeout(function() { flash.remove(); }, feverMode ? 300 : 600);
}

function shakeScreen() {
  document.getElementById('centerPanel').classList.add('shake');
  setTimeout(function() { document.getElementById('centerPanel').classList.remove('shake'); }, 500);
}

/* ── 更新能量槽 ── */
function updateEnergyBar() {
  const bar = document.getElementById('energyBar');
  const val = document.getElementById('energyValue');
  const emojis = document.getElementById('energyEmojis');
  const comboEl = document.getElementById('comboValue');

  bar.style.height = energy + '%';
  val.textContent = energy;

  bar.classList.remove('mid', 'high', 'max');
  if (energy >= 80) bar.classList.add('max');
  else if (energy >= 50) bar.classList.add('high');
  else if (energy >= 25) bar.classList.add('mid');

  if (energy >= 50 && !fogMode) {
    fogMode = true;
    const hint = document.getElementById('questionHint');
    if (hint && !feverMode) {
      hint.textContent = '🔮 迷雾模式激活！点击残缺单词补全字母';
      hint.style.color = '#58a6ff';
      setTimeout(function() {
        if (!feverMode) {
          hint.textContent = '👆 点击英文单词组成答案 →';
          hint.style.color = '';
        }
      }, 3000);
    }
    const q = vocab[currentIndex];
    if (q) buildWordPool(q);
  }

  if (feverMode) {
    emojis.textContent = '⚡🔥💥⚡';
  } else if (energy >= 80) {
    emojis.textContent = '🔥💥🌟';
  } else if (energy >= 50) {
    emojis.textContent = '⚡😎🔥';
  } else if (energy >= 25) {
    emojis.textContent = '😊👍✨';
  } else {
    emojis.textContent = '😶';
  }

  comboEl.textContent = 'x' + combo;
  comboEl.classList.remove('hot');
  if (combo >= 3) comboEl.classList.add('hot');
}

function updateStats() {
  document.getElementById('correctCount').textContent = totalCorrect;
  const acc = totalAnswered > 0 ? Math.round(totalCorrect / totalAnswered * 100) : 0;
  document.getElementById('accuracy').textContent = acc + '%';
}

/* ── 完成画面 ── */
function showFinish() {
  exitFeverMode();
  const overlay = document.createElement('div');
  overlay.className = 'finish-overlay';
  const pct = Math.round(totalCorrect / vocab.length * 100);
  let msg;
  if (totalCorrect === vocab.length) msg = '🌟 完美通关！你是词伙大师！';
  else if (totalCorrect >= vocab.length * 0.8) msg = '👍 很棒！继续加油！';
  else msg = '💪 多多练习，下次更好！';

  overlay.innerHTML =
    '<h2>🎉 全部完成！</h2>' +
    '<p>答对：' + totalCorrect + ' / ' + vocab.length + '</p>' +
    '<p>正确率：' + pct + '%</p>' +
    '<p>最大连击：x' + maxCombo + '</p>' +
    '<p style="margin-top:20px;font-size:16px;color:#58a6ff;">' + msg + '</p>' +
    '<button class="btn-restart" onclick="location.reload()">再来一次 🔄</button>';
  document.body.appendChild(overlay);
  spawnFireworks();
  setTimeout(spawnFireworks, 300);
}

/* ── 背景装饰粒子 ── */
function createBgParticles() {
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'bg-particle';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.top = Math.random() * 100 + 'vh';
    p.style.opacity = (0.1 + Math.random() * 0.3).toString();
    document.body.appendChild(p);
  }
}

/* ── 键盘事件 ── */
document.addEventListener('keydown', function(e) {
  if (feverMode && document.activeElement === document.getElementById('feverInput')) {
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      playKeySound();
      spawnFeverKeyParticle();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      checkAnswer();
    }
    return;
  }
  if (e.key === 'Enter' && !document.getElementById('fogModal')) checkAnswer();
  if (e.key === 'Backspace' && selectedWords.length > 0 && !feverMode) {
    e.preventDefault();
    removeLastWord();
  }
});

/* Fever 输入框实时反馈 */
document.getElementById('feverInput').addEventListener('input', function() {
  const q = vocab[currentIndex];
  if (!q) return;
  const val = this.value.toLowerCase();
  const ans = q.en.toLowerCase();
  if (ans.indexOf(val) === 0) {
    this.style.borderColor = 'rgba(255,215,0,0.6)';
  } else {
    this.style.borderColor = 'rgba(248,81,73,0.6)';
  }
});

init();
