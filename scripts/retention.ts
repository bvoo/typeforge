import { existsSync } from 'fs';
import { config as loadEnv } from 'dotenv';

loadEnv();
if (existsSync('.env.local')) {
  loadEnv({ path: '.env.local', override: true });
}

function parseArg(key: string, def?: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${key}=`));
  if (!arg) return def;
  return arg.slice(key.length + 3);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('CRON_SECRET is not set. Set it in .env.local or pass as env var.');
    process.exit(1);
  }

  const baseUrl = parseArg('url', process.env.RETENTION_JOB_URL || 'http://localhost:3000/api/jobs/retention')!;
  const limitStr = parseArg('limit', '500')!;
  const limit = Number(limitStr) || 500;
  const intervalMs = Number(parseArg('interval-ms', '900000')) || 900000; // default 15m
  const loop = hasFlag('loop');

  async function runOnce() {
    const url = new URL(baseUrl);
    if (!url.searchParams.has('limit')) url.searchParams.set('limit', String(limit));

    const res: Response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    });

    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text } as unknown;
    }

    if (!res.ok) {
      console.error('Retention job failed', res.status, data);
      throw new Error(`retention_failed_${res.status}`);
    }

    console.log('Retention job ok:', data);
  }

  if (!loop) {
    await runOnce();
    return;
  }

  console.log(`Starting retention loop every ${intervalMs}ms...`);
  while (true) {
    try {
      await runOnce();
    } catch (e) {
      console.error('Retention loop iteration error', e);
    }
    await sleep(intervalMs);
  }
}

main().catch((e: unknown) => {
  console.error('Retention job error', e);
  process.exit(1);
});
