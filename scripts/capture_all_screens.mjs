import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9225;
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-capture-'));

const VIEWPORTS = [
  { name: 'desktop_1440', width: 1440, height: 900, mobile: false },
  { name: 'tablet_1024', width: 1024, height: 768, mobile: false },
  { name: 'mobile_390', width: 390, height: 844, mobile: true },
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('Spawning Chrome on port', PORT);
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${TMP_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const data = await res.json();
      wsUrl = data.webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch {}
  }

  if (!wsUrl) {
    chromeProc.kill();
    throw new Error('Could not connect to Chrome DevTools port');
  }

  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

  let idCounter = 1;
  function send(method, params = {}) {
    return new Promise(resolve => {
      const id = idCounter++;
      const handler = ev => {
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

  // Create browser target
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

  function sendSession(method, params = {}) {
    return new Promise(resolve => {
      const id = idCounter++;
      const handler = ev => {
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
  await sendSession('DOM.enable');

  const pwaOutDir = path.resolve('SONCANG_PWA_REAL_SCREENSHOTS');
  const stitchOutDir = path.resolve('SONCANG_STITCH_REFINED_PREVIEWS');
  const pkgDir = path.resolve('SONCANG_UI_UX_REVIEW_PACKAGE/02_CURRENT_PWA_SCREENSHOTS');
  fs.mkdirSync(pwaOutDir, { recursive: true });
  fs.mkdirSync(stitchOutDir, { recursive: true });
  fs.mkdirSync(pkgDir, { recursive: true });

  // 1. CAPTURE PWA REAL SCREENS
  console.log('\n=== CAPTURING REAL PWA SCREENS ===');
  const pwaScreens = [
    {
      id: '01_login',
      url: 'http://localhost:3000/login',
      role: 'SEC_STAFF',
      title: 'Đăng nhập hệ thống'
    },
    {
      id: '02_dashboard_admin',
      url: 'http://localhost:3000/dashboard',
      role: 'SYS_ADMIN',
      title: 'Tổng quan vận hành bến bãi (Quản trị)'
    },
    {
      id: '03_entry_security',
      url: 'http://localhost:3000/entry',
      role: 'SEC_STAFF',
      title: 'Tiếp nhận xe vào bãi (An ninh)',
      fillSample: true
    },
    {
      id: '04_yard_dispatcher',
      url: 'http://localhost:3000/yard',
      role: 'DIS_STAFF',
      title: 'Quản lý vị trí & Hàng/Rỗng bến bãi (Điều phối)'
    },
    {
      id: '05_reefer_cckb',
      url: 'http://localhost:3000/reefer',
      role: 'PORT_STAFF',
      title: 'Giám sát cắm/rút điện container lạnh (CCKB)'
    },
    {
      id: '06_billing_cckb',
      url: 'http://localhost:3000/billing',
      role: 'PORT_STAFF',
      title: 'Sổ cái thu phí & Biểu phí dịch vụ (CCKB)'
    },
    {
      id: '07_exit_gate_security',
      url: 'http://localhost:3000/exit',
      role: 'SEC_STAFF',
      tab: 'GATE_EXIT',
      title: 'Xác nhận cổng ra & Thu phí lưu bãi (An ninh)'
    },
    {
      id: '08_exit_clearance_cckb',
      url: 'http://localhost:3000/exit',
      role: 'PORT_STAFF',
      tab: 'CLEARANCE',
      title: 'Duyệt điều kiện xuất bãi & Công nợ (CCKB)'
    },
    {
      id: '09_admin_vehicle_types',
      url: 'http://localhost:3000/admin/vehicle-types',
      role: 'SYS_ADMIN',
      title: 'Danh mục phân loại phương tiện (Quản trị)'
    }
  ];

  for (const vp of VIEWPORTS) {
    console.log(`\nSetting viewport: ${vp.name} (${vp.width}x${vp.height})`);
    await sendSession('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile
    });

    for (const screen of pwaScreens) {
      console.log(`Capturing PWA [${vp.name}] ${screen.id} (${screen.role})...`);
      // First go to origin to set localStorage
      await sendSession('Page.navigate', { url: 'http://localhost:3000/login' });
      await sleep(400);

      await sendSession('Runtime.evaluate', {
        expression: `
          localStorage.setItem('soncang_v5_auth_mode', 'DEMO');
          localStorage.setItem('soncang_v5_demo_role', '${screen.role}');
        `
      });

      // Now navigate to target URL
      await sendSession('Page.navigate', { url: screen.url });
      await sleep(1500);

      // If form fill requested
      if (screen.fillSample) {
        await sendSession('Runtime.evaluate', {
          expression: `
            (() => {
              const plateInput = document.querySelector('input[placeholder*="14C-123.45"], input[type="text"]');
              if (plateInput) {
                plateInput.value = '14C-888.88';
                plateInput.dispatchEvent(new Event('input', { bubbles: true }));
                plateInput.dispatchEvent(new Event('change', { bubbles: true }));
              }
              const contInput = document.querySelector('input[placeholder*="MSKU"], input[placeholder*="TCLU"]');
              if (contInput) {
                contInput.value = 'TCLU1234567';
                contInput.dispatchEvent(new Event('input', { bubbles: true }));
                contInput.dispatchEvent(new Event('change', { bubbles: true }));
              }
              const driverInput = document.querySelector('input[placeholder*="Nguyễn Văn A"]');
              if (driverInput) {
                driverInput.value = 'Nguyễn Văn Lái';
                driverInput.dispatchEvent(new Event('input', { bubbles: true }));
              }
              const phoneInput = document.querySelector('input[placeholder*="0912"]');
              if (phoneInput) {
                phoneInput.value = '0912345678';
                phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
              }
              const noteInput = document.querySelector('input[placeholder*="loại hàng"], input[placeholder*="Ghi chú hàng"], textarea');
              if (noteInput) {
                noteInput.value = 'Nông sản xuất khẩu chính ngạch';
                noteInput.dispatchEvent(new Event('input', { bubbles: true }));
              }
            })();
          `
        });
        await sleep(500);
      }

      // If tab selection requested on /exit
      if (screen.tab) {
        await sendSession('Runtime.evaluate', {
          expression: `
            (() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              if ('${screen.tab}' === 'CLEARANCE') {
                const btn = buttons.find(b => b.textContent && b.textContent.includes('CCKB Duyệt xuất bãi'));
                if (btn) btn.click();
              } else if ('${screen.tab}' === 'GATE_EXIT') {
                const btn = buttons.find(b => b.textContent && b.textContent.includes('An ninh Cổng ra'));
                if (btn) btn.click();
              }
            })();
          `
        });
        await sleep(500);
      }

      const { data } = await sendSession('Page.captureScreenshot', { format: 'png' });
      const filename = `${screen.id}_${vp.name}.png`;
      const outPath = path.join(pwaOutDir, filename);
      const pkgPath = path.join(pkgDir, filename);
      fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
      fs.writeFileSync(pkgPath, Buffer.from(data, 'base64'));
      console.log(`Saved: ${filename} (${Math.round(data.length / 1024)} KB)`);
    }
  }

  // 2. CAPTURE STITCH REFINED PREVIEWS FULL RESOLUTION
  console.log('\n=== CAPTURING STITCH REFINED PREVIEWS (FULL RESOLUTION) ===');
  const stitchDir = path.resolve('SONCANG_UI_UX_REVIEW_PACKAGE/01_STITCH_DESIGNS/HTML_EXPORTED_FROM_STITCH');
  const stitchScreens = [
    {
      id: 'stitch_flow_a_gate_in_entry',
      file: '02_gate_in_entry_desktop.html',
      title: 'Luồng A: An ninh Cổng vào'
    },
    {
      id: 'stitch_flow_b_gate_out_exit',
      file: '03_gate_out_exit_payment_desktop.html',
      title: 'Luồng B: An ninh Cổng ra & Thu phí'
    },
    {
      id: 'stitch_flow_c_cckb_dashboard',
      file: '01_dashboard_cckb_desktop.html',
      title: 'Luồng C: CCKB Tổng quan & Duyệt xuất bãi'
    },
    {
      id: 'stitch_flow_d_design_system',
      file: '04_design_system_library.html',
      title: 'Thư viện Design System Sơn Cảng'
    }
  ];

  for (const sc of stitchScreens) {
    const localHtmlPath = 'file:///' + path.join(stitchDir, sc.file).replace(/\\/g, '/');

    for (const vp of VIEWPORTS) {
      // For design system only capture desktop
      if (sc.id === 'stitch_flow_d_design_system' && vp.name !== 'desktop_1440') continue;

      console.log(`Capturing Stitch [${vp.name}] ${sc.id}...`);
      await sendSession('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile
      });

      await sendSession('Page.navigate', { url: localHtmlPath });
      await sleep(1500);

      const { data } = await sendSession('Page.captureScreenshot', { format: 'png' });
      const filename = `${sc.id}_${vp.name}.png`;
      const outPath = path.join(stitchOutDir, filename);
      fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
      console.log(`Saved Stitch preview: ${filename} (${Math.round(data.length / 1024)} KB)`);
    }
  }

  ws.close();
  chromeProc.kill();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  console.log('\nAll captures successfully finished!');
}

run().catch(err => {
  console.error('Fatal error in capture script:', err);
  process.exit(1);
});
