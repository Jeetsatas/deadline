import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('local bridge HTTP security boundary', () => {
  let child;
  let home;
  let port;
  let startupOutput = '';
  let token;

  const request = (path, headers = {}, method = 'GET', body = '') => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method, headers }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end(body);
  });

  beforeAll(async () => {
    home = mkdtempSync(join(tmpdir(), 'deadline-bridge-test-'));
    port = await new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.once('error', reject);
      probe.listen(0, '127.0.0.1', () => {
        const address = probe.address();
        probe.close(() => resolve(address.port));
      });
    });
    child = spawn(process.execPath, ['bridge/server.mjs'], {
      cwd: process.cwd(),
      env: { ...process.env, HOME: home, DEADLINE_BRIDGE_PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk) => { startupOutput += chunk.toString(); });
    child.stderr.on('data', (chunk) => { startupOutput += chunk.toString(); });

    let healthy = false;
    for (let attempt = 0; attempt < 80 && !healthy; attempt++) {
      try {
        healthy = (await request('/health', { Host: `127.0.0.1:${port}` })) === 200;
      } catch {
        await delay(50);
      }
    }
    if (!healthy) throw new Error('Local bridge did not start for security tests.');
    token = JSON.parse(readFileSync(join(home, '.deadline', 'bridge-auth.json'), 'utf8')).token;
  }, 10000);

  afterAll(async () => {
    if (child && child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise((resolve) => child.once('exit', resolve));
    }
    if (home) rmSync(home, { recursive: true, force: true });
  });

  it('rejects unsafe hosts and origins, requires auth, rate limits pairing, and keeps startup output secret-free', async () => {
    const allowed = { Host: `127.0.0.1:${port}`, Origin: 'http://localhost:5173', 'Content-Type': 'application/json' };
    expect(startupOutput).not.toContain(token);
    expect(await request('/providers/detect', { ...allowed, Host: `example.com:${port}` })).toBe(403);
    expect(await request('/providers/detect', { Host: `127.0.0.1:${port}` })).toBe(403);
    expect(await request('/providers/detect', { ...allowed, Origin: 'http://attacker.example' })).toBe(403);
    expect(await request('/providers/detect', allowed)).toBe(401);
    expect(await request('/auth/pair', { ...allowed, Authorization: `Bearer ${token}` }, 'POST', '{}')).toBe(200);

    for (let attempt = 0; attempt < 5; attempt++) {
      await request('/auth/pair', { ...allowed, Authorization: 'Bearer invalid' }, 'POST', '{}');
    }
    expect(await request('/auth/pair', { ...allowed, Authorization: 'Bearer invalid' }, 'POST', '{}')).toBe(429);
  }, 10000);
});
