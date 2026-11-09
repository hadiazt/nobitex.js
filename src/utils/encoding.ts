/** Decodes standard or URL-safe base64 (padding optional) into bytes. */
export function base64ToBytes(input: string): Uint8Array<ArrayBuffer> {
  const normalized = input.trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Encodes bytes as standard (padded) base64. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Encodes bytes as URL-safe base64 (`-` and `_`, padding kept), as Nobitex expects for signatures. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  return toBase64Url(bytesToBase64(bytes));
}

/** Converts standard base64 to the URL-safe alphabet (no-op for strings that already use it). */
export function toBase64Url(base64: string): string {
  return base64.trim().replace(/\+/g, '-').replace(/\//g, '_');
}

/** Resolves after `ms` milliseconds, or rejects early when `signal` aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason as Error);
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal?.reason as Error);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
