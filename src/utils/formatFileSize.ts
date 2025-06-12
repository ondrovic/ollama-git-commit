/**
 * Format file size in bytes to human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted size string with appropriate unit
 */
export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes || bytes === 0) return '';
  
  const units: string[] = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const size = bytes / Math.pow(k, i);
  const formattedSize = size < 10 ? size.toFixed(1) : Math.round(size).toString();
  
  return `(${formattedSize} ${units[i]})`;
}