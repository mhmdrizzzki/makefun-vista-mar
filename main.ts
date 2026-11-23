// Vista Mar: Low Tide — original static game and witnessed renders, packaged without a build step.
// The dossier is deliberately produced by the unchanged competition library.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const gameDirectory = join(here, 'game');
const shotDirectory = join(here, 'screenshots');
const requiredFiles = ['index.html', 'style.css', 'src/main.js', 'src/config.js'];

for (const file of requiredFiles) {
  if (!existsSync(join(gameDirectory, file))) throw new Error(`Missing original game file: ${file}`);
}
if (out === resolve(here) || out.startsWith(resolve(gameDirectory) + '/')) {
  throw new Error('Choose an output directory outside the source game.');
}
const images = readdirSync(shotDirectory).filter(name => /\.(jpg|jpeg|png)$/i.test(name)).sort();
if (images.length < 3 || images.length > 4) throw new Error('Capture three or four real game screenshots first.');
for (const image of images) {
  const bytes = statSync(join(shotDirectory, image)).size;
  if (bytes > 262144 || bytes < 30000) throw new Error(`Screenshot ${image} is outside the capture byte budget (${bytes}).`);
}

mkdirSync(out, { recursive: true });
cpSync(gameDirectory, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotDirectory, join(out, 'screenshots'), { recursive: true });
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`Vista Mar: Low Tide → ${out}`);
console.log(`${images.length} witnessed screenshots · ${Buffer.byteLength(dossier)} dossier bytes · no game build required.`);
