const jwt = require('jsonwebtoken');
const environment = require('../config/environment');

// Generate a signed URL for audio streaming (optional feature)
function generateSignedAudioUrl(publicId, userId) {
  const token = jwt.sign({ publicId, userId }, environment.JWT_SECRET, { expiresIn: '5m' });
  return `${environment.CLIENT_URL}/api/stream/${publicId}?token=${token}`;
}

function verifyStreamToken(token) {
  return jwt.verify(token, environment.JWT_SECRET);
}

module.exports = { generateSignedAudioUrl, verifyStreamToken };
