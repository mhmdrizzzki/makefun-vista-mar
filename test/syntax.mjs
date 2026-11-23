// Vista Mar: Low Tide — syntax checks: parse every handwritten game script and browser test with the Node runtime.
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const SOURCE_DIRECTORIES = ['game', 'test'];
function collectScripts(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'artifacts' ? [] : collectScripts(path);
    return /\.(js|mjs)$/.test(entry.name) ? [path] : [];
  });
}
const scripts = SOURCE_DIRECTORIES.flatMap(directory => collectScripts(resolve(directory))).sort();
for (const script of scripts) {
  const result = spawnSync(process.execPath, ['--check', script], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${script}\n${result.stderr || result.stdout}`);
}
console.log(`Syntax OK: node --check passed for all ${scripts.length} original .js/.mjs files.`);
