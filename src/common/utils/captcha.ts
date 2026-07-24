import { execFile, execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { promisify } from 'util';
import log from '@src/utils/logger';

const execFileAsync = promisify(execFile);

type PythonCommand = {
  command: string;
  args: string[];
};

const BUNDLED_DDDDOCR_SCRIPT = 'python/ddddocr-demo/recognize.py';
const LEGACY_DDDDOCR_SCRIPT = '/Users/hitol/work/code/indo/ddddocr-demo/recognize.py';

function canRun(command: string, args: string[] = []): boolean {
  try {
    execFileSync(command, [...args, '--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function findPython(script: string): PythonCommand {
  if (process.env.DDDDOCR_PYTHON) {
    const [command, ...args] = process.env.DDDDOCR_PYTHON.split(' ').filter(Boolean);
    if (command && canRun(command, args)) {
      return { command, args };
    }
  }

  const scriptDir = dirname(script);
  const venvCandidates: PythonCommand[] = process.platform === 'win32'
    ? [{ command: join(scriptDir, '.venv', 'Scripts', 'python.exe'), args: [] }]
    : [{ command: join(scriptDir, '.venv', 'bin', 'python'), args: [] }];

  const candidates: PythonCommand[] = process.platform === 'win32'
    ? [
      { command: 'python', args: [] },
      { command: 'python3', args: [] },
      { command: 'py', args: ['-3'] },
    ]
    : [
      { command: 'python3', args: [] },
      { command: 'python', args: [] },
      { command: '/opt/homebrew/bin/python3', args: [] },
      { command: '/usr/local/bin/python3', args: [] },
      { command: '/usr/bin/python3', args: [] },
    ];

  const python = [...venvCandidates, ...candidates].find(({ command, args }) => canRun(command, args));
  if (!python) {
    throw new Error('Python not found. Install Python 3 or set DDDDOCR_PYTHON.');
  }
  return python;
}

function findScript(): string {
  const possiblePaths = [
    // 项目内置 demo: npm run dev / npm start 从项目根目录运行
    join(process.cwd(), BUNDLED_DDDDOCR_SCRIPT),
    // 打包后从 dist/main.js 运行
    join(__dirname, '..', BUNDLED_DDDDOCR_SCRIPT),
    // 兼容旧的外部 demo 路径
    LEGACY_DDDDOCR_SCRIPT,
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
  if (!existsSync(imagePath)) {
    throw new Error(`captcha image not found: ${imagePath}`);
  }

  const script = findScript();
  const python = findPython(script);
  const timeout = Number(process.env.DDDDOCR_TIMEOUT_MS || 30000);

  try {
    const { stdout } = await execFileAsync(
      python.command,
      [...python.args, script, imagePath],
      {
        cwd: dirname(script),
        timeout,
        windowsHide: true,
      },
    );
    const result = stdout.trim();
    log.info(`[Captcha] Python recognition result: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    const commandError = error as Error & {
      code?: string | number;
      killed?: boolean;
      signal?: string;
      stderr?: string | Buffer;
    };
    const details = [commandError.message || String(error)];
    if (commandError.code !== undefined) details.push(`exit code: ${commandError.code}`);
    if (commandError.killed) details.push(`process killed (timeout: ${timeout}ms)`);
    if (commandError.signal) details.push(`signal: ${commandError.signal}`);

    const stderr = typeof commandError.stderr === 'string'
      ? commandError.stderr.trim()
      : commandError.stderr?.toString().trim();
    if (stderr && !commandError.message.includes(stderr)) details.push(`stderr: ${stderr}`);

    throw new Error(`captcha recognition failed: ${details.join('; ')}`);
  }
}
