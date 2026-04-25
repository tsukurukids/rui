// ============================================================
// game.js  ─  算数・国語 統合ゲームエンジン
// ============================================================

/* ========== State ========== */
let selectedSubject = null;   // 'math' | 'lang' | 'typing'
let selectedMode = null;   // 'easy' | 'normal' | 'hard'
let score = 0;
let timerSecs = 60;
let timerTotal = 60;
let timerInterval = null;
let questionCount = 0;
let correctCount = 0;
let wrongCount = 0;
let streak = 0;
let maxStreak = 0;
let answering = false;
let gameActive = false;

/* ========== Theme Management ========== */
function initTheme() {
  const saved = localStorage.getItem('manabi_theme') || 'dark';
  if (saved === 'light') {
    document.body.classList.add('light-mode');
    document.getElementById('theme-toggle').textContent = '☀️';
  }
}
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('manabi_theme', isLight ? 'light' : 'dark');
  document.getElementById('theme-toggle').textContent = isLight ? '☀️' : '🌙';
}
window.addEventListener('DOMContentLoaded', initTheme);

let langPoolIdx = { beginner: 0, intermediate: 0, advanced: 0 };
let langPools = { beginner: [], intermediate: [], advanced: [] };
let typingPoolIdx = { beginner: 0, intermediate: 0, advanced: 0 };
let typingPools = { beginner: [], intermediate: [], advanced: [] };

let currentTypingAnswer = '';  // 今の正解ローマ字
let typingInputPos = 0;       // 今何文字目まで合ってるか
let typingTimer = null;       // 寿司が流れるタイマー（またはアニメーション監視）

let countdownInterval = null; // カウントダウン用
let waitingForSpace = false;
let spaceCallback = null;
let lastQuestionText = '';    // 前の問題と同じにならないように保存
let recentQuestions = [];     // 最近出た5問を保存（重複防止）
let currentProgCourse = null;
let currentMissionIdx = 0;

/* ========== Mode configs ========== */
const GRADE_CONFIG = {
  g1: { label: '小1', icon: '🐣', time: 60, pts: 10 },
  g2: { label: '小2', icon: '🐥', time: 60, pts: 10 },
  g3: { label: '小3', icon: '🎒', time: 60, pts: 15 },
  g4: { label: '小4', icon: '🚲', time: 60, pts: 15 },
  g5: { label: '小5', icon: '🏕️', time: 60, pts: 20 },
  g6: { label: '小6', icon: '🦅', time: 60, pts: 20 },
  m1: { label: '中1', icon: '📓', time: 60, pts: 25 },
  m2: { label: '中2', icon: '📐', time: 60, pts: 25 },
  m3: { label: '中3', icon: '🎓', time: 60, pts: 30 },
};

const MATH_MODES = {
  g1: { ...GRADE_CONFIG.g1, desc: 'たしざん<br/>ひきざん' },
  g2: { ...GRADE_CONFIG.g2, desc: 'かけざん<br/>九九' },
  g3: { ...GRADE_CONFIG.g3, desc: 'かけざん<br/>わりざん' },
  g4: { ...GRADE_CONFIG.g4, desc: '大きな数<br/>けいさん' },
  g5: { ...GRADE_CONFIG.g5, desc: '小数の<br/>たしひき' },
  g6: { ...GRADE_CONFIG.g6, desc: '小数の<br/>かけわり' },
  m1: { ...GRADE_CONFIG.m1, desc: 'マイナス<br/>の数' },
  m2: { ...GRADE_CONFIG.m2, desc: '方程式' }, 
  m3: { ...GRADE_CONFIG.m3, desc: '平方根<br/>ルート' },
};

const LANG_MODES = {
  g1: { ...GRADE_CONFIG.g1, desc: '読み書き' },
  g2: { ...GRADE_CONFIG.g2, desc: '読み書き' },
  g3: { ...GRADE_CONFIG.g3, desc: '熟語・意味' },
  g4: { ...GRADE_CONFIG.g4, desc: '熟語・意味' },
  g5: { ...GRADE_CONFIG.g5, desc: '応用漢字' },
  g6: { ...GRADE_CONFIG.g6, desc: '漢字・意味' },
  m1: { ...GRADE_CONFIG.m1, desc: '中学生' },
  m2: { ...GRADE_CONFIG.m2, desc: '中学生' },
  m3: { ...GRADE_CONFIG.m3, desc: '難しい熟語' },
};

/* タイピングの学年べつ設定 */
const TYPING_MODES = {
  g1: { ...GRADE_CONFIG.g1, desc: 'どうぶつ など' },
  g2: { ...GRADE_CONFIG.g2, desc: 'くだもの など' },
  g3: { ...GRADE_CONFIG.g3, desc: '少し長いことば' },
  g4: { ...GRADE_CONFIG.g4, desc: 'しせつ など' },
  g5: { ...GRADE_CONFIG.g5, desc: '長いことば' },
  g6: { ...GRADE_CONFIG.g6, desc: '社会のことば' },
  m1: { ...GRADE_CONFIG.m1, desc: '難しいことば' },
  m2: { ...GRADE_CONFIG.m2, desc: '理科 など' },
  m3: { ...GRADE_CONFIG.m3, desc: '受験に出る' },
};

const SUBJECT_META = {
  math: { name: '算数', mascot: '🧮', badge: '🧮 算数', badgeClass: 'badge-math', highlight: '算数ゲーム', color: '#06b6d4' },
  lang: { name: '国語', mascot: '📚', badge: '📚 国語', badgeClass: 'badge-lang', highlight: '国語ゲーム', color: '#ec4899' },
  typing: { name: 'タイピング', mascot: '⌨️', badge: '⌨️ タイピング', badgeClass: 'badge-typing', highlight: 'タイピング', color: '#22c55e' },
  prog: { name: 'プログラミング', mascot: '💻', badge: '💻 プログラミング', badgeClass: 'badge-prog', highlight: 'プログラミング', color: '#8b5cf6' },
};

/* ========== Screen navigation ========== */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

/* ========== Full Screen ========== */
function toggleFullScreen() {
  const btn = document.getElementById('fullscreen-toggle');
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(e => console.warn(e));
    if (btn) btn.textContent = '復帰'; // アイコンを変える場合
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      if (btn) btn.textContent = '🔲';
    }
  }
}

// Scratchの枠（iframe）だけを全画面にする
function fullscreenScratch() {
  const sf = document.getElementById('scratch-iframe');
  if (sf) {
    if (sf.requestFullscreen) {
      sf.requestFullscreen();
    } else if (sf.webkitRequestFullscreen) {
      sf.webkitRequestFullscreen();
    }
  }
}

/* ========== Subject selection ========== */
function selectSubject(subject) {
  selectedSubject = subject;
  selectedMode = null;

  // Update button states
  document.querySelectorAll('.subject-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('btn-subject-' + subject).classList.add('selected');

  // Update title mascot/text
  const meta = SUBJECT_META[subject];
  document.getElementById('title-mascot').textContent = meta.mascot;
  document.getElementById('title-highlight').textContent = meta.highlight;

  // Build mode cards for this subject
  let MODE_TIERS = [];
  if (subject === 'prog') {
    MODE_TIERS = [
      { key: 'beginner', label: '初級', icon: '🌱', desc: 'ねこを動かそう' },
      { key: 'intermediate', label: '中級', icon: '🎋', desc: '図形を描こう' },
      { key: 'advanced', label: '上級', icon: '🌳', desc: 'ゲーム作り' }
    ];
  } else {
    MODE_TIERS = [
      { key: 'beginner', label: '初級', icon: '🐣', desc: 'かんたんなレベル' },
      { key: 'intermediate', label: '中級', icon: '🐥', desc: 'ふつうのレベル' },
      { key: 'advanced', label: '上級', icon: '🔥', desc: 'むずかしいレベル' }
    ];
  }

  const cards = document.getElementById('mode-cards');
  cards.innerHTML = '';
  
  MODE_TIERS.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'mode-card';
    btn.id = 'btn-mode-' + t.key;
    btn.onclick = () => selectMode(t.key);
    btn.innerHTML = `
      <div class="mode-icon">${t.icon}</div>
      <div class="mode-name">${t.label}</div>
      <div class="mode-desc">${t.desc}</div>
    `;
    cards.appendChild(btn);
  });

  if (subject === 'prog') {
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('prog-start-area').style.display = 'flex';
    document.getElementById('prog-step-panel').style.display = 'none';
    document.getElementById('prog-clear-badge').style.display = 'none';
    // モード選択を表示（コース選択のため）
    const modeSection = document.getElementById('mode-select');
    modeSection.style.display = 'block';
    modeSection.classList.remove('step-enter');
    void modeSection.offsetWidth;
    modeSection.classList.add('step-enter');
  } else {
    document.getElementById('prog-start-area').style.display = 'none';
    document.getElementById('btn-start').style.display = 'inline-block';
    // Show mode selector with animation
    const modeSection = document.getElementById('mode-select');
    modeSection.style.display = 'block';
    modeSection.classList.remove('step-enter');
    void modeSection.offsetWidth;
    modeSection.classList.add('step-enter');
    document.getElementById('btn-start').disabled = true;
  }
}

/* ========== Programming Course selection ========== */
function selectProgCourse(courseKey) {
  currentProgCourse = PROG_COURSES[courseKey];
  currentMissionIdx = 0;

  const course = currentProgCourse;

  // コースヘッダー更新
  const emojiMatch = course.title.match(/^(\S+)/);
  document.getElementById('prog-course-emoji').textContent = emojiMatch ? emojiMatch[1] : '💻';
  document.getElementById('prog-course-title').textContent = course.title;
  document.getElementById('prog-course-desc').textContent = course.desc;

  // コースカラー
  document.getElementById('prog-course-header').style.borderColor = course.color;
  document.getElementById('prog-course-header').style.background =
    `linear-gradient(135deg, ${course.color}22, ${course.colorDark}33)`;

  // ステップドット生成
  const dotsEl = document.getElementById('prog-step-dots');
  dotsEl.innerHTML = '';
  course.steps.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'prog-step-dot' + (i === 0 ? ' active' : '');
    dot.id = 'prog-dot-' + i;
    dot.onclick = () => jumpProgStep(i);
    dotsEl.appendChild(dot);
  });

  // UI表示
  document.getElementById('prog-step-panel').style.display = 'flex';
  document.getElementById('prog-clear-badge').style.display = 'none';
  document.getElementById('prog-mission-card').style.display = 'flex';
  document.getElementById('prog-nav-btns') && (document.querySelector('.prog-nav-btns').style.display = 'flex');

  updateProgStepUI();
}

function updateProgStepUI() {
  const course = currentProgCourse;
  const step = course.steps[currentMissionIdx];
  const total = course.steps.length;

  // ステップラベル
  document.getElementById('prog-step-label').textContent = `ステップ ${currentMissionIdx + 1} / ${total}`;
  document.getElementById('prog-step-num').textContent = `ステップ ${step.id}`;
  document.getElementById('prog-step-emoji').textContent = step.emoji;
  document.getElementById('prog-step-title').textContent = step.title;
  document.getElementById('prog-mission-text').textContent = step.mission;
  document.getElementById('prog-hint-text').textContent = step.hint;

  // チップスリスト
  const tipsList = document.getElementById('prog-tips-list');
  tipsList.innerHTML = '';
  (step.tips || []).forEach(tip => {
    const li = document.createElement('li');
    li.textContent = tip;
    tipsList.appendChild(li);
  });

  // ドット更新
  course.steps.forEach((_, i) => {
    const dot = document.getElementById('prog-dot-' + i);
    if (dot) {
      dot.className = 'prog-step-dot' +
        (i === currentMissionIdx ? ' active' : '') +
        (i < currentMissionIdx ? ' done' : '');
    }
  });

  // ナビボタン
  const prevBtn = document.getElementById('prog-prev-btn');
  const nextBtn = document.getElementById('prog-next-btn');
  if (prevBtn) prevBtn.disabled = currentMissionIdx === 0;
  if (nextBtn) {
    if (currentMissionIdx >= total - 1) {
      nextBtn.textContent = 'クリア！🏆';
    } else {
      nextBtn.textContent = 'つぎへ →';
    }
  }

  // カードアニメーション
  const card = document.getElementById('prog-mission-card');
  card.classList.remove('prog-card-anim');
  void card.offsetWidth;
  card.classList.add('prog-card-anim');
}

function nextProgStep() {
  const total = currentProgCourse.steps.length;
  if (currentMissionIdx >= total - 1) {
    // コースクリア！
    showProgClear();
    return;
  }
  currentMissionIdx++;
  updateProgStepUI();
}

function prevProgStep() {
  if (currentMissionIdx <= 0) return;
  currentMissionIdx--;
  updateProgStepUI();
}

function jumpProgStep(idx) {
  currentMissionIdx = idx;
  updateProgStepUI();
}

function showProgClear() {
  const course = currentProgCourse;
  const lastStep = course.steps[course.steps.length - 1];
  document.getElementById('prog-clear-msg').textContent = lastStep.check;
  document.getElementById('prog-mission-card').style.display = 'none';
  document.querySelector('.prog-nav-btns').style.display = 'none';
  const badge = document.getElementById('prog-clear-badge');
  badge.style.display = 'flex';
  badge.classList.remove('prog-clear-anim');
  void badge.offsetWidth;
  badge.classList.add('prog-clear-anim');
  // 全ドットをdoneに
  course.steps.forEach((_, i) => {
    const dot = document.getElementById('prog-dot-' + i);
    if (dot) dot.className = 'prog-step-dot done';
  });
  try { SFX.correct(5); } catch(e) {}
}

function resetProgCourse() {
  currentProgCourse = null;
  currentMissionIdx = 0;
  document.getElementById('prog-step-panel').style.display = 'none';
  document.getElementById('prog-clear-badge').style.display = 'none';
  document.getElementById('prog-mission-card').style.display = 'flex';
  document.querySelector('.prog-nav-btns').style.display = 'flex';
  // モード選択を再表示
  const modeSection = document.getElementById('mode-select');
  modeSection.style.display = 'block';
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
  selectedMode = null;
  document.getElementById('btn-start').style.display = 'none';
}

/* ========== Scratchを新しいタブで開く ========== */
function openScratch() {
  window.open('https://scratch.mit.edu/projects/editor/?tutorial=getStarted', '_blank');
}

/* ========== Mode selection ========== */
function selectMode(mode) {
  selectedMode = mode;
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
  if (document.getElementById('btn-mode-' + mode)) {
    document.getElementById('btn-mode-' + mode).classList.add('selected');
  }
  document.getElementById('btn-start').disabled = false;

  if (selectedSubject === 'prog') {
    selectProgCourse(mode);
  }
}

/* ========== Start / Retry ========== */
function startGame() {
  if (!selectedSubject || !selectedMode) return;
  
  // Set default time and pts
  let cfg = { time: 60, pts: 10 };
  if (selectedMode === 'intermediate') cfg.pts = 15;
  if (selectedMode === 'advanced') cfg.pts = 25;

  // BGM start (requires user gesture — satisfied by button click)
  try { BGM.start(); } catch (e) { }

  // Reset state
  score = 0;
  timerSecs = cfg.time;
  timerTotal = cfg.time;
  questionCount = 0;
  correctCount = 0;
  wrongCount = 0;
  streak = 0;
  maxStreak = 0;
  answering = false;
  lastQuestionText = '';
  recentQuestions = [];

  // Set up Pools for the selected tier if not already done
  if (selectedSubject === 'lang' && langPools[selectedMode].length === 0) {
    let grades = selectedMode === 'beginner' ? ['g1', 'g2', 'g3'] : (selectedMode === 'intermediate' ? ['g4', 'g5', 'g6'] : ['m1', 'm2', 'm3']);
    let combined = [];
    grades.forEach(g => combined.push(...KANJI_DB[g]));
    langPools[selectedMode] = shuffle(combined);
    langPoolIdx[selectedMode] = 0;
  }
  
  if (selectedSubject === 'typing' && typingPools[selectedMode].length === 0) {
    let grades = selectedMode === 'beginner' ? ['g1', 'g2', 'g3'] : (selectedMode === 'intermediate' ? ['g4', 'g5', 'g6'] : ['m1', 'm2', 'm3']);
    let combined = [];
    grades.forEach(g => combined.push(...TYPING_DB[g]));
    typingPools[selectedMode] = shuffle(combined);
    typingPoolIdx[selectedMode] = 0;
  }

  // 画面にある「3+5=?」などの古い問題を「準備中」にしてリセットする
  document.getElementById('question-hint').textContent = '';
  document.getElementById('question-text').textContent = 'じゅんびちゅう...';
  const tr = document.getElementById('typing-romaji');
  if (tr) tr.innerHTML = '';

  // タイピングの表示・非表示を切りかえる
  const qCard = document.getElementById('question-card');
  if (selectedSubject === 'typing') {
    document.getElementById('typing-area').style.display = 'flex';
    document.getElementById('choices-grid').style.display = 'none';
    if (qCard) qCard.style.display = 'none';
  } else {
    document.getElementById('typing-area').style.display = 'none';
    document.getElementById('choices-grid').style.display = 'grid';
    if (qCard) qCard.style.display = 'flex';
  }

  // Update game screen badge
  const meta = SUBJECT_META[selectedSubject];
  const badge = document.getElementById('subject-badge');
  badge.textContent = meta.badge;
  badge.className = 'subject-badge ' + meta.badgeClass;

  showScreen('game');
  updateHUD();

  if (selectedSubject === 'typing') {
    document.getElementById('screen-game').classList.add('typing-mode');
    waitForSpaceToStart(() => {
      startCountdown(() => {
        gameActive = true;
        generateQuestion();
        startTimer();
        setTimeout(() => document.getElementById('typing-input').focus(), 100);
      });
    });
  } else {
    document.getElementById('screen-game').classList.remove('typing-mode');
    gameActive = true;
    generateQuestion();
    startTimer();
  }
}

/* ========== Space Wait ========== */
function waitForSpaceToStart(callback) {
  const overlay = document.getElementById('countdown-overlay');
  const msgEl = document.getElementById('countdown-msg');
  const numEl = document.getElementById('countdown-num');

  msgEl.innerHTML = 'キーボードを「半角（はんかく）」にしてね！<br>準備ができたらスペースキーを押してスタート！';
  numEl.innerHTML = '[ SPACE ]';
  numEl.style.fontSize = 'clamp(3rem, 10vh, 5rem)';
  
  overlay.classList.add('show');
  
  waitingForSpace = true;
  spaceCallback = callback;
  
  document.addEventListener('keydown', handleSpaceKey);
}

function handleSpaceKey(e) {
  if (waitingForSpace && e.code === 'Space') {
    e.preventDefault();
    waitingForSpace = false;
    document.removeEventListener('keydown', handleSpaceKey);
    try { SFX.correct(3); } catch(err){}
    if (spaceCallback) spaceCallback();
  }
}

/* ========== Countdown ========== */
function startCountdown(callback) {
  const overlay = document.getElementById('countdown-overlay');
  const msgEl = document.getElementById('countdown-msg');
  const numEl = document.getElementById('countdown-num');
  
  msgEl.innerHTML = 'いくよ！';
  numEl.style.fontSize = 'clamp(5rem, 15vh, 10rem)';
  
  let count = 3;
  numEl.textContent = count;

  countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      numEl.textContent = count;
    } else {
      clearInterval(countdownInterval);
      countdownInterval = null;
      overlay.classList.remove('show');
      callback();
    }
  }, 1000);
}

function retryGame() {
  gameActive = false;
  stopTimer();
  showScreen('title');
  setTimeout(() => {
    if (selectedSubject && selectedMode) startGame();
  }, 120);
}

function goHome() {
  if (answering) return;
  gameActive = false;
  stopTimer();
  
  if (waitingForSpace) {
    waitingForSpace = false;
    document.removeEventListener('keydown', handleSpaceKey);
    document.getElementById('countdown-overlay').classList.remove('show');
  }

  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    document.getElementById('countdown-overlay').classList.remove('show');
  }

  const inp = document.getElementById('typing-input');
  if (inp) {
    inp.removeEventListener('keydown', handleTypingInput);
    inp.blur();
  }
  // Reset UI on title screen
  document.getElementById('mode-select').style.display = 'none';
  document.getElementById('prog-start-area').style.display = 'none';
  
  // スマホなどで戻ったときにScratchが裏で動いたままにならないよう停止する
  const sf = document.getElementById('scratch-iframe');
  if (sf) sf.src = 'about:blank';

  document.getElementById('btn-start').style.display = 'inline-block';
  document.getElementById('btn-start').disabled = true;
  document.querySelectorAll('.subject-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('title-mascot').textContent = '📚';
  document.getElementById('title-highlight').textContent = 'まなびゲーム';
  selectedSubject = null;
  selectedMode = null;
  document.getElementById('screen-game').classList.remove('typing-mode');
  showScreen('title');
}

/* ========== Timer ========== */
function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    timerSecs--;
    updateTimerUI();
    if (timerSecs <= 0) { stopTimer(); endGame(); }
  }, 1000);
}
function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}
function updateTimerUI() {
  const el = document.getElementById('timer-display');
  const bar = document.getElementById('timer-bar');
  el.textContent = timerSecs;
  const pct = (timerSecs / timerTotal) * 100;
  bar.style.width = pct + '%';
  if (timerSecs <= 10) {
    bar.style.background = 'linear-gradient(90deg,#ef4444,#f97316)';
    el.style.color = '#ef4444';
  } else if (timerSecs <= 20) {
    bar.style.background = 'linear-gradient(90deg,#f97316,#facc15)';
    el.style.color = '#f97316';
  } else {
    bar.style.background = 'linear-gradient(90deg,#06b6d4,#8b5cf6)';
    el.style.color = '#06b6d4';
  }
}

/* ========== Question Generation ========== */
function generateQuestion() {
  questionCount++;
  document.getElementById('question-number').textContent = `もんだい ${questionCount}`;

  // Re-animate card
  const card = document.getElementById('question-card');
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = '';

  if (selectedSubject === 'math') {
    generateMathQuestion();
  } else if (selectedSubject === 'lang') {
    generateLangQuestion();
  } else {
    generateTypingQuestion();
  }
}

/* 難易度によってランダムに学年を選ぶ */
function getGradeByMode() {
  if (selectedMode === 'beginner') return ['g1', 'g2', 'g3'][randInt(0, 2)];
  if (selectedMode === 'intermediate') return ['g4', 'g5', 'g6'][randInt(0, 2)];
  return ['m1', 'm2', 'm3'][randInt(0, 2)];
}

/* ── 算数 ── */
function generateMathQuestion() {
  let a, b, answer, text;
  let attempts = 0;
  let grade = getGradeByMode();
  do {
    switch (grade) {
      case 'g1': // + - (1~10)
        if (Math.random() < 0.5) { a = randInt(1, 10); b = randInt(1, 10); answer = a + b; text = `${a} + ${b} = ?`; }
        else { a = randInt(5, 10); b = randInt(1, a); answer = a - b; text = `${a} - ${b} = ?`; }
        break;
      case 'g2': // 掛け算九九
        a = randInt(1, 9); b = randInt(1, 9); answer = a * b; text = `${a} × ${b} = ?`;
        break;
      case 'g3': // × ÷
        if (Math.random() < 0.5) { a = randInt(3, 12); b = randInt(3, 12); answer = a * b; text = `${a} × ${b} = ?`; }
        else { answer = randInt(2, 9); b = randInt(2, 9); a = answer * b; text = `${a} ÷ ${b} = ?`; }
        break;
      case 'g4': // 大きな数 + -
        if (Math.random() < 0.5) { a = randInt(10, 99); b = randInt(10, 99); answer = a + b; text = `${a} + ${b} = ?`; }
        else { a = randInt(50, 99); b = randInt(10, a); answer = a - b; text = `${a} - ${b} = ?`; }
        break;
      case 'g5': // 小数の + -
        a = randInt(1, 99) / 10; b = randInt(1, 99) / 10;
        if (Math.random() < 0.5) { answer = Math.round((a + b)*10)/10; text = `${a} + ${b} = ?`; }
        else { if (a < b) { let t = a; a = b; b = t; } answer = Math.round((a - b)*10)/10; text = `${a} - ${b} = ?`; }
        break;
      case 'g6': // 小数のかけわり
        if (Math.random() < 0.5) { a = randInt(1, 99) / 10; b = randInt(2, 9); answer = Math.round((a * b)*10)/10; text = `${a} × ${b} = ?`; }
        else { answer = randInt(1, 99) / 10; b = randInt(2, 9); a = Math.round((answer * b)*10)/10; text = `${a} ÷ ${b} = ?`; }
        break;
      case 'm1': // 負の数
        a = randInt(-20, 20); b = randInt(-20, 20);
        if (Math.random() < 0.5) { answer = a + b; text = `${a < 0 ? `(${a})` : a} + ${b < 0 ? `(${b})` : b} = ?`; }
        else { answer = a - b; text = `${a < 0 ? `(${a})` : a} - ${b < 0 ? `(${b})` : b} = ?`; }
        break;
      case 'm2': // 方程式 (x + a = b) -> answer is x
        answer = randInt(-10, 20); b = randInt(-10, 20);
        a = answer + b; // x + b = a
        text = `x + ${b < 0 ? `(${b})` : b} = ${a}  (x=?)`;
        break;
      case 'm3': // 平方根
        answer = randInt(1, 20); a = answer * answer;
        text = `√${a} = ?`;
        break;
      default:
        a = randInt(1, 10); b = randInt(1, 10); answer = a + b; text = `${a} + ${b} = ?`;
    }
    attempts++;
  } while ((text === lastQuestionText || recentQuestions.includes(text)) && attempts < 100);
  
  lastQuestionText = text;
  recentQuestions.push(text);
  if (recentQuestions.length > 5) recentQuestions.shift();

  // Reset hint area
  document.getElementById('question-hint').textContent = '';
  const qtEl = document.getElementById('question-text');
  qtEl.textContent = text;
  qtEl.classList.remove('kanji-style');

  // Reset choices grid to default layout
  document.getElementById('choices-grid').classList.remove('lang-mode');

  const choices = generateMathChoices(answer);
  renderChoices(choices.map(String), String(answer), /* isText */ false);
}

/* ── 国語 ── */
function generateLangQuestion() {
  let pool = langPools[selectedMode];
  let idx = langPoolIdx[selectedMode];

  if (idx >= pool.length) {
    // Reshuffle when all used
    let lastQ = pool[pool.length - 1];
    langPools[selectedMode] = shuffle([...pool]);
    if (langPools[selectedMode][0] === lastQ) langPools[selectedMode].push(langPools[selectedMode].shift());
    idx = 0;
  }
  
  const q = langPools[selectedMode][idx];
  langPoolIdx[selectedMode] = idx + 1;

  document.getElementById('question-hint').textContent = q.hint || '';
  const qtEl = document.getElementById('question-text');
  qtEl.textContent = q.question;
  
  if (q.type === 'reading' && q.question.length <= 3) {
    qtEl.classList.add('kanji-style');
  } else {
    qtEl.classList.remove('kanji-style');
  }

  document.getElementById('choices-grid').classList.add('lang-mode');
  const shuffled = shuffle([...q.choices]);
  renderChoices(shuffled, q.answer, /* isText */ true);
}

/* ── タイピング ── */
function generateTypingQuestion() {
  let pool = typingPools[selectedMode];
  let idx = typingPoolIdx[selectedMode];

  if (idx >= pool.length) {
    let lastQ = pool[pool.length - 1];
    typingPools[selectedMode] = shuffle([...pool]);
    if (typingPools[selectedMode][0] === lastQ) typingPools[selectedMode].push(typingPools[selectedMode].shift());
    idx = 0;
  }
  
  const q = typingPools[selectedMode][idx];
  typingPoolIdx[selectedMode] = idx + 1;

  document.getElementById('question-hint').textContent = '';
  document.getElementById('question-text').textContent = '';
  
  document.getElementById('typing-word').textContent = q.display;
  currentTypingAnswer = q.romaji.toLowerCase();
  typingInputPos = 0;
  
  updateTypingRomajiDisplay();
  
  const inp = document.getElementById('typing-input');
  inp.value = '';
  inp.removeEventListener('keydown', handleTypingInput);
  inp.addEventListener('keydown', handleTypingInput);
  
  // フォーカスを当て直す
  setTimeout(() => inp.focus(), 10);
}

function updateTypingRomajiDisplay() {
  const el = document.getElementById('typing-romaji');
  const typed = currentTypingAnswer.substring(0, typingInputPos);
  const current = currentTypingAnswer.substring(typingInputPos, typingInputPos + 1);
  const untyped = currentTypingAnswer.substring(typingInputPos + 1);
  
  el.innerHTML = `<span class="typed">${typed}</span><span class="current">${current}</span><span class="untyped">${untyped}</span>`;
}

function handleTypingInput(e) {
  if (answering || !gameActive) return;
  
  // 装飾キーなどは無視
  if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
  e.preventDefault(); // デフォルト入力（ブラウザのスクロールなど）を防ぐ
  
  const char = e.key.toLowerCase();
  const targetChar = currentTypingAnswer[typingInputPos];
  
  if (char === targetChar) {
    typingInputPos++;
    try { SFX.correct(1); } catch(err){}
    
    if (typingInputPos >= currentTypingAnswer.length) {
      answering = true;
      streak++;
      if (streak > maxStreak) maxStreak = streak;
      correctCount++;
      const pts = selectedMode === 'intermediate' ? 15 : (selectedMode === 'advanced' ? 25 : 10);
      const bonus = Math.floor(streak / 3);
      score += pts + bonus * 5;
      
      updateTypingRomajiDisplay();
      updateHUD();
      
      // 正解演出
      const plate = document.getElementById('sushi-plate');
      plate.style.transform = 'scale(1.15)';
      plate.style.opacity = '0';
      
      setTimeout(() => {
        plate.style.transition = 'none';
        plate.style.transform = 'scale(0)';
        plate.style.opacity = '1';
        setTimeout(() => {
          plate.style.transition = 'all 0.3s ease';
          plate.style.transform = 'scale(1)';
          answering = false;
          generateQuestion();
        }, 50);
      }, 300);
    } else {
      updateTypingRomajiDisplay();
    }
  } else {
    streak = 0;
    wrongCount++;
    try { SFX.wrong(); } catch(err){}
    updateHUD();
    
    // エラーアニメーション
    const plate = document.getElementById('sushi-plate');
    plate.classList.remove('error-shake');
    void plate.offsetWidth;
    plate.classList.add('error-shake');
  }
}

/* ========== Choice rendering ========== */
function renderChoices(choices, correct, isText) {
  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';
  choices.forEach(val => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = val;
    btn.onclick = () => handleAnswer(btn, val, correct, isText);
    grid.appendChild(btn);
  });
}

/* ========== Math choice generator ========== */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function generateMathChoices(correct) {
  const set = new Set([correct]);
  let isDecimal = !Number.isInteger(correct);
  let tries = 0;
  while (set.size < 4 && tries < 200) {
    tries++;
    let offset = randInt(1, 10) * (Math.random() < 0.5 ? 1 : -1);
    if (isDecimal) offset = offset / 10;
    
    let candidate = correct + offset;
    if (isDecimal) candidate = Math.round(candidate * 10) / 10;

    if (candidate !== correct) set.add(candidate);
  }
  // If couldn't get 4 options, just fallback to dummy logic
  for (let i = 0; set.size < 4; i++) {
    if (i !== correct) set.add(i);
  }
  return shuffle([...set].slice(0, 4));
}

/* ========== Shuffle ========== */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ========== Answer handling ========== */
function handleAnswer(btn, chosen, correct, isText) {
  if (answering) return;
  answering = true;

  const allBtns = document.querySelectorAll('.choice-btn');
  allBtns.forEach(b => b.style.pointerEvents = 'none');

  let pts = 10;
  if (selectedMode === 'intermediate') pts = 15;
  if (selectedMode === 'advanced') pts = 25;

  const isCorrect = isText ? chosen === correct : String(chosen) === String(correct);

  if (isCorrect) {
    btn.classList.add('correct');
    streak++;
    if (streak > maxStreak) maxStreak = streak;
    correctCount++;
    const bonus = Math.floor(streak / 3);
    score += pts + bonus * 5;
    try { SFX.correct(streak); } catch (e) { }
    showFeedback(true, streak);
  } else {
    btn.classList.add('wrong');
    // Highlight the correct button
    allBtns.forEach(b => {
      if (b.textContent === String(correct)) b.classList.add('correct');
    });
    streak = 0;
    wrongCount++;
    try { SFX.wrong(); } catch (e) { }
    showFeedback(false);
  }

  updateHUD();

  setTimeout(() => {
    hideFeedback();
    allBtns.forEach(b => b.style.pointerEvents = '');
    answering = false;
    generateQuestion();
  }, 900);
}

/* ========== Feedback overlay ========== */
function showFeedback(isCorrect, currentStreak) {
  const overlay = document.getElementById('feedback-overlay');
  const text = document.getElementById('feedback-text');
  if (isCorrect) {
    if (currentStreak >= 5) text.textContent = '🔥🔥 すごい！ ' + currentStreak + 'れんぞく！';
    else if (currentStreak >= 3) text.textContent = '⚡ ' + currentStreak + 'れんぞく！';
    else text.textContent = '⭕ せいかい！';
    text.style.color = '#22c55e';
  } else {
    text.textContent = '❌ まちがい…';
    text.style.color = '#ef4444';
  }
  overlay.classList.add('show');
}
function hideFeedback() {
  document.getElementById('feedback-overlay').classList.remove('show');
}

/* ========== HUD update ========== */
function updateHUD() {
  const scoreEl = document.getElementById('score-display');
  scoreEl.textContent = score;
  scoreEl.classList.remove('score-pulse');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('score-pulse');

  document.getElementById('streak-display').textContent =
    streak > 0 ? streak + (streak >= 3 ? '🔥' : '') : '0';

  document.getElementById('miss-display').textContent = wrongCount;

  updateTimerUI();
}

/* ========== End game ========== */
function endGame() {
  gameActive = false;
  stopTimer();
  try { SFX.timeUp(); } catch (e) { }
  showScreen('result');

  document.getElementById('result-score').textContent = score;
  document.getElementById('result-correct').textContent = correctCount;
  document.getElementById('result-wrong').textContent = wrongCount;
  document.getElementById('result-streak').textContent = maxStreak;

  const pct = questionCount > 0 ? correctCount / questionCount : 0;
  let mascot, title, message;

  const missMsg = `（ミス：${wrongCount}かい）`;

  if (pct === 1) {
    mascot = '🏆'; title = 'パーフェクト！！'; message = '全問正解！ あなたは天才！！✨';
  } else if (pct >= 0.8) {
    mascot = '🥇'; title = 'すばらしい！'; message = 'ほぼパーフェクト！ すごいね！ ' + missMsg;
  } else if (pct >= 0.6) {
    mascot = '🥈'; title = 'よくがんばった！'; message = 'もう少しで満点！ファイト！ ' + missMsg;
  } else if (pct >= 0.4) {
    mascot = '🥉'; title = 'まずまずだよ！'; message = 'れんしゅうすればもっとうまくなるよ！ ' + missMsg;
  } else {
    mascot = '😊'; title = 'がんばったね！'; message = '次はもっとできるよ！いっしょに練習しよう！ ' + missMsg;
  }

  document.getElementById('result-mascot').textContent = mascot;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-message').textContent = message;

  if (pct >= 0.6) launchConfetti();
}

/* ========== Confetti ========== */
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#facc15', '#ec4899', '#8b5cf6', '#22c55e', '#06b6d4', '#f97316'];
  const pieces = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    size: Math.random() * 10 + 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    speed: Math.random() * 3 + 2,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.2,
  }));

  let frames = 0;
  (function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.y += p.speed;
      p.angle += p.spin;
      if (p.y > canvas.height) { p.y = -p.size; p.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
    if (++frames < 260) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
}

/* ==========================================================
   タイピングゲームの仕組み
   キーボードで1文字ずつローマ字を打って、
   全部合ったら次の問題へ進むよ！
   ========================================================== */

/* ── タイピング問題を表示する ── */
function generateTypingQuestion() {
  let pool = typingPools[selectedMode];
  let idx = typingPoolIdx[selectedMode];

  if (idx >= pool.length) {
    let lastQ = pool[pool.length - 1];
    typingPools[selectedMode] = shuffle([...pool]);
    if (typingPools[selectedMode][0] === lastQ) typingPools[selectedMode].push(typingPools[selectedMode].shift());
    idx = 0;
  }
  
  const q = typingPools[selectedMode][idx];
  typingPoolIdx[selectedMode] = idx + 1;

  currentTypingAnswer = q.romaji.toLowerCase();
  typingInputPos = 0;

  // 日本語のことばを画面に表示する
  document.getElementById('question-hint').textContent = q.hint || '';
  const wordEl = document.getElementById('typing-word');
  wordEl.textContent = q.display;
  
  // 寿司アイコンをランダムに
  const sushiIcons = ['🍣', '🍢', '🍱', '🍙', '🍛', '🍤', '🍮', '🍶', '🍵'];
  const iconEl = document.getElementById('sushi-icon');
  if (iconEl) iconEl.textContent = sushiIcons[randInt(0, sushiIcons.length - 1)];

  // お皿のアニメーションをリセットして開始
  const plate = document.getElementById('sushi-plate');
  if (plate) {
    plate.classList.remove('sushi-moving', 'sushi-disappearing', 'sushi-shake');
    void plate.offsetWidth; // reflow
    plate.classList.add('sushi-moving');

    // お皿が消えたときの処理（時間切れミス）
    plate.onanimationend = (e) => {
      if (e.animationName === 'sushiFlow' && gameActive && selectedSubject === 'typing') {
        handleTypingMiss();
      }
    };
  }

  updateTypingUI();

  // インプットにフォーカス
  const input = document.getElementById('typing-input');
  if (input) {
    input.value = '';
    input.focus();
    setTimeout(() => input.focus(), 100);
  }
}

function updateTypingUI() {
  const romajiEl = document.getElementById('typing-romaji');
  if (!romajiEl) return;
  const ans = currentTypingAnswer;
  
  let html = '';
  for (let i = 0; i < ans.length; i++) {
    if (i < typingInputPos) {
      html += `<span class="typed">${ans[i]}</span>`;
    } else if (i === typingInputPos) {
      html += `<span class="current">${ans[i]}</span>`;
    } else {
      html += `<span class="untyped">${ans[i]}</span>`;
    }
  }
  romajiEl.innerHTML = html;
}

/* ── キーボード入力のたびに呼ばれる関数 ── */
// 入力イベントの設定（一度だけ実行するようにする）
if (!window.typingEventSet) {
  document.getElementById('typing-input').addEventListener('input', (e) => {
    if (selectedSubject !== 'typing' || !gameActive) return;
    
    const val = e.target.value.toLowerCase();
    const char = val.slice(-1); // 最後に打った文字
    e.target.value = ''; // すぐに消す

    if (char === currentTypingAnswer[typingInputPos]) {
      // 正解のキー
      typingInputPos++;
      try { SFX.type(); } catch(err) {}
      
      if (typingInputPos >= currentTypingAnswer.length) {
        handleTypingFinish();
      } else {
        updateTypingUI();
      }
    } else {
      // ミスキー（バックスペースなどは無視されるので安心）
      if (char) handleTypingShake();
    }
  });

  // 画面クリックでフォーカスを戻す（寿司打っぽく）
  document.addEventListener('click', (e) => {
    if (selectedSubject === 'typing' && gameActive) {
      const input = document.getElementById('typing-input');
      if (input) input.focus();
    }
  });
  window.typingEventSet = true;
}

function handleTypingShake() {
  const plate = document.getElementById('sushi-plate');
  if (plate) {
    plate.classList.remove('sushi-shake');
    void plate.offsetWidth;
    plate.classList.add('sushi-shake');
  }
  try { SFX.miss(); } catch(err) {}
  wrongCount++;
  streak = 0;
  updateHUD();
}

function handleTypingFinish() {
  const plate = document.getElementById('sushi-plate');
  if (plate) {
    plate.classList.add('sushi-disappearing');
    plate.onanimationend = null; // Missを防止
  }
  
  // ポイント加算
  let pts = 10;
  if (selectedMode === 'intermediate') pts = 15;
  if (selectedMode === 'advanced') pts = 25;
  
  score += pts;
  correctCount++;
  streak++;
  if (streak > maxStreak) maxStreak = streak;
  
  try { SFX.correct(streak); } catch(err) {}
  updateHUD();
  
  // 次の問題へ（少し間を置く）
  setTimeout(() => {
    if (gameActive && selectedSubject === 'typing') generateTypingQuestion();
  }, 350);
}

function handleTypingMiss() {
  // お皿が流れていってしまった
  wrongCount++;
  streak = 0;
  updateHUD();
  try { SFX.miss(); } catch(err) {}
  
  // 次の問題へ
  if (gameActive && selectedSubject === 'typing') generateTypingQuestion();
}
