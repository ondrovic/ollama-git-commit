export function normalizeHost(host: string): string {
  // Remove any trailing slashes
  host = host.replace(/\/+$/, '');

  // Add http:// if no protocol is specified
  if (!host.startsWith('http://') && !host.startsWith('https://')) {
    host = `http://${host}`;
  }

  return host;
}
