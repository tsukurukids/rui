// ============================================================
// duolingo.js  ─  Duolingo 風システム
//   ・ハート（ライフ）
//   ・XP / レベル
//   ・デイリーストリーク（localStorage）
//   ・レッスン完了演出
//   ・進捗バー
//   ・答え合わせパネル（正解・不正解表示）
// ============================================================

/* ─── ストレージキー ─── */
const STORAGE_KEY = 'manabi_progress_v1';

/* ─── デフォルト値 ─── */
const DEFAULT_PROGRESS = {
  xp: 0,
  level: 1,
  dailyStreak: 0,
  lastPlayDate: null,   // 'YYYY-MM-DD'
  totalLessons: 0,
  bestScore: 0,
};

/* ─── XP テーブル（レベル毎に必要なXP） ─── */
function xpForLevel(lv) {
  // 1→2: 100, 2→3: 180, 3→4: 280 … 指数的に増加
  return Math.floor(100 * Math.pow(1.35, lv - 1));
}

/* ─── データ読み書き ─── */
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch (e) { }
  return { ...DEFAULT_PROGRESS };
}
function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) { }
}

/* ─── デイリーストリーク更新 ─── */
function updateDailyStreak(p) {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  if (p.lastPlayDate === today) return; // 今日すでにプレイ済み
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (p.lastPlayDate === yesterday) {
    p.dailyStreak += 1; // 昨日もプレイ → 継続
  } else {
    p.dailyStreak = 1;  // リセット
  }
  p.lastPlayDate = today;
}

/* ─── XP 加算 ─── */
function addXP(p, amount) {
  p.xp += amount;
  let leveled = false;
  while (p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level += 1;
    leveled = true;
  }
  return leveled;
}

/* ──────────────────────────────────────────
   Duo  ─  ゲーム内 Duolingo 風システム
────────────────────────────────────────── */
const Duo = (() => {
  'use strict';

  /* セッション変数 */
  let hearts = 3;
  let sessionXP = 0;
  let questionsDone = 0;
  let totalQuestions = 10;   // 1レッスン = 10問
  let progress = loadProgress();
  let leveledUpThisSession = false;

  /* 正解・不正解パネル用コールバック */
  let _onContinue = null;

  /* ────────── 初期化 ────────── */
  function init() {
    progress = loadProgress();
    renderTopBar();
    renderHeartsHUD();
    renderProgressBar();
  }

  /* ────────── セッション開始 ────────── */
  function startSession(questionsTotal = 10) {
    hearts = 3;
    sessionXP = 0;
    questionsDone = 0;
    totalQuestions = questionsTotal;
    leveledUpThisSession = false;

    renderHeartsHUD();
    renderProgressBar();
    renderTopBar(); // streak など更新
  }

  /* ────────── ハートUI ────────── */
  function renderHeartsHUD() {
    const el = document.getElementById('duo-hearts');
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const span = document.createElement('span');
      span.className = 'duo-heart' + (i < hearts ? ' full' : ' empty');
      span.textContent = i < hearts ? '❤️' : '🖤';
      el.appendChild(span);
    }
  }

  /* ────────── 進捗バー ────────── */
  function renderProgressBar() {
    const bar = document.getElementById('duo-progress-fill');
    const label = document.getElementById('duo-progress-label');
    if (!bar) return;
    const pct = Math.min(100, Math.round((questionsDone / totalQuestions) * 100));
    bar.style.width = pct + '%';
    if (label) label.textContent = `${questionsDone} / ${totalQuestions}`;
  }

  /* ────────── トップバー（XP/レベル/デイリー） ────────── */
  function renderTopBar() {
    const streakEl = document.getElementById('duo-streak-count');
    const xpEl = document.getElementById('duo-xp-display');
    const lvEl = document.getElementById('duo-level-display');
    if (streakEl) streakEl.textContent = progress.dailyStreak;
    if (xpEl) xpEl.textContent = progress.xp + ' XP';
    if (lvEl) lvEl.textContent = 'Lv.' + progress.level;
  }

  /* ────────── 正解を処理 ────────── */
  function onCorrect(xpGain, streakCount, callback) {
    questionsDone++;
    sessionXP += xpGain;
    renderProgressBar();

    const panel = document.getElementById('duo-feedback-panel');
    const panelIcon = document.getElementById('duo-panel-icon');
    const panelMsg = document.getElementById('duo-panel-msg');
    const panelSub = document.getElementById('duo-panel-sub');
    const panelBtn = document.getElementById('duo-panel-btn');
    const panelXP = document.getElementById('duo-panel-xp');

    if (!panel) { callback && callback(); return; }

    // Duolingo 風励ましメッセージ
    const msgs = ['すごい！', 'やったね！', 'さすが！', 'かんぺき！', 'すてき！'];
    const subMsgs = ['その調子！', 'どんどんうまくなってるよ！', '正解だよ！'];
    panel.className = 'duo-panel correct show';
    panelIcon.textContent = streakCount >= 5 ? '🔥' : streakCount >= 3 ? '⚡' : '✅';
    panelMsg.textContent = streakCount >= 5
      ? `🔥 ${streakCount}れんぞく！すごすぎる！`
      : streakCount >= 3
      ? `⚡ ${streakCount}れんぞく！すばらしい！`
      : msgs[Math.floor(Math.random() * msgs.length)];
    panelSub.textContent = subMsgs[Math.floor(Math.random() * subMsgs.length)];
    if (panelXP) panelXP.textContent = '+' + xpGain + ' XP';
    panelBtn.textContent = questionsDone >= totalQuestions ? 'けっかをみる 🏆' : 'つぎへ →';
    panelBtn.className = 'duo-panel-btn correct-btn';

    _onContinue = callback;
    panelBtn.onclick = () => closeFeedbackPanel();
  }

  /* ────────── 不正解を処理 ────────── */
  function onWrong(correctText, callback) {
    questionsDone++;
    renderProgressBar();

    hearts = Math.max(0, hearts - 1);
    renderHeartsHUD();

    // ハート点滅アニメ
    const heartEls = document.querySelectorAll('.duo-heart');
    if (heartEls[hearts]) {
      heartEls[hearts].classList.add('heart-break');
      setTimeout(() => heartEls[hearts].classList.remove('heart-break'), 600);
    }

    const panel = document.getElementById('duo-feedback-panel');
    const panelIcon = document.getElementById('duo-panel-icon');
    const panelMsg = document.getElementById('duo-panel-msg');
    const panelSub = document.getElementById('duo-panel-sub');
    const panelBtn = document.getElementById('duo-panel-btn');
    const panelXP = document.getElementById('duo-panel-xp');

    if (!panel) { callback && callback(); return; }

    const wrongMsgs = ['もう一回チャレンジ！', 'おしい！', '次はがんばろう！'];
    panel.className = 'duo-panel wrong show';
    panelIcon.textContent = hearts === 0 ? '💔' : '❌';
    panelMsg.textContent = hearts === 0 ? 'ハートがなくなったよ！' : wrongMsgs[Math.floor(Math.random() * wrongMsgs.length)];
    panelSub.textContent = correctText ? `せいかい: ${correctText}` : 'きにしないで！';
    if (panelXP) panelXP.textContent = '';
    panelBtn.textContent = hearts === 0 ? 'もういちど 🔄' : (questionsDone >= totalQuestions ? 'けっかをみる 🏆' : 'つぎへ →');
    panelBtn.className = 'duo-panel-btn wrong-btn';

    _onContinue = callback;
    panelBtn.onclick = () => closeFeedbackPanel();
  }

  function closeFeedbackPanel() {
    const panel = document.getElementById('duo-feedback-panel');
    if (panel) panel.className = 'duo-panel';
    if (_onContinue) { _onContinue(); _onContinue = null; }
  }

  /* ────────── セッション終了 ────────── */
  function endSession(correctCount, wrongCount, callback) {
    progress = loadProgress();
    updateDailyStreak(progress);
    const leveled = addXP(progress, sessionXP);
    progress.totalLessons += 1;
    if (sessionXP > progress.bestScore) progress.bestScore = sessionXP;
    saveProgress(progress);
    leveledUpThisSession = leveled;
    renderTopBar();

    // レッスン完了モーダル表示
    showCompletionModal(correctCount, wrongCount, sessionXP, leveled, callback);
  }

  /* ────────── レッスン完了モーダル ────────── */
  function showCompletionModal(correct, wrong, xpGained, leveled, onHome) {
    const modal = document.getElementById('duo-complete-modal');
    if (!modal) { onHome && onHome(); return; }

    const total = correct + wrong;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    document.getElementById('duo-complete-xp').textContent = '+' + xpGained + ' XP';
    document.getElementById('duo-complete-accuracy').textContent = pct + '%';
    document.getElementById('duo-complete-correct').textContent = correct;
    document.getElementById('duo-complete-wrong').textContent = wrong;
    document.getElementById('duo-complete-streak').textContent = '🔥 ' + progress.dailyStreak + '日';

    // dynamicメッセージ
    const msgEl = document.getElementById('duo-complete-msg');
    if (pct === 100) msgEl.textContent = '🏆 パーフェクト！！ 天才すぎる！';
    else if (pct >= 80) msgEl.textContent = '🥇 すばらしい！ほぼ満点！';
    else if (pct >= 60) msgEl.textContent = '🥈 よくがんばった！';
    else msgEl.textContent = '😊 チャレンジ完了！次はもっとできるよ！';

    // レベルアップ表示
    const lvUpEl = document.getElementById('duo-complete-levelup');
    if (lvUpEl) lvUpEl.style.display = leveled ? 'flex' : 'none';
    const lvNumEl = document.getElementById('duo-complete-level');
    if (lvNumEl && leveled) lvNumEl.textContent = 'Lv.' + progress.level;

    document.getElementById('duo-complete-home').onclick = () => {
      modal.classList.remove('show');
      onHome && onHome();
    };
    document.getElementById('duo-complete-retry').onclick = () => {
      modal.classList.remove('show');
      // retryGame は game.js で定義
      if (typeof retryGame === 'function') retryGame();
    };

    modal.classList.add('show');
    // コンフェッティ
    if (pct >= 60 && typeof launchConfetti === 'function') launchConfetti();
  }

  /* ────────── タイトル画面のステータス表示 ────────── */
  function renderTitleStats() {
    const p = loadProgress();
    const el = document.getElementById('duo-title-stats');
    if (!el) return;
    el.innerHTML = `
      <div class="duo-stat-pill streak">🔥 ${p.dailyStreak}日</div>
      <div class="duo-stat-pill xp">⭐ ${p.xp} XP</div>
      <div class="duo-stat-pill level">Lv.${p.level}</div>
      <div class="duo-stat-pill lessons">📚 ${p.totalLessons}レッスン</div>
    `;
  }

  /* ─── 外部公開 ─── */
  return {
    init,
    startSession,
    onCorrect,
    onWrong,
    endSession,
    getHearts: () => hearts,
    getSessionXP: () => sessionXP,
    renderTitleStats,
    renderTopBar,
    closeFeedbackPanel,
  };
})();

/* ─── 起動時に初期化 ─── */
window.addEventListener('DOMContentLoaded', () => {
  Duo.init();
  Duo.renderTitleStats();
});
