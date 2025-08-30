/**
 * Simple logger utility
 * ---------------------
 * Can be expanded to add log levels or persist logs.
 */

export function logInfo(msg: string) {
  console.log(`${msg}`);
}

export function logError(msg: string, err?: any) {
  console.error(`${msg}`, err || "");
}
