import fs from 'fs';

const apiKey = process.env.STITCH_API_KEY || '';
const projectId = process.env.STITCH_PROJECT_ID || '8471320594998118450';

async function listScreens() {
  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'list_screens',
      arguments: { projectId }
    }
  };
  const res = await fetch('https://stitch.googleapis.com/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  const rawText = data.result?.content?.[0]?.text;
  if (!rawText) {
    console.error('No content returned:', data);
    return;
  }
  const parsed = JSON.parse(rawText);
  const screens = parsed.screens || [];
  console.log(`Total screens found: ${screens.length}`);
  const summary = screens.map((s, idx) => ({
    index: idx + 1,
    id: s.name.split('/').pop(),
    title: s.title,
    deviceType: s.deviceType,
    resolution: `${s.width}x${s.height}`,
    screenshotUrl: s.screenshot?.downloadUrl,
    htmlCodeUrl: s.htmlCode?.downloadUrl
  }));

  console.log(JSON.stringify(summary, null, 2));
  fs.writeFileSync('scripts/stitch_screens_manifest.json', JSON.stringify(summary, null, 2), 'utf-8');
}

listScreens().catch(console.error);
