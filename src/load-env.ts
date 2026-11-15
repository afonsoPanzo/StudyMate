import { existsSync } from 'node:fs';

// Imported first in main.ts so every module sees the variables from .env.
// Real environment variables (e.g. in production) take precedence.
if (existsSync('.env')) process.loadEnvFile('.env');
