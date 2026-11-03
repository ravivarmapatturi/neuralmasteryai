/**
 * Downloads and unpacks sherpa-onnx streaming English Zipformer WASM assets
 * into public/sherpa-onnx/ if not already present.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEST_DIR = path.resolve(__dirname, '..', 'public', 'sherpa-onnx');
const WASM_FILE = path.join(DEST_DIR, 'sherpa-onnx-wasm-main-vad-asr.wasm');
const DATA_FILE = path.join(DEST_DIR, 'sherpa-onnx-wasm-main-vad-asr.data');

const ARCHIVE_URL =
  'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-wasm-simd-1.13.2-vad-asr-en-zipformer_gigaspeech.tar.bz2';

if (fs.existsSync(WASM_FILE) && fs.existsSync(DATA_FILE)) {
  console.log('sherpa-onnx WASM and data assets already exist in', DEST_DIR);
  process.exit(0);
}

fs.mkdirSync(DEST_DIR, { recursive: true });
console.log('Downloading sherpa-onnx streaming Zipformer English model (~62 MB)...');
const tmpArchive = '/tmp/sherpa-onnx-en.tar.bz2';

try {
  execSync(`curl -L -s -o ${tmpArchive} "${ARCHIVE_URL}"`, { stdio: 'inherit' });
  console.log('Extracting model archive...');
  execSync(`tar -xjf ${tmpArchive} -C ${DEST_DIR} --strip-components=1`, { stdio: 'inherit' });
  console.log('sherpa-onnx assets ready at', DEST_DIR);
} catch (err) {
  console.error('Failed to download or extract sherpa-onnx assets:', err);
  process.exit(1);
}
