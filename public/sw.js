/**
 * Service Worker — PWA Quản lý bến bãi Sơn Cảng
 * Tuân thủ quy tắc bảo mật dữ liệu nghiệp vụ & tài chính:
 * - CHỈ cache các static assets bất biến cùng origin (/manifest.json, /icons/*, _next/static/*).
 * - TUYỆT ĐỐI KHÔNG cache dữ liệu nhạy cảm: /api/*, Supabase REST/Auth, hoặc các trang điều hướng chứa session/tài chính.
 * - KHÔNG hứa hẹn đồng bộ tự động khi chưa có engine hàng đợi offline được phê duyệt.
 */

const CACHE_NAME = 'soncang-yms-cache-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/file.svg',
  '/globe.svg',
  '/window.svg'
];

// 1. Cài đặt và cache các tài nguyên tĩnh nền tảng
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Kích hoạt và dọn dẹp các cache phiên bản cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Lắng nghe thông điệp dọn cache (ví dụ khi Đăng xuất)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((name) => caches.delete(name)));
      })
    );
  }
});

// 4. Xử lý tìm nạp (Fetch Strategy) an toàn
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // BỎ QUA các yêu cầu không phải GET hoặc cross-origin (Supabase Cloud DEV, external APIs)
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // BỎ QUA các yêu cầu API, RPC hoặc Auth
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return;
  }

  // KHÔNG cache các trang HTML động có chứa thông tin phiên đăng nhập / giao dịch
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          '<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Ngoại tuyến — Sơn Cảng</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:sans-serif;padding:2rem;text-align:center;"><h2>Mất kết nối mạng</h2><p>Hệ thống quản lý bến bãi Sơn Cảng yêu cầu kết nối mạng để bảo đảm tính toàn vẹn của dữ liệu giao dịch.</p><p>Vui lòng kiểm tra lại kết nối Wi-Fi hoặc 4G/5G tại bãi và tải lại trang.</p></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })
    );
    return;
  }

  // Tài nguyên tĩnh: Network-first với fallback cache khi offline (tránh kẹt phiên bản cũ khi deploy mới)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    STATIC_ASSETS.includes(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});

