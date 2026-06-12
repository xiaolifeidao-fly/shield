import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function findPython(): string {
  if (process.platform === 'win32') {
    for (const name of ['python', 'python3', 'py']) {
      try { require('child_process').execSync(`${name} --version`, { stdio: 'ignore' }); return name; } catch {}
    }
    throw new Error('Python not found on Windows');
  }
  // macOS / Linux / Docker
  const candidates = [
    'python3',
    'python',
    '/usr/bin/python3',
    '/usr/local/bin/python3',
    '/opt/homebrew/bin/python3',
  ];
  for (const p of candidates) {
    try { require('child_process').execSync(`${p} --version`, { stdio: 'ignore' }); return p; } catch {}
  }
  throw new Error('Python not found');
}

function findScript(): string {
  const possiblePaths = [
    // 开发环境：项目根目录下的 ddddocr-demo
    join(process.cwd(), '..', '..', 'ddddocr-demo', 'recognize.py'),
    // 同级目录
    join(process.cwd(), '..', 'ddddocr-demo', 'recognize.py'),
    // 环境变量
    process.env.DDDDOCR_SCRIPT || '',
  ];
  // 支持用户自定义路径
  if (process.env.DDDDOCR_SCRIPT && existsSync(process.env.DDDDOCR_SCRIPT)) {
    return process.env.DDDDOCR_SCRIPT;
  }
  for (const p of possiblePaths) {
    if (p && existsSync(p)) return p;
  }
  throw new Error('recognize.py not found, set DDDDOCR_SCRIPT env var');
}

export async function recognizeCaptcha(imagePath: string): Promise<string> {
  const python = findPython();
  const script = findScript();
  const { stdout } = await execFileAsync(python, [script, imagePath]);
  return stdout.trim();
}
