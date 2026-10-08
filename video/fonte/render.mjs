import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs';
const TL = JSON.parse(fs.readFileSync('timeline.json'));
const mode = process.argv[2] || 'stills';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', m => console.log('console:', m.text()));
page.on('pageerror', e => console.log('ERR', e.message));
await page.addInitScript(`window.TL=${JSON.stringify(TL)}`);
await page.goto('file://' + process.cwd() + '/index.html');
await page.evaluate(() => window.__ready);
if (mode === 'stills') {
  const ts = process.argv.slice(3).map(Number);
  for (const t of ts) { await page.evaluate(t => render(t), t); await page.screenshot({ path: `still_${t}.jpg`, quality: 80, type: 'jpeg' }); }
} else {
  const fps = 30, total = TL[TL.length - 1].end, n = Math.ceil(total * fps);
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', 'video_noaudio.mp4'], { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let f = 0; f < n; f++) {
    await page.evaluate(t => render(t), f / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log('frame', f, '/', n);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await browser.close();
