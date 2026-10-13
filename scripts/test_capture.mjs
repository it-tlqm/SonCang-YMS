import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

async function testCapture() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-ss-'));
  const port = 9223;

  console.log('Spawning Chrome headless on port', port);
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ], { stdio: 'ignore' });

  // Wait for DevTools port
  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const data = await res.json();
      wsUrl = data.webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch (e) {
      // retry
    }
  }

  if (!wsUrl) {
    console.error('Failed to connect to Chrome DevTools port');
    chromeProc.kill();
    return;
  }
  console.log('Connected to Chrome DevTools:', wsUrl);

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

  // Create page target
  const { targetId } = await send('Target.createTarget', { url: 'http://localhost:3000/dashboard' });
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
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('Navigating to http://localhost:3000/dashboard');
  await sendSession('Page.navigate', { url: 'http://localhost:3000/dashboard' });
  await new Promise(r => setTimeout(r, 2000)); // wait for render and demo data

  console.log('Capturing screenshot...');
  const { data } = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync('test_screenshots', { recursive: true });
  fs.writeFileSync('test_screenshots/dashboard_desktop_1440.png', Buffer.from(data, 'base64'));
  console.log('Screenshot saved to test_screenshots/dashboard_desktop_1440.png, size:', data.length);

  ws.close();
  chromeProc.kill();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

testCapture().catch(console.error);
