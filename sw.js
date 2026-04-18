// sw.js – Service Worker (まなびゲーム PWA)
const CACHE = 'manabi-v13';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './game.js',
    './bgm.js',
    './duolingo.js',
    './kanji_data.js',
    './typing_data.js',
    './prog_data.js',
    './math_data.js',
    './bgm.mp3',
    './icon-192.png',
    './icon-512.png',
    './manifest.json',
];

// インストール: 上記ファイルをすべてキャッシュ
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => c.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// アクティベート: 古いキャッシュを削除
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// フェッチ: キャッシュ優先 → ネットワーク fallback
self.addEventListener('fetch', e => {
    const url = e.request.url;

    // Google Fonts など外部リクエストはネットワーク優先 → キャッシュ fallback
    if (!url.startsWith(self.location.origin)) {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    // Google Fonts のレスポンスをキャッシュに保存
                    if (res && res.status === 200 && res.type === 'basic') {
                        const clone = res.clone();
                        caches.open(CACHE).then(c => c.put(e.request, clone));
                    }
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // 同一オリジン: Cache First → Network fallback → キャッシュに保存
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(res => {
                if (res && res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            });
        })
    );
});
