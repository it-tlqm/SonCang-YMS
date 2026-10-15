import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as ssr from '@supabase/ssr';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9228;
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-test-'));

const SUPABASE_URL = 'https://euswzyespwaxyrjkfkrq.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3d6eWVzcHdheHlyamtma3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MTIyNDUsImV4cCI6MjEwNzI4ODI0NX0.FrCSV3i7b4wGIhbJaNmmCnm5Hp84SZrg_9KdId45BnQ';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('1. Signing in with Supabase JS SDK...');
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data: authData, error: authError } = await sb.auth.signInWithPassword({
    email: 'it@talunglogistics.com',
    password: 'SonCang@2026!IT',
  });

  if (authError || !authData?.session) {
    throw new Error('Supabase sign in failed: ' + (authError?.message || 'No session'));
  }
  console.log('Signed in successfully as:', authData.user.email);
  const session = authData.session;
  const sessionStr = JSON.stringify(session);
  const b64Val = 'base64-' + ssr.stringToBase64URL(sessionStr);
  const cookieChunks = ssr.createChunks('sb-euswzyespwaxyrjkfkrq-auth-token', b64Val);

  console.log('2. Spawning Chrome...');
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

  // Set cookies via Network.setCookie
  console.log('3. Setting Supabase Auth cookies...');
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

  // Set window size
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('4. Navigating to http://localhost:3005/dashboard...');
  await sendSession('Page.navigate', { url: 'http://localhost:3005/dashboard' });
  await sleep(3500);

  const evalRes = await sendSession('Runtime.evaluate', {
    expression: '({ href: window.location.href, title: document.title, bodySnippet: document.body.innerText.slice(0, 300) })',
    returnByValue: true
  });
  console.log('Page state after navigation:', evalRes.result.value);

  // Take screenshot
  const shot = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('test_dashboard.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved test_dashboard.png');

  ws.close();
  chromeProc.kill();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
