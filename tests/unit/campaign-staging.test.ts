import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('keeps staging isolated, protected, unlinked and disabled before independent approval', () => {
  const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
  const project = read('ops/campaign-staging/vercel-project.request.json');
  expect(project.name).toBe('microfire-v2-campaign-security-staging');
  expect(project.ssoProtection).toEqual({ deploymentType: 'all' });
  expect(project.publicSource).toBe(false); expect(project.gitRepository).toBeUndefined();
  expect(project.environmentVariables).toBeUndefined();
  const env = read('ops/campaign-staging/environment-names.json');
  expect(Object.values(env.disabledDefaults)).toEqual(['0', '0', '0']);
  expect(env.sensitiveNames.every((n: string) => !n.startsWith('NEXT_PUBLIC_'))).toBe(true);
  for (const file of ['vercel.json', 'apps/web/vercel.json']) expect(read(file).git.deploymentEnabled).toEqual({
    'codex/review-campaign-security-20261113': false, 'codex/campaign-security-remediation-20261113': false,
    'claude/public-campaign-integration-20261113': false,
  });
});
