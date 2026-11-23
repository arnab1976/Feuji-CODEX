export const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
export const money = (n) => '$' + (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : fmt(n))
export function rng(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
