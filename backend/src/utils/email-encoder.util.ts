export function encodeBase64Url(data: string): string {
  // Convert to Buffer
  const buffer = Buffer.from(data, 'utf-8');

  // Encode to base64
  let base64 = buffer.toString('base64');

  // Convert to base64url (URL-safe) with padding
  // Gmail API may require padding, so we keep it
  base64 = base64.replace(/\+/g, '-').replace(/\//g, '_');

  return base64;
}

export function generateBoundary(): string {
  return `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Encodes header values according to RFC 2047 standard
 * This is required for non-ASCII characters like Vietnamese, Chinese, etc.
 * Format: =?UTF-8?B?<base64-encoded-text>?=
 */
export function encodeHeaderValue(value: string): string {
  // Check if the string contains only ASCII characters (code point <= 127)
  const isAscii = [...value].every((char) => char.charCodeAt(0) <= 127);

  if (isAscii) {
    return value; // No encoding needed for ASCII
  }

  // Encode to UTF-8 and then to base64
  const buffer = Buffer.from(value, 'utf-8');
  const base64 = buffer.toString('base64');

  return `=?UTF-8?B?${base64}?=`;
}
