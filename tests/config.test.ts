import { describe, expect, it } from 'vitest';
import { CORS_WILDCARD_MESSAGE, parseEnv } from '../src/config/env';

const baseEnv = {
  PASS_PERCENTAGE: '33.5',
  ACADEMIC_YEAR: '2026-27',
  JWT_SECRET: 'x'.repeat(32),
  CORS_ORIGINS: 'http://localhost:3000',
};

describe('env config', () => {
  it('rejects CORS wildcard with a dedicated unsafe-allow-all message', () => {
    const result = parseEnv({
      ...process.env,
      ...baseEnv,
      CORS_ORIGINS: '*',
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toBe(CORS_WILDCARD_MESSAGE);
  });
});
