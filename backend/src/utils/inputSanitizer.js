function isPlainObject(value) {
  return Boolean(value) && Object.getPrototypeOf(value) === Object.prototype;
}

export function sanitizeObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObjectKeys(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce((accumulator, [key, item]) => {
    if (key.startsWith('$') || key.includes('.')) {
      return accumulator;
    }

    accumulator[key] = sanitizeObjectKeys(item);
    return accumulator;
  }, {});
}

export function sanitizeText(value, { maxLength = 0, allowNewlines = false, stripTags = true } = {}) {
  let text = String(value ?? '');
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  if (stripTags) {
    text = text.replace(/<[^>]*>/g, '');
  }

  if (allowNewlines) {
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    text = text
      .split('\n')
      .map((line) => line.trim())
      .join('\n');
  } else {
    text = text.replace(/\s+/g, ' ');
  }

  text = text.trim();

  if (maxLength > 0) {
    text = text.slice(0, maxLength);
  }

  return text;
}

export function sanitizeUrl(value, { allowRelative = true, maxLength = 500 } = {}) {
  const text = sanitizeText(value, { maxLength, allowNewlines: false, stripTags: true });

  if (!text) {
    return '';
  }

  if (allowRelative && text.startsWith('/')) {
    return text;
  }

  try {
    const parsed = new URL(text);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }

  return '';
}

export function escapeRegex(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function toPositiveInt(value, fallback = 0, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(Math.max(numeric, min), max);
}

export function toPositiveNumber(value, fallback = 0, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(Math.max(numeric, min), max);
}
