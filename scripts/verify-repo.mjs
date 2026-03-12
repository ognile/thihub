import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const cwd = process.cwd();
const reportDir = path.join(cwd, 'ops', 'reports', 'verify-repo');
const startLogPath = path.join(reportDir, 'next-start.log');
const nextBinPath = path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(startLogPath, '');

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: {
      ...process.env,
      ...extraEnv,
    },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`command failed: ${command} ${args.join(' ')}`);
  }
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => resolve(false));
      server.listen(port, '127.0.0.1', () => {
        server.close(() => resolve(true));
      });
    });

    if (available) {
      return port;
    }
  }

  throw new Error(`no available port found starting at ${startPort}`);
}

async function waitForReady(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // next isn't ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`application did not become ready at ${url}`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');

  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) =>
      setTimeout(() => {
        child.kill('SIGKILL');
        resolve(undefined);
      }, 10_000),
    ),
  ]);
}

let appProcess;

try {
  const requestedPort = process.env.PORT ? Number(process.env.PORT) : null;
  const resolvedPort = requestedPort ?? (await findAvailablePort(3100));
  const baseUrl = `http://127.0.0.1:${resolvedPort}`;

  run('npm', ['run', 'lint']);
  run('npm', ['run', 'build']);

  const logStream = fs.createWriteStream(startLogPath, { flags: 'a' });
  appProcess = spawn(process.execPath, [nextBinPath, 'start', '--port', String(resolvedPort)], {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  appProcess.stdout.pipe(logStream);
  appProcess.stderr.pipe(logStream);

  await waitForReady(baseUrl);

  run('npm', ['run', 'test:regression'], { BASE_URL: baseUrl });
  run('npm', ['run', 'test:perf'], { BASE_URL: baseUrl });
  run('npm', ['run', 'test:admin:geometry'], { BASE_URL: baseUrl });

  if (process.env.VERIFY_ADMIN_VISUAL === '1') {
    run('npm', ['run', 'test:admin:visual'], { BASE_URL: baseUrl });
  }

  run('npm', ['audit', '--omit=dev']);
} finally {
  await stopProcess(appProcess);
}
