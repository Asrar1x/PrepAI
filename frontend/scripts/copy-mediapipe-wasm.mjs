// Copies MediaPipe's WebAssembly runtime into public/ so the live camera coach runs fully offline.
// Runs after npm install; the files come from node_modules, never from a CDN.
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dest = join(root, 'public', 'mediapipe', 'wasm');
mkdirSync(dest, { recursive: true });
for (const file of readdirSync(src)) {
  if (file.startsWith('vision_wasm_internal') || file.startsWith('vision_wasm_nosimd_internal')) {
    cpSync(join(src, file), join(dest, file));
  }
}
console.log('MediaPipe wasm copied to public/mediapipe/wasm');
