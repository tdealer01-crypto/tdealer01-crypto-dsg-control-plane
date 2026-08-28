export type ParsedDecimal = {
  sign: number;
  intPart: string;
  fracPart: string;
  exp: bigint;
  digits: string;
  expNet: bigint;
};

export function isValidDecimalFormat(s: string): boolean {
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(s.trim());
}

export function parseDecimalRaw(s: string): ParsedDecimal {
  const trimmed = s.trim();
  if (!isValidDecimalFormat(trimmed)) {
    throw new Error(`INVALID_DECIMAL_FORMAT: ${s}`);
  }

  let sign = 1;
  let rest = trimmed;
  if (rest.startsWith('-')) {
    sign = -1;
    rest = rest.slice(1);
  } else if (rest.startsWith('+')) {
    rest = rest.slice(1);
  }

  const expMatch = rest.match(/^(.*?)[eE]([+-]?\d+)$/);
  let exp = BigInt(0);
  let mantissa = rest;
  if (expMatch) {
    mantissa = expMatch[1]!;
    exp = BigInt(expMatch[2]!);
  }

  const dotIdx = mantissa.indexOf('.');
  let intPart = '';
  let fracPart = '';
  if (dotIdx === -1) {
    intPart = mantissa;
  } else {
    intPart = mantissa.slice(0, dotIdx);
    fracPart = mantissa.slice(dotIdx + 1);
  }

  intPart = intPart.replace(/^0+/, '') || '0';
  const digits = (intPart + fracPart).replace(/^0+/, '') || '0';
  const expNet = exp - BigInt(fracPart.length);
  return { sign, intPart, fracPart, exp, digits, expNet };
}

export function compareCompositeRaw(aRaw: string, bRaw: string): number {
  const a = parseDecimalRaw(aRaw);
  const b = parseDecimalRaw(bRaw);

  const aIsZero = a.digits === '0';
  const bIsZero = b.digits === '0';

  if (aIsZero && bIsZero) return 0;
  if (aIsZero) return b.sign === 1 ? -1 : 1;
  if (bIsZero) return a.sign === 1 ? 1 : -1;

  if (a.sign !== b.sign) return a.sign - b.sign;

  const aTopExp = a.expNet + BigInt(a.digits.length);
  const bTopExp = b.expNet + BigInt(b.digits.length);

  let cmp = 0;
  if (aTopExp !== bTopExp) {
    cmp = aTopExp > bTopExp ? 1 : -1;
  } else {
    const len = Math.max(a.digits.length, b.digits.length);
    for (let i = 0; i < len; i++) {
      const ad = i < a.digits.length ? a.digits.charCodeAt(i) : 48;
      const bd = i < b.digits.length ? b.digits.charCodeAt(i) : 48;
      if (ad !== bd) {
        cmp = ad > bd ? 1 : -1;
        break;
      }
    }
  }

  return a.sign === 1 ? cmp : -cmp;
}
