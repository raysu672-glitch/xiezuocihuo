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

/* ── 语义连线任务数据 ──
   每条任务：
   - afterCount: 完成第几题后触发（基于 totalCorrect）
   - plain: 平庸原句
   - phrases: 要依次填入的词伙（按句中出现顺序）
   - template: 升级句模板，{0}{1}... 对应 phrases 的占位
   - templateParts: 模板分段（空白之间的静态文字），用于渲染
*/
const synthesisGroups = [
  {
    afterCount: 3,
    plain: '"Many problems are caused by this."',
    phrases: ['a barrage of problems', 'primary cause'],
    template: '{0} find their {1} in this very issue.',
    templateParts: ['', ' find their ', ' in this very issue.']
  },
  {
    afterCount: 6,
    plain: '"This has become something people pay attention to."',
    phrases: ['a matter of heightened concern', 'a focus of attention'],
    template: 'This has become {0} and {1} for researchers worldwide.',
    templateParts: ['This has become ', ' and ', ' for researchers worldwide.']
  },
  {
    afterCount: 9,
    plain: '"There is a lot of evidence that this approach is better."',
    phrases: ['a growing body of evidence', 'a more feasible approach'],
    template: 'There is {0} suggesting that this represents {1}.',
    templateParts: ['There is ', ' suggesting that this represents ', '.']
  },
  {
    afterCount: 12,
    plain: '"This is part of solving the problem."',
    phrases: ['a vital component', 'the crux of a problem'],
    template: 'Addressing this is {0} of resolving {1}.',
    templateParts: ['Addressing this is ', ' of resolving ', '.']
  },
  {
    afterCount: 15,
    plain: '"The crisis is here and there are many choices to deal with it."',
    phrases: ['the looming crisis', 'a wide range of options'],
    template: 'Tackling {0} demands {1} from policymakers.',
    templateParts: ['Tackling ', ' demands ', ' from policymakers.']
  },
  {
    afterCount: 18,
    plain: '"There is a lot of evidence and many reasons to act now."',
    phrases: ['compelling evidence', 'compelling reasons'],
    template: 'We now have {0} and {1} to take immediate action.',
    templateParts: ['We now have ', ' and ', ' to take immediate action.']
  }
];

let synthesisDone = new Set(); // 已触发过的 afterCount 值，防止重复弹出


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
let questionFailed = false;

let studyTimer = null;
let studyTimeLeft = 300;

function init() {
  populateStudyPage();
  startStudyTimer();
}

function populateStudyPage() {
  var grid = document.getElementById('studyGrid');
  grid.innerHTML = '';
  vocab.forEach(function(item) {
    var card = document.createElement('div');
    card.className = 'study-card';
    card.innerHTML = '<div class="study-card-zh">' + item.zh + '</div>' +
                     '<div class="study-card-en">' + item.en + '</div>';
    grid.appendChild(card);
  });
}

function startStudyTimer() {
  studyTimeLeft = 300;
  updateStudyTimerDisplay();
  document.getElementById('studySkipBtn').onclick = endStudy;
  studyTimer = setInterval(function() {
    studyTimeLeft--;
    updateStudyTimerDisplay();
    if (studyTimeLeft <= 0) {
      clearInterval(studyTimer);
      endStudy();
    }
  }, 1000);
}

function updateStudyTimerDisplay() {
  var min = Math.floor(studyTimeLeft / 60);
  var sec = studyTimeLeft % 60;
  var timerEl = document.getElementById('studyTimer');
  timerEl.textContent =
    (min < 10 ? '0' + min : min) + ':' + (sec < 10 ? '0' + sec : sec);
  timerEl.classList.toggle('study-timer-warning', studyTimeLeft <= 30);
}

function endStudy() {
  clearInterval(studyTimer);
  document.getElementById('studyOverlay').style.display = 'none';
  document.getElementById('gameContent').style.display = '';
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

  let fogCloseCalled = false;
  function close(success) {
    if (fogCloseCalled) return;   // 防止重复调用
    fogCloseCalled = true;
    overlay.remove();
    if (success) {
      clearedFogWords.add(word);
      selectWordAfterFog(word);
    }
  }

  document.getElementById('fogConfirmBtn').onclick = function() {
    if (fogCloseCalled) return;
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

  // Fever 模式下答案槽被 CSS 隐藏，强制短暂显示让学生看到词已进槽
  const slotsEl = document.getElementById('answerSlots');
  if (feverMode) {
    slotsEl.style.setProperty('display', 'flex', 'important');
    setTimeout(function() {
      slotsEl.style.removeProperty('display');
    }, 1200);
  }

  // 视觉反馈：答案区高亮，让学生看到词已进槽
  slotsEl.style.boxShadow = '0 0 18px rgba(63,185,80,0.6)';
  setTimeout(function(){ slotsEl.style.boxShadow = ''; }, 800);
}

/* ── Fever Mode ── */
function enterFeverMode() {
  feverMode = true;
  document.body.classList.add('fever');
  playFeverStartSound();

  document.getElementById('questionHint').textContent = '⚡ FEVER MODE — 直接打字输入！';
  document.getElementById('questionHint').style.color = '#ffd700';

  feverTimeLeft = 23;
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
  questionFailed = false;  // 加载新题时重置失败标记
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

  if (!questionFailed) {
    // 本题未答错过，正常加能量
    const gain = Math.min(20 + (combo - 1) * 5, 35);
    energy = Math.min(energy + gain, 100);
  }
  // 曾答错：能量不变，combo 仍累计但不加能量

  updateEnergyBar();
  updateStats();
  playCorrectSound();
  questionFailed = false;  // 重置，进入下一题

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
    // 检测语义连线任务触发
    var synGroup = synthesisGroups.find(function(g) {
      return g.afterCount === totalCorrect && !synthesisDone.has(g.afterCount);
    });
    if (synGroup) {
      synthesisDone.add(synGroup.afterCount);
      showSynthesisModal(synGroup);
      return; // loadQuestion 交给 showSynthesisModal 关闭后调用
    }
    loadQuestion();
  }, delay);
}

/* ── 答错 ── */
function showWrongEffect(correctAnswer, callback) {
  const box = document.getElementById('questionBox');
  box.classList.add('shake');
  const hint = document.createElement('div');
  hint.id = 'wrongHint';
  hint.style.cssText = 'margin-top:16px;font-size:20px;color:#f85149;animation:fadeIn 0.3s;';
  hint.innerHTML = '✗ 正确答案：<span style="color:#3fb950;font-size:22px;">' + correctAnswer + '</span>';
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
    if (callback) callback();
  }, 3000);
}

function handleWrong(correctAnswer) {
  combo = 0;
  totalAnswered++;
  // 答错扣能量
  energy = Math.max(energy - 20, 0);
  questionFailed = true;  // 标记本题曾答错，重试答对也不加能量
  updateEnergyBar();
  updateStats();
  playWrongSound();

  if (feverMode) {
    // Fever 模式答错：额外再扣 30 能量，并退出 fever
    energy = Math.max(energy - 30, 0);
    updateEnergyBar();
    flashScreen('#f85149');
    exitFeverMode();
    showWrongEffect(correctAnswer, function() {
      currentIndex++;
      isProcessing = false;
      loadQuestion();
    });
    return;
  }

  shakeScreen();
  showWrongEffect(correctAnswer, function() {
    // 清空选择，留在同一题让学生重试
    selectedWords = [];
    document.querySelectorAll('.word-btn').forEach(function(b) { b.classList.remove('selected'); });
    updateAnswerSlots();
    isProcessing = false;
  });
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

/* ── 语义连线弹窗 ── */
function showSynthesisModal(group) {
  var overlay = document.createElement('div');
  overlay.className = 'synthesis-overlay';

  // 构建模板 HTML（用下划线占位）
  var templateHtml = '';
  group.templateParts.forEach(function(part, i) {
    templateHtml += (part ? '<span class="syn-static">' + part + '</span>' : '');
    if (i < group.phrases.length) {
      templateHtml += '<span class="syn-blank" id="synBlank' + i + '"></span>';
    }
  });

  // 构建词伙按钮
  var phraseButtonsHtml = '';
  group.phrases.forEach(function(phrase, i) {
    phraseButtonsHtml += '<button class="synthesis-phrase-btn" id="synPhraseBtn' + i + '" data-idx="' + i + '">' + phrase + '</button>';
  });

  overlay.innerHTML =
    '<div class="synthesis-modal">' +
      '<div class="synthesis-badge">✏️ CONTEXTUAL SYNTHESIS</div>' +
      '<div class="synthesis-title">将平庸的句子升级为学术表达</div>' +
      '<div class="synthesis-plain-sentence">' +
        '<span class="plain-label">原句（平庸版）</span>' +
        group.plain +
      '</div>' +
      '<div class="synthesis-instruction">按顺序点击词伙，填入下方句子的空白处 ↓</div>' +
      '<div class="synthesis-phrase-btns" id="synPhraseBtns">' + phraseButtonsHtml + '</div>' +
      '<div class="synthesis-target-area" id="synTargetArea">' + templateHtml + '</div>' +
      '<div class="synthesis-result-msg" id="synResultMsg"></div>' +
      '<button class="synthesis-skip-btn" id="synSkipBtn">跳过此任务</button>' +
    '</div>';

  document.body.appendChild(overlay);

  var nextExpected = 0; // 下一个应该点击的词伙索引

  function onPhraseClick(idx) {
    var btn = document.getElementById('synPhraseBtn' + idx);
    if (!btn || btn.classList.contains('used')) return;

    if (idx === nextExpected) {
      // 正确顺序
      btn.classList.add('used');
      var blank = document.getElementById('synBlank' + idx);
      if (blank) {
        blank.textContent = group.phrases[idx];
        blank.classList.add('filled');
      }
      nextExpected++;

      // 播放按键音
      playCorrectTick();

      if (nextExpected === group.phrases.length) {
        // 全部填完！
        document.getElementById('synTargetArea').classList.add('completed');
        document.getElementById('synResultMsg').className = 'synthesis-result-msg success';
        document.getElementById('synResultMsg').textContent = '🎉 完美！平庸句已升级为学术表达！';
        document.getElementById('synSkipBtn').textContent = '继续练习 →';
        spawnParticles();
        playCorrectSound();
        // 3秒后自动关闭
        setTimeout(closeModal, 2800);
      }
    } else {
      // 顺序错误
      btn.classList.add('wrong-pick');
      document.getElementById('synResultMsg').className = 'synthesis-result-msg hint';
      document.getElementById('synResultMsg').textContent = '⚠️ 请按句中出现的顺序点击！';
      playWrongSound();
      setTimeout(function() {
        btn.classList.remove('wrong-pick');
        document.getElementById('synResultMsg').textContent = '';
      }, 800);
    }
  }

  // 绑定按钮事件
  group.phrases.forEach(function(_, i) {
    var btn = document.getElementById('synPhraseBtn' + i);
    if (btn) btn.onclick = function() { onPhraseClick(i); };
  });

  function closeModal() {
    overlay.remove();
    loadQuestion();
  }

  document.getElementById('synSkipBtn').onclick = closeModal;
}

function playCorrectTick() {
  if (!audioCtx) return;
  try {
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, audioCtx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.09, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.12);
  } catch(e) {}
}

init();
