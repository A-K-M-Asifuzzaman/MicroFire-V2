// Test helper (not a spec): a throwaway production server for one serial group of real-HTTP UI tests.
// Each process has its own fresh 30-POST/minute window; the production limiter itself is not changed or bypassed.
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';

export type DisposableServer = { url: string; stop(): Promise<void> };
const reachable = (url: string) => fetch(`${url}/api/health`).then((r) => r.ok, () => false);

export async function startDisposableServer(port: number): Promise<DisposableServer> {
  const url = `http://127.0.0.1:${port}`;
  if (await reachable(url)) throw new Error(`Port ${port} is already serving; refusing to reuse another process's rate-limit window.`);
  const next = path.resolve('node_modules/next/dist/bin/next');
  const child: ChildProcess = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', String(port)],
    { cwd: path.resolve('apps/web'), stdio: 'ignore', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
  for (let i = 0; i < 150 && !(await reachable(url)); i++) await new Promise((r) => setTimeout(r, 200));
  if (!(await reachable(url))) { child.kill(); throw new Error(`Disposable server on ${port} did not start`); }
  return {
    url,
    stop: () => new Promise<void>((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', () => resolve());
      child.kill('SIGTERM');
    })
  };
}
