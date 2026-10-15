import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as ssr from '@supabase/ssr';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9230;
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-ds02-pilot-v2-'));

const SUPABASE_URL = 'https://euswzyespwaxyrjkfkrq.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3d6eWVzcHdheHlyamtma3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MTIyNDUsImV4cCI6MjEwNzI4ODI0NX0.FrCSV3i7b4wGIhbJaNmmCnm5Hp84SZrg_9KdId45BnQ';

const outDir = path.resolve('SONCANG_DS02_PILOT_SCREENSHOTS');
fs.mkdirSync(outDir, { recursive: true });

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('====================================================');
  console.log(' SƠN CẢNG YMS — CAPTURE PILOT SCREENS (DS-02)       ');
  console.log('====================================================\n');

  console.log('1. Signing in with Supabase JS SDK (Super Admin)...');
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data: authData, error: authError } = await sb.auth.signInWithPassword({
    email: 'it@talunglogistics.com',
    password: 'SonCang@2026!IT',
  });

  if (authError || !authData?.session) {
    throw new Error('Supabase sign in failed: ' + (authError?.message || 'No session'));
  }
  console.log('   Authenticated as:', authData.user.email);
  const session = authData.session;
  const sessionStr = JSON.stringify(session);
  const b64Val = 'base64-' + ssr.stringToBase64URL(sessionStr);
  const cookieChunks = ssr.createChunks('sb-euswzyespwaxyrjkfkrq-auth-token', b64Val);

  console.log('2. Spawning headless Chrome on port', PORT);
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

  await sendSession('Network.enable');
  await sendSession('Page.enable');

  console.log('3. Injecting Supabase Auth session cookies into browser context...');
  for (const chunk of cookieChunks) {
    await sendSession('Network.setCookie', {
      name: chunk.name,
      value: chunk.value,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    });
  }

  async function setViewport(w, h, isMobile) {
    await sendSession('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor: 1,
      mobile: isMobile,
      hasTouch: isMobile,
    });
  }

  async function takeScreenshot(fileName) {
    const shot = await sendSession('Page.captureScreenshot', { format: 'png' });
    const fullPath = path.join(outDir, fileName);
    fs.writeFileSync(fullPath, Buffer.from(shot.data, 'base64'));
    console.log(`   [CAPTURED] -> ${fileName} (${fs.statSync(fullPath).size} bytes)`);
  }

  async function fillIntakeForm() {
    await sendSession('Runtime.evaluate', {
      expression: `
        (() => {
          function setInputValue(input, val) {
            if (!input) return;
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            if (setter) {
              setter.call(input, val);
            } else {
              input.value = val;
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // License Plate
          const plateInput = document.querySelector('input[placeholder*="11C"], input[placeholder*="29H"]');
          setInputValue(plateInput, '11C-888.88');

          // Container No (ISO 6346 valid)
          const contInput = document.querySelector('input[placeholder*="MSKU"], input[placeholder*="BMOU"]');
          setInputValue(contInput, 'TCLU1234567');

          // Driver Name
          const driverInput = document.querySelector('input[placeholder*="Nguyễn Văn A"]');
          setInputValue(driverInput, 'Nguyễn Văn Lái');

          // Driver Phone
          const phoneInput = document.querySelector('input[placeholder*="0912"]');
          setInputValue(phoneInput, '0988776655');

          // Driver ID Card
          const idCardInput = document.querySelector('input[placeholder*="0012"]');
          setInputValue(idCardInput, '001201008888');

          return { filled: true };
        })()
      `,
      returnByValue: true
    });
  }

  // =========================================================================
  // SCREEN 1: DASHBOARD WORKSPACE OVERVIEW
  // =========================================================================
  console.log('\n--- Capturing Screen 1: Dashboard Workspace Overview ---');

  // Desktop 1440
  await setViewport(1440, 900, false);
  await sendSession('Page.navigate', { url: 'http://localhost:3005/dashboard' });
  await sleep(2500);
  await takeScreenshot('01_dashboard_desktop_1440.png');

  // Desktop 1440 with Right Context Inspector open
  console.log('   Clicking first vehicle to open Right Context Inspector...');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const queueItem = document.querySelector('button[type="button"].w-full.text-left');
        if (queueItem) {
          queueItem.click();
          return { clicked: 'queueItem' };
        }
        const row = document.querySelector('tbody tr');
        if (row) {
          row.click();
          return { clicked: 'tableRow' };
        }
        return { clicked: 'none' };
      })()
    `,
    returnByValue: true
  });
  await sleep(1000);
  await takeScreenshot('01_dashboard_with_inspector_desktop_1440.png');

  // Tablet 1024 (clean navigation)
  await setViewport(1024, 768, false);
  await sendSession('Page.navigate', { url: 'http://localhost:3005/dashboard' });
  await sleep(2000);
  await takeScreenshot('01_dashboard_tablet_1024.png');

  // Mobile 390
  await setViewport(390, 844, true);
  await sendSession('Page.navigate', { url: 'http://localhost:3005/dashboard' });
  await sleep(2000);
  await takeScreenshot('01_dashboard_mobile_390.png');

  // =========================================================================
  // SCREEN 2: GATE INTAKE (TIẾP NHẬN XE VÀO CỔNG)
  // =========================================================================
  console.log('\n--- Capturing Screen 2: Gate Security Intake (/entry) ---');

  // Desktop 1440
  await setViewport(1440, 900, false);
  await sendSession('Page.navigate', { url: 'http://localhost:3005/entry' });
  await sleep(2500);
  await fillIntakeForm();
  await sleep(1000);
  await takeScreenshot('02_entry_gate_desktop_1440.png');

  // Tablet 1024
  await setViewport(1024, 768, false);
  await sendSession('Page.navigate', { url: 'http://localhost:3005/entry' });
  await sleep(2000);
  await fillIntakeForm();
  await sleep(1000);
  await takeScreenshot('02_entry_gate_tablet_1024.png');

  // Mobile 390
  await setViewport(390, 844, true);
  await sendSession('Page.navigate', { url: 'http://localhost:3005/entry' });
  await sleep(2000);
  await fillIntakeForm();
  await sleep(1000);
  await takeScreenshot('02_entry_gate_mobile_390.png');

  console.log('\n====================================================');
  console.log(' ALL PILOT SCREENSHOTS CAPTURED SUCCESSFULLY!       ');
  console.log(' Output directory:', outDir);
  console.log('====================================================');

  ws.close();
  chromeProc.kill();
}

main().catch(err => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
