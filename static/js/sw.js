// NOTE
// Even though this service worker is not on the root of this web application
// It has been configured, through swing_main.py to make it look like it is.

const filesToPreCache = [
    // Web pages
    { url: '/', revision: '2021-11-16-2' },
    { url: '/login/', revision: '2021-11-16-2' },
    { url: '/politicaprivacidad/', revision: '2021-11-16-2' },
    { url: '/sobrenosotras/', revision: '2021-11-16-2' },
    { url: '/terminosdelservicio/', revision: '2021-11-16-2' },
    // Images
    { url: '/static/images/manifest/agent_f.svg', revision: '2021-11-16-2' },
    { url: '/static/images/manifest/bid_slogan.png', revision: '2021-11-16-2' },
    { url: '/static/images/manifest/contact-os.svg', revision: '2021-11-16-2' },
    { url: '/static/images/manifest/icon-512x512.png', revision: '2021-11-16-2' },
    { url: '/static/images/manifest/user_f.svg', revision: '2021-11-16-2' },
    { url: '/static/images/manifest/wifi_antenna.svg', revision: '2021-11-16-2' },
    // Audio Files
    { url: '/static/media/audio/call_connected.mp3', revision: '2021-11-16-2' },
    { url: '/static/media/audio/call_ended.mp3', revision: '2021-11-16-2' },
    { url: '/static/media/audio/calling_ring.mp3', revision: '2021-11-16-2' }
];

// Importing Localforage to access localStorage
importScripts('/static/js/localforage.min.js');
const swStore = localforage.createInstance({
    name: 'swingcms-sw'
});

// Importing Google's Workbox library for ServiceWorker implementation
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.0.0/workbox-sw.js');

// Workbox Force Set Development/Production Builds 
// Development = debug: true 
// Production = debug: false
workbox.setConfig({ debug: false });

// Allows the ServiceWorker to update the app after user triggers refresh by updating it's lifecycle
workbox.core.skipWaiting();
workbox.core.clientsClaim();

// Configuring Workbox
workbox.core.setCacheNameDetails({
    prefix: '126teorienta',
    suffix: 'v2021-11-16-2',
    precache: 'pre-cache',
    runtime: 'run-time',
    googleAnalytics: 'ga'
});

// Install Event and Pre-Cache
workbox.precaching.precacheAndRoute(filesToPreCache);
// Activate Event and Delete Old Caches
self.addEventListener('activate', event => {
    const promiseChain = caches.keys().then((cacheNames) => {
        // Get all valid caches
        let validCacheSet = new Set(Object.values(workbox.core.cacheNames));
        validCacheSet.add('126teorienta-webfonts');
        validCacheSet.add('126teorienta-css_js');
        validCacheSet.add('126teorienta-pages');
        validCacheSet.add('126teorienta-img');

        return Promise.all(
            cacheNames.filter((cacheName) => {
                return !validCacheSet.has(cacheName);
            }).map((cacheName) => {
                console.log("Deleting Cache: ", cacheName);
                caches.delete(cacheName);
            })
        );
    });
    // Keep the service worker alive until all caches are deleted.
    event.waitUntil(promiseChain);
});
// Store Service Worker current version
swStore.setItem('swVersion', workbox.core.cacheNames.suffix).then( (val) => {
    console.log('Service Worker version: ' + val);
});

// Enable Google Analytics Offline
workbox.googleAnalytics.initialize();

// Cache for Web Pages
workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
        cacheName: '126teorienta-pages',
        plugins: [
            // Ensure that only requests that result in a 200 status are cached
            new workbox.cacheableResponse.CacheableResponsePlugin({
                statuses: [200],
            }),
        ],
    }),
);

// Cache for Web Fonts.
workbox.routing.registerRoute(
    new RegExp(/.*(?:fonts\.googleapis|fonts\.gstatic|cloudflare)\.com/),
    new workbox.strategies.CacheFirst({
        cacheName: '126teorienta-webfonts',
        plugins: [
            new workbox.expiration.ExpirationPlugin({
                // Keep at most 60 entries.
                maxEntries: 60,
                // Don't keep any entries for more than 10 days.
                maxAgeSeconds: 10 * 24 * 60 * 60,
                // Automatically cleanup if quota is exceeded.
                purgeOnQuotaError: true,
            }),
        ],
    }),
);

// Cache for CSS and JS
workbox.routing.registerRoute(
    new RegExp(/\.(?:js|css)$/),
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: '126teorienta-css_js',
    })
);

// Cache for Images
workbox.routing.registerRoute(
    new RegExp('\.(?:png|gif|webp|jpg|jpeg|svg)$'),
    new workbox.strategies.CacheFirst({
        cacheName: '126teorienta-img',
        plugins: [
            new workbox.expiration.ExpirationPlugin({
                // Keep at most 60 entries.
                maxEntries: 60,
                // Don't keep any entries for more than 30 days.
                maxAgeSeconds: 30 * 24 * 60 * 60,
                // Automatically cleanup if quota is exceeded.
                purgeOnQuotaError: true,
            }),
        ],
    }),
);

// // Push Messages
// self.addEventListener('push', event => {
//     var title = 'Yay a message.';
//     var body = 'We have received a push message.';
//     var icon = '/images/smiley.svg';
//     var tag = 'request';
//     event.waitUntil(
//         self.registration.showNotification(title, {
//             body: body,
//             icon: icon,
//             tag: tag
//         })
//     );
// });
