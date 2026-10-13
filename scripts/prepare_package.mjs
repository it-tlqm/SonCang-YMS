import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const baseDir = 'SONCANG_UI_UX_REVIEW_PACKAGE';

async function main() {
  console.log('=== BẮT ĐẦU CHUẨN BỊ BỘ HỒ SƠ ĐÁNH GIÁ UI/UX SƠN CẢNG ===');

  // Tạo cấu trúc thư mục
  const dirs = [
    `${baseDir}/01_STITCH_DESIGNS`,
    `${baseDir}/01_STITCH_DESIGNS/HTML_EXPORTED_FROM_STITCH`,
    `${baseDir}/02_CURRENT_PWA_SCREENSHOTS/desktop_1440`,
    `${baseDir}/02_CURRENT_PWA_SCREENSHOTS/mobile_390`,
    `${baseDir}/03_DESIGN_DOCUMENTS`,
    `${baseDir}/04_FRONTEND_UI_SOURCE/app`,
    `${baseDir}/04_FRONTEND_UI_SOURCE/components`,
    `${baseDir}/04_FRONTEND_UI_SOURCE/types`,
    `${baseDir}/04_FRONTEND_UI_SOURCE/styles_and_config`,
  ];
  for (const d of dirs) {
    fs.mkdirSync(d, { recursive: true });
  }

  // 1. Tải và sao chép 01_STITCH_DESIGNS
  console.log('\n--- 1. XỬ LÝ 01_STITCH_DESIGNS ---');
  const manifest = JSON.parse(fs.readFileSync('scripts/stitch_screens_manifest.json', 'utf8'));

  // Sao chép các ảnh desktop đã tải
  const existingPreviews = [
    { src: 'public/stitch_previews/01_dashboard_cckb.png', dest: `${baseDir}/01_STITCH_DESIGNS/01_dashboard_cckb.png` },
    { src: 'public/stitch_previews/02_gate_in_entry.png', dest: `${baseDir}/01_STITCH_DESIGNS/02_gate_in_entry.png` },
    { src: 'public/stitch_previews/03_gate_out_exit_payment.png', dest: `${baseDir}/01_STITCH_DESIGNS/03_gate_out_exit_payment.png` },
    { src: 'public/stitch_previews/04_design_system_preview.png', dest: `${baseDir}/01_STITCH_DESIGNS/04_design_system_preview.png` },
  ];
  for (const p of existingPreviews) {
    if (fs.existsSync(p.src)) {
      fs.copyFileSync(p.src, p.dest);
      console.log(`Đã sao chép: ${p.dest}`);
    }
  }

  // Tải các screenshot Mobile từ Stitch
  const mobileTargets = [
    { id: '05a8b909e7c9472789fd6e6ed79e7833', name: '01_dashboard_cckb_mobile_390.png' },
    { id: 'f4bf95f76a4b42c68fc7217bd240787e', name: '02_gate_in_entry_mobile_390.png' },
    { id: '869f6054df9a4679a69c86004caec633', name: '03_gate_out_exit_payment_mobile_390.png' },
  ];

  for (const mt of mobileTargets) {
    const item = manifest.find(s => s.id === mt.id);
    if (item && item.screenshotUrl) {
      console.log(`Đang tải ảnh mobile: ${mt.name} từ Stitch...`);
      const res = await fetch(item.screenshotUrl);
      const buf = await res.arrayBuffer();
      fs.writeFileSync(`${baseDir}/01_STITCH_DESIGNS/${mt.name}`, Buffer.from(buf));
      console.log(`-> Đã lưu: ${baseDir}/01_STITCH_DESIGNS/${mt.name} (${buf.byteLength} bytes)`);
    }
  }

  // Tải các file HTML xuất từ Stitch
  const htmlTargets = [
    { id: 'bd7730dc2ef843369c2b56c7f4f56a33', name: '01_dashboard_cckb_desktop.html' },
    { id: '4c2a4f3f2505474a88937d469215e737', name: '02_gate_in_entry_desktop.html' },
    { id: '73d7eddc2da14cadbac6f71b1a77c9a0', name: '03_gate_out_exit_payment_desktop.html' },
    { id: 'bd7a8e54ef6c4dd39a17f865d4541a60', name: '04_design_system_library.html' },
  ];

  for (const ht of htmlTargets) {
    const item = manifest.find(s => s.id === ht.id);
    if (item && item.htmlCodeUrl) {
      console.log(`Đang tải HTML gốc Stitch: ${ht.name}...`);
      const res = await fetch(item.htmlCodeUrl);
      const htmlText = await res.text();
      fs.writeFileSync(`${baseDir}/01_STITCH_DESIGNS/HTML_EXPORTED_FROM_STITCH/${ht.name}`, htmlText, 'utf8');
      console.log(`-> Đã lưu: ${ht.name} (${htmlText.length} ký tự)`);
    }
  }

  // 2. Chụp ảnh giao diện thực tế 02_CURRENT_PWA_SCREENSHOTS
  console.log('\n--- 2. CHỤP ẢNH GIAO DIỆN THỰC TẾ 02_CURRENT_PWA_SCREENSHOTS ---');
  await captureAllPwaScreenshots();

  // 3. Sao chép 03_DESIGN_DOCUMENTS
  console.log('\n--- 3. SAO CHÉP TÀI LIỆU THIẾT KẾ 03_DESIGN_DOCUMENTS ---');
  const designDocs = [
    { src: 'ProjectContext/06_Kien_truc_va_kiem_thu/SONCANG_MCP_CONNECTION_REPORT.md', dest: `${baseDir}/03_DESIGN_DOCUMENTS/SONCANG_MCP_CONNECTION_REPORT.md` },
    { src: 'ProjectContext/06_Kien_truc_va_kiem_thu/SONCANG_UI_AUDIT.md', dest: `${baseDir}/03_DESIGN_DOCUMENTS/SONCANG_UI_AUDIT.md` },
    { src: 'ProjectContext/06_Kien_truc_va_kiem_thu/SONCANG_UI_REDESIGN_PLAN.md', dest: `${baseDir}/03_DESIGN_DOCUMENTS/SONCANG_UI_REDESIGN_PLAN.md` },
    { src: 'scripts/DESIGN.md', dest: `${baseDir}/03_DESIGN_DOCUMENTS/DESIGN.md` },
    { src: 'scripts/tlqm-design-tokens.css', dest: `${baseDir}/03_DESIGN_DOCUMENTS/tlqm-design-tokens.css` },
    { src: 'scripts/STITCH_DESIGN_CONTEXT.md', dest: `${baseDir}/03_DESIGN_DOCUMENTS/STITCH_DESIGN_CONTEXT.md` },
  ];

  for (const doc of designDocs) {
    if (fs.existsSync(doc.src)) {
      fs.copyFileSync(doc.src, doc.dest);
      console.log(`Đã sao chép tài liệu: ${doc.dest}`);
    } else {
      console.warn(`Không tìm thấy file tài liệu: ${doc.src}`);
    }
  }

  // 4. Sao chép 04_FRONTEND_UI_SOURCE
  console.log('\n--- 4. SAO CHÉP MÃ NGUỒN GIAO DIỆN 04_FRONTEND_UI_SOURCE ---');
  // Copy app pages
  copyFolderRecursiveSync('src/app', `${baseDir}/04_FRONTEND_UI_SOURCE/app`);
  // Copy components
  copyFolderRecursiveSync('src/components', `${baseDir}/04_FRONTEND_UI_SOURCE/components`);
  // Copy types
  copyFolderRecursiveSync('src/types', `${baseDir}/04_FRONTEND_UI_SOURCE/types`);
  // Copy styles and config
  if (fs.existsSync('src/app/globals.css')) {
    fs.copyFileSync('src/app/globals.css', `${baseDir}/04_FRONTEND_UI_SOURCE/styles_and_config/globals.css`);
  }
  if (fs.existsSync('tailwind.config.ts')) {
    fs.copyFileSync('tailwind.config.ts', `${baseDir}/04_FRONTEND_UI_SOURCE/styles_and_config/tailwind.config.ts`);
  }
  if (fs.existsSync('postcss.config.mjs')) {
    fs.copyFileSync('postcss.config.mjs', `${baseDir}/04_FRONTEND_UI_SOURCE/styles_and_config/postcss.config.mjs`);
  }
  console.log('-> Đã hoàn thành sao chép mã nguồn Frontend nghiệp vụ.');

  console.log('\n=== HOÀN TẤT BƯỚC THU THẬP TÀI NGUYÊN ===');
}

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(source)) return;
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });

  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

async function captureAllPwaScreenshots() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tmpDir = fs.mkdtempSync(path.join('D:\\thanhnx\\OpenCode\\YMS-project', '.tmp_chrome_'));
  const port = 9224;

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const data = await res.json();
      wsUrl = data.webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('Không thể kết nối Chrome DevTools port');
    chromeProc.kill();
    return;
  }

  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

  let idCounter = 1;
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = idCounter++;
      const handler = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

  function sendSession(method, params = {}) {
    return new Promise((resolve) => {
      const id = idCounter++;
      const handler = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, sessionId, method, params }));
    });
  }

  await sendSession('Page.enable');

  // Khởi tạo localStorage cho chế độ DEMO với vai trò SYS_ADMIN để có quyền xem đủ tất cả các trang
  await sendSession('Page.navigate', { url: 'http://localhost:3000' });
  await new Promise(r => setTimeout(r, 1000));
  await sendSession('Runtime.evaluate', {
    expression: `
      localStorage.setItem('soncang_v5_auth_mode', 'DEMO');
      localStorage.setItem('soncang_v5_demo_role', 'SYS_ADMIN');
    `
  });

  const screensToCapture = [
    { route: '/dashboard', name: '01_dashboard' },
    { route: '/entry', name: '02_entry' },
    { route: '/yard', name: '03_yard' },
    { route: '/reefer', name: '04_reefer' },
    { route: '/billing', name: '05_billing' },
    { route: '/exit', name: '06_exit' },
    { route: '/login', name: '07_login' },
  ];

  // 1. Chụp Desktop 1440
  console.log('Chụp ảnh màn hình Desktop 1440x900...');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  for (const s of screensToCapture) {
    const url = `http://localhost:3000${s.route}`;
    console.log(`  -> Desktop: ${s.name} (${url})`);
    await sendSession('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 1500));
    const { data } = await sendSession('Page.captureScreenshot', { format: 'png' });
    const filename = `${baseDir}/02_CURRENT_PWA_SCREENSHOTS/desktop_1440/${s.name}_desktop_1440.png`;
    fs.writeFileSync(filename, Buffer.from(data, 'base64'));
    console.log(`     Đã lưu: ${filename} (${data.length} bytes)`);
  }

  // 2. Chụp Mobile 390
  console.log('Chụp ảnh màn hình Mobile 390x844...');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });

  for (const s of screensToCapture) {
    const url = `http://localhost:3000${s.route}`;
    console.log(`  -> Mobile: ${s.name} (${url})`);
    await sendSession('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 1500));
    const { data } = await sendSession('Page.captureScreenshot', { format: 'png' });
    const filename = `${baseDir}/02_CURRENT_PWA_SCREENSHOTS/mobile_390/${s.name}_mobile_390.png`;
    fs.writeFileSync(filename, Buffer.from(data, 'base64'));
    console.log(`     Đã lưu: ${filename} (${data.length} bytes)`);
  }

  ws.close();
  chromeProc.kill();
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {}
  console.log('-> Đã hoàn thành chụp toàn bộ 14 ảnh màn hình PWA thực tế!');
}

main().catch(console.error);
