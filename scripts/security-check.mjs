import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter((p) => p && existsSync(p));
const findings = [];
const CREDENTIALS = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, /(?:sk-proj-|sk-ant-|ghp_|gho_|github_pat_|xox[abprs]-)[A-Za-z0-9_-]{20,}/,
  /AKIA[0-9A-Z]{16}/, /AIza[0-9A-Za-z_-]{35}/, /\b(?:api[_-]?key|secret|token|password)\b["']?\s*[:=]\s*["'][A-Za-z0-9_\-+/=]{24,}["']/i
];
const PROVIDER_ENV = /process\.env\.(?:MESHY_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|NASA_API_KEY|NASA_ADS_TOKEN|SEMANTIC_SCHOLAR_API_KEY)/;
const MEDIA = /\.(?:png|jpe?g|gif|webp|avif|svg|glb|gltf|bin|ktx2|mp4|webm|mov|mp3|wav|ogg|pdf)$/i;
const rightsFile = 'data/asset-rights.json';
const rights = existsSync(rightsFile) ? JSON.parse(readFileSync(rightsFile, 'utf8')) : { assets: [] };
for (const path of new Set(paths)) {
  if (/(^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith('.env.example')) findings.push(`${path}: environment file`);
  // Served media needs a reviewed rights entry; reference images under docs/ are documentation only.
  if (path.startsWith('apps/web/public/') && MEDIA.test(path)) {
    const entry = rights.assets.find((a) => a.path === path);
    if (!entry || !entry.license || !entry.source || entry.approved !== true) findings.push(`${path}: served media without an approved rights entry in ${rightsFile}`);
  }
  if (!/\.(?:tsx?|m?js|json|ya?ml|md|example)$/.test(path)) continue;
  const content = readFileSync(path, 'utf8');
  if (CREDENTIALS.some((pattern) => pattern.test(content))) findings.push(`${path}: possible credential`);
  if (/NEXT_PUBLIC_[A-Z_]*(?:KEY|TOKEN|SECRET)\s*=\s*\S+/.test(content)) findings.push(`${path}: public secret assignment`);
  if (/^(?:apps\/web|packages)\//.test(path) && PROVIDER_ENV.test(content)) findings.push(`${path}: provider credential access is not approved in Phase One`);
  if (/^['"]use client['"]/m.test(content) && /process\.env\.(?!NODE_ENV\b)/.test(content)) findings.push(`${path}: client component reads server environment`);
  if (path.startsWith('apps/web/') && /dangerouslySetInnerHTML/.test(content)) findings.push(`${path}: raw HTML injection`);
}
if (findings.length) { console.error(findings.join('\n')); process.exitCode = 1; }
else console.log(`Basic secret/environment/provider/XSS/media-rights checks passed across ${new Set(paths).size} files. Pattern checks are not a complete secret audit.`);
