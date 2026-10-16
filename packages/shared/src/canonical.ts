/** The same canonical bytes are used for browser intent IDs and server signatures. */
export function canonicalJson(value: unknown): string {
  const active = new Set<object>();
  function encode(v: unknown, depth: number): string {
    if (depth > 64) throw new TypeError('JSON nesting is too deep');
    if (v === null || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'string') {
      if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(v)) throw new TypeError('Lone surrogate');
      return JSON.stringify(v);
    }
    if (typeof v === 'number' && Number.isSafeInteger(v)) return JSON.stringify(v);
    if (typeof v !== 'object' || !v || active.has(v)) throw new TypeError('Unsupported canonical value');
    active.add(v);
    try {
      if (Object.getOwnPropertySymbols(v).length) throw new TypeError('Symbol member');
      if (Array.isArray(v)) {
        if (Object.keys(v).length !== v.length) throw new TypeError('Sparse or extended array');
        return '[' + Array.from({ length: v.length }, (_, i) => {
          const d = Object.getOwnPropertyDescriptor(v, String(i));
          if (!d || !('value' in d)) throw new TypeError('Accessor member');
          return encode(d.value, depth + 1);
        }).join(',') + ']';
      }
      if (Object.getPrototypeOf(v) !== Object.prototype) throw new TypeError('Nonplain object');
      const names = Object.getOwnPropertyNames(v);
      return '{' + names.sort().map(key => {
        const d = Object.getOwnPropertyDescriptor(v, key)!;
        if (!d.enumerable || !('value' in d)) throw new TypeError('Hidden or accessor member');
        return encode(key, depth + 1) + ':' + encode(d.value, depth + 1);
      }).join(',') + '}';
    } finally { active.delete(v); }
  }
  return encode(value, 0);
}

/** JSON.parse accepts duplicate keys; preview requests must reject them before schema validation. */
export function parsePreviewJson(text: string): unknown {
  let i = 0;
  const space = () => { while (/[\x20\t\r\n]/.test(text[i] ?? '\u0000')) i++; };
  function string(): string {
    const start = i++;
    while (i < text.length) {
      const c = text[i++];
      if (c === '\\') { i++; continue; }
      if (c === '"') return JSON.parse(text.slice(start, i)) as string;
    }
    throw new SyntaxError('Unterminated string');
  }
  function value(depth: number): unknown {
    if (depth > 64) throw new SyntaxError('JSON nesting is too deep');
    space();
    if (text[i] === '"') return string();
    if (text[i] === '{') {
      i++; space(); const out: Record<string, unknown> = {}, keys = new Set<string>();
      if (text[i] === '}') { i++; return out; }
      while (true) {
        space(); if (text[i] !== '"') throw new SyntaxError('Expected member');
        const key = string(); if (keys.has(key)) throw new SyntaxError('Duplicate member'); keys.add(key);
        space(); if (text[i++] !== ':') throw new SyntaxError('Expected colon');
        Object.defineProperty(out, key, { value: value(depth + 1), enumerable: true, writable: true, configurable: true });
        space(); const end = text[i++]; if (end === '}') return out; if (end !== ',') throw new SyntaxError('Expected comma');
      }
    }
    if (text[i] === '[') {
      i++; space(); const out: unknown[] = [];
      if (text[i] === ']') { i++; return out; }
      while (true) { out.push(value(depth + 1)); space(); const end = text[i++]; if (end === ']') return out; if (end !== ',') throw new SyntaxError('Expected comma'); }
    }
    const token = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(i));
    if (!token) throw new SyntaxError('Expected value');
    i += token[0].length; return JSON.parse(token[0]) as unknown;
  }
  const result = value(0); space(); if (i !== text.length) throw new SyntaxError('Trailing JSON'); return result;
}

export async function requestIdentity(endpoint: 'start'|'action'|'resume', request: object): Promise<string> {
  const { commandId: _ignored, ...intent } = request as Record<string, unknown>;
  void _ignored;
  const bytes = new TextEncoder().encode(canonicalJson({ endpoint, request: intent }));
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
