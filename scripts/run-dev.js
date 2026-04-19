/**
 * Запуск API + Vite с корректным PATH к .NET SDK.
 * Без concurrently (на части окружений нет cmd.exe — concurrently на Windows шлёт команды через него).
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..');

function prependDotnetBinToPath(env) {
  const extra =
    process.platform === 'win32'
      ? [path.join(process.env.ProgramFiles || 'C:\\Program Files', 'dotnet')]
      : process.platform === 'darwin'
        ? ['/usr/local/share/dotnet', '/opt/homebrew/share/dotnet']
        : ['/usr/share/dotnet'];

  for (const dir of extra) {
    const exe = process.platform === 'win32' ? path.join(dir, 'dotnet.exe') : path.join(dir, 'dotnet');
    try {
      if (fs.existsSync(exe)) {
        const sep = process.platform === 'win32' ? ';' : ':';
        env.PATH = `${dir}${sep}${env.PATH}`;
        return;
      }
    } catch {
      /* ignore */
    }
  }
}

function resolveDotnetExe() {
  if (process.platform !== 'win32') return 'dotnet';
  const pf = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'dotnet', 'dotnet.exe');
  return fs.existsSync(pf) ? pf : 'dotnet';
}

function main() {
  process.chdir(root);
  const env = { ...process.env };
  prependDotnetBinToPath(env);

  const dotnetExe = resolveDotnetExe();
  const proj = path.join('backend', 'Marketplace.Api', 'Marketplace.Api.csproj');

  const api = spawn(dotnetExe, ['run', '--project', proj], {
    cwd: root,
    env,
    stdio: 'inherit',
  });

  const viteJs = path.join(root, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteJs)) {
    console.error('Не найден frontend/node_modules/vite. Выполните: cd frontend && npm install');
    process.exit(1);
  }

  const front = spawn(process.execPath, [viteJs], {
    cwd: path.join(root, 'frontend'),
    env,
    stdio: 'inherit',
  });

  let stopping = false;
  function shutdown(code) {
    if (stopping) return;
    stopping = true;
    try {
      api.kill();
    } catch {
      /* ignore */
    }
    try {
      front.kill();
    } catch {
      /* ignore */
    }
    process.exit(code ?? 0);
  }

  api.on('exit', (code) => {
    if (!stopping) shutdown(code ?? 0);
  });
  front.on('exit', (code) => {
    if (!stopping) shutdown(code ?? 0);
  });
  api.on('error', (e) => {
    console.error('[API]', e.message);
    shutdown(1);
  });
  front.on('error', (e) => {
    console.error('[FRONT]', e.message);
    shutdown(1);
  });

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
}

main();
