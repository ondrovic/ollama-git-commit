/**
 * Normalizes a host URL string by ensuring it has a protocol and removing trailing slashes.
 *
 * @param host - The host URL string to normalize (e.g. 'localhost:11434' or 'http://localhost:11434/')
 * @returns The normalized host URL with protocol and no trailing slashes (e.g. 'http://localhost:11434')
 */
export function normalizeHost(host: string): string {
  // Remove any trailing slashes
  host = host.replace(/\/+$/, '');

  // Add http:// if no protocol is specified
  if (!host.startsWith('http://') && !host.startsWith('https://')) {
    host = `http://${host}`;
  }

  return host;
}
