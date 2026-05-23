// Simple in‑memory IP blocklist with expiry (disabled by default)
const blockedIPs = new Map();

function blockIP(ip, durationSec = 3600) {
  const expires = Date.now() + durationSec * 1000;
  blockedIPs.set(ip, expires);
}

function unblockIP(ip) {
  blockedIPs.delete(ip);
}

function isIPBlocked(ip) {
  const expiry = blockedIPs.get(ip);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    blockedIPs.delete(ip);
    return false;
  }
  return true;
}

module.exports = { blockIP, unblockIP, isIPBlocked };
