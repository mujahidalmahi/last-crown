#!/usr/bin/env node

/**
 * LAST CROWN — Environment and Workspace Verification Script
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const requiredPaths = [
  'packages/shared/package.json',
  'packages/game-config/package.json',
  'packages/game-core/package.json',
  'apps/web/package.json',
  'apps/server/package.json',
  'tsconfig.base.json',
  '.env.example',
];

console.info('[LAST CROWN] Verifying repository scaffold...');

let missing = 0;
for (const p of requiredPaths) {
  if (!existsSync(resolve(process.cwd(), p))) {
    console.error(`  MISSING: ${p}`);
    missing++;
  } else {
    console.info(`  OK: ${p}`);
  }
}

if (missing > 0) {
  console.error(`[LAST CROWN] Setup verification failed: ${missing} files missing.`);
  process.exit(1);
} else {
  console.info('[LAST CROWN] Setup verification passed successfully!');
}
