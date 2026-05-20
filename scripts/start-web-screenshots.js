const { spawn } = require('node:child_process');

const isWindows = process.platform === 'win32';
const command = isWindows ? 'npx.cmd expo start --web' : 'npx';
const args = isWindows ? [] : ['expo', 'start', '--web'];
const child = spawn(command, args, {
  env: {
    ...process.env,
    EXPO_PUBLIC_ENABLE_WEB_SCREENSHOT_MODE: 'true',
  },
  shell: isWindows,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
