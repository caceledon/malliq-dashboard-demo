import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILES = ['.env.local', '.env'];

if (process.env.MALLIQ_SKIP_ENV_FILE === '1') {
  // Tests and controlled environments can opt out of file-based env loading.
} else {
  ENV_FILES.forEach((filename) => {
    loadEnvFile(path.join(ROOT_DIR, filename));
  });
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/g).forEach((line) => {
    const parsed = parseEnvLine(line);
    if (!parsed || parsed.key in process.env) {
      return;
    }

    process.env[parsed.key] = parsed.value;
  });
}
