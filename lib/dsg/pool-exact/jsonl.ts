export function extractCompositeRawTopLevel(jsonLine: string): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  let keyStart = -1;
  let keyRaw = '';
  let readingKey = false;
  let lastCompositeRaw: string | null = null;

  for (let i = 0; i < jsonLine.length; i++) {
    const ch = jsonLine[i]!;

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      if (!inString) {
        inString = true;
        if (depth === 1) {
          keyStart = i;
          readingKey = true;
        }
      } else {
        inString = false;
        if (readingKey && depth === 1) {
          const keyLexeme = jsonLine.slice(keyStart, i + 1);
          try {
            keyRaw = JSON.parse(keyLexeme);
          } catch {
            keyRaw = '';
          }
          readingKey = false;
        }
      }
      continue;
    }

    if (inString) continue;

    if (ch === '{' || ch === '[') {
      depth++;
      continue;
    }

    if (ch === '}' || ch === ']') {
      depth--;
      continue;
    }

    if (depth === 1 && ch === ':' && keyRaw === 'composite') {
      let j = i + 1;
      while (j < jsonLine.length && /\s/.test(jsonLine[j]!)) j++;
      if (j >= jsonLine.length) break;

      const start = j;
      let end = j;

      if (jsonLine[j] === '"') {
        j++;
        let innerEscape = false;
        while (j < jsonLine.length) {
          if (innerEscape) {
            innerEscape = false;
            j++;
            continue;
          }
          if (jsonLine[j] === '\\') {
            innerEscape = true;
            j++;
            continue;
          }
          if (jsonLine[j] === '"') {
            end = j + 1;
            break;
          }
          j++;
        }
        const quoted = jsonLine.slice(start, end);
        try {
          const inner = JSON.parse(quoted);
          lastCompositeRaw = inner.toString();
        } catch {
          lastCompositeRaw = quoted.slice(1, -1);
        }
      } else {
        while (j < jsonLine.length && !/[,\}\]]/.test(jsonLine[j]!)) j++;
        end = j;
        lastCompositeRaw = jsonLine.slice(start, end).trim();
      }
      keyRaw = '';
    }

    if (depth === 1 && ch === ',') keyRaw = '';
  }

  return lastCompositeRaw;
}
