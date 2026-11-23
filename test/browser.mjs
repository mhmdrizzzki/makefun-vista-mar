// Use only the host-provided browser tools; all temporary profiles live inside this repository.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const ARTIFACT_DIRECTORY = resolve('test/artifacts');
export const GAME_URL = process.env.GAME_URL || 'http://localhost:8099/';
export const PLAYWRIGHT_MODULE = '/home/ubuntu/.agents/skills/superagent-v10/.venv/lib64/python3.12/site-packages/playwright/driver/package/index.mjs';
export const CHROMIUM_EXECUTABLE = '/home/ubuntu/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';

export async function launchBrowser() {
  mkdirSync(ARTIFACT_DIRECTORY, { recursive: true });
  process.env.TMPDIR = ARTIFACT_DIRECTORY;
  const { chromium } = await import(PLAYWRIGHT_MODULE);
  return chromium.launch({ executablePath: CHROMIUM_EXECUTABLE, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking'] });
}
export function watchPage(page) {
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith(GAME_URL)) external.push(request.url());
  });
  return { errors, external };
}
export async function assertCanvas(page) {
  const pixels = await page.evaluate(() => {
    const canvas = document.getElementById('game');
    const context = canvas.getContext('2d');
    const image = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set(); let luminance = 0;
    for (let offset = 0; offset < image.length; offset += 400) {
      colors.add(`${image[offset] >> 3},${image[offset + 1] >> 3},${image[offset + 2] >> 3}`);
      luminance += image[offset] + image[offset + 1] + image[offset + 2];
    }
    return { colors: colors.size, luminance, width: canvas.width, height: canvas.height };
  });
  if (pixels.colors < 100 || pixels.luminance < 100000) throw new Error(`Blank or unconvincing canvas: ${JSON.stringify(pixels)}`);
  return pixels;
}
