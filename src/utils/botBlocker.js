// Simple bot blocker – returns false for all user agents (disabled)
function isBadBot(userAgent) {
  if (!userAgent) return false;
  // You can extend this list later
  const BAD_BOTS = ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'Baiduspider', 'YandexBot'];
  const lowerUA = userAgent.toLowerCase();
  return BAD_BOTS.some(bot => lowerUA.includes(bot.toLowerCase()));
}

module.exports = { isBadBot };
