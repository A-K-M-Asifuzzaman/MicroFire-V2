import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const findings = [];
for (const path of new Set(paths)) {
  if (/(^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith('.env.example')) findings.push(`${path}: environment file`);
  if (!/\.(?:tsx?|m?js|json|ya?ml|md|example)$/.test(path)) continue;
  const content = readFileSync(path, 'utf8');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content) || /(?:sk-proj-|ghp_|github_pat_)[A-Za-z0-9_\-]{20,}/.test(content)) findings.push(`${path}: possible credential`);
  if (/NEXT_PUBLIC_[A-Z_]*(?:KEY|TOKEN|SECRET)\s*=\s*\S+/.test(content)) findings.push(`${path}: public secret assignment`);
  if (path.startsWith('apps/web/') && /process\.env\.(?:MESHY_API_KEY|OPENAI_API_KEY|NASA_API_KEY|NASA_ADS_TOKEN)/.test(content)) findings.push(`${path}: provider access is not permitted in P0`);
}
if (findings.length) { console.error(findings.join('\n')); process.exitCode = 1; }
else console.log(`Basic secret/environment/provider-access checks passed across ${new Set(paths).size} files. Pattern checks are not a complete secret audit.`);
