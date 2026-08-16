const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Manual byte->base64 encoder — avoids depending on RN's inconsistent btoa/Buffer
// availability across engines (Hermes vs JSC) just to inline a fetched photo as a data URI.
export function bytesToBase64(bytes: Uint8Array): string {
  let result = "";
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    result += CHARS[bytes[i] >> 2];
    result += CHARS[((bytes[i] & 0b11) << 4) | (bytes[i + 1] >> 4)];
    result += CHARS[((bytes[i + 1] & 0b1111) << 2) | (bytes[i + 2] >> 6)];
    result += CHARS[bytes[i + 2] & 0b111111];
  }
  const remaining = bytes.length - i;
  if (remaining === 1) {
    result += CHARS[bytes[i] >> 2];
    result += CHARS[(bytes[i] & 0b11) << 4];
    result += "==";
  } else if (remaining === 2) {
    result += CHARS[bytes[i] >> 2];
    result += CHARS[((bytes[i] & 0b11) << 4) | (bytes[i + 1] >> 4)];
    result += CHARS[(bytes[i + 1] & 0b1111) << 2];
    result += "=";
  }
  return result;
}
