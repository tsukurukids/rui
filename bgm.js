// BGM.js (mp3再生バージョン)
const BGM = (() => {
    'use strict';
    let playing = false;
    let muted = false;
    let actxInited = false; // オーディオの準備ができたかどうか

    function getAudio() {
        return document.getElementById('bgm-audio');
    }

    function updateBtn() {
        const b = document.getElementById('bgm-toggle');
        if (!b) return;
        b.textContent = (!playing || muted) ? '🔇' : '🎵';
        b.title = (!playing || muted) ? 'BGMをオンにする' : 'BGMをオフにする';
    }

    return {
        start() {
            if (playing) return;
            const audio = getAudio();
            if (audio) {
                audio.volume = muted ? 0 : 0.3; // ボリュームは30%くらい
                // ブラウザの制限で再生できないエラーを無視する
                audio.play().catch(e => console.warn('BGM再生エラー:', e));
                playing = true;
                updateBtn();
            }
        },
        toggle() {
            const audio = getAudio();
            if (!audio) return;

            if (!playing) { 
                this.start(); 
                return; 
            }
            // プレイ中ならミュート（消音）状態を切り替える
            muted = !muted;
            audio.volume = muted ? 0 : 0.3;
            updateBtn();
        },
        isPlaying() { return playing; },
        isMuted() { return muted; },
    };
})();

// ============================================================
// SFX – 効果音モジュール（BGMとは独立した専用 AudioContext）
// ============================================================
const SFX = (() => {
    'use strict';
    let actx = null;
    let master = null;
    const VOL = 0.45;

    function ctx() {
        if (!actx || actx.state === 'closed') {
            actx = new (window.AudioContext || window.webkitAudioContext)();
            master = actx.createGain();
            master.gain.value = VOL;
            master.connect(actx.destination);
        }
        if (actx.state === 'suspended') actx.resume();
        return actx;
    }

    function tone(freq, startTime, duration, type, vol) {
        const c = ctx();
        const osc = c.createOscillator();
        const env = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        env.gain.setValueAtTime(0, startTime);
        env.gain.linearRampToValueAtTime(vol, startTime + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.connect(env);
        env.connect(master);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
    }

    return {
        /**
         * 正解音 – streak ごとにグレードアップ
         *  1-2 : シンプルな2音ディン
         *  3-4 : 3音アルペジオ
         *  5+  : 4音ファンファーレ
         */
        correct(streak = 1) {
            const c = ctx();
            const t = c.currentTime;
            if (streak >= 5) {
                tone(523.25, t, 0.09, 'square', 0.38);
                tone(659.25, t + 0.08, 0.09, 'square', 0.38);
                tone(783.99, t + 0.16, 0.09, 'square', 0.38);
                tone(1046.5, t + 0.24, 0.30, 'square', 0.45);
                tone(1046.5, t + 0.24, 0.30, 'sine', 0.15);
            } else if (streak >= 3) {
                tone(523.25, t, 0.10, 'square', 0.35);
                tone(659.25, t + 0.09, 0.10, 'square', 0.35);
                tone(783.99, t + 0.18, 0.22, 'square', 0.38);
            } else {
                tone(659.25, t, 0.10, 'square', 0.30);
                tone(783.99, t + 0.09, 0.18, 'square', 0.33);
            }
        },

        /** 不正解音 – 低めのブザー */
        wrong() {
            const c = ctx();
            const t = c.currentTime;
            tone(220, t, 0.14, 'sawtooth', 0.28);
            tone(180, t + 0.12, 0.22, 'sawtooth', 0.24);
        },

        /** タイムアップ音 */
        timeUp() {
            const c = ctx();
            const t = c.currentTime;
            tone(440, t, 0.15, 'square', 0.25);
            tone(330, t + 0.13, 0.15, 'square', 0.25);
            tone(220, t + 0.26, 0.40, 'sawtooth', 0.22);
        },
    };
})();
