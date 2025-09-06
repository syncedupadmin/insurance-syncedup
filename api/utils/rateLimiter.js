const attempts = new Map();

export function checkRateLimit(identifier, maxAttempts = 5, windowMs = 900000) {
  const now = Date.now();
  const userAttempts = attempts.get(identifier) || [];
  
  // Filter out old attempts
  const recentAttempts = userAttempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return false; // Rate limited
  }
  
  recentAttempts.push(now);
  attempts.set(identifier, recentAttempts);
  return true; // Allowed
}

// Clean up old attempts periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [identifier, userAttempts] of attempts.entries()) {
    const recentAttempts = userAttempts.filter(time => now - time < 900000); // 15 minutes
    if (recentAttempts.length === 0) {
      attempts.delete(identifier);
    } else {
      attempts.set(identifier, recentAttempts);
    }
  }
}, 300000); // Clean up every 5 minutes

export function getRateLimitStatus(identifier, maxAttempts = 5, windowMs = 900000) {
  const now = Date.now();
  const userAttempts = attempts.get(identifier) || [];
  const recentAttempts = userAttempts.filter(time => now - time < windowMs);
  
  return {
    attempts: recentAttempts.length,
    maxAttempts,
    isLimited: recentAttempts.length >= maxAttempts,
    remainingAttempts: Math.max(0, maxAttempts - recentAttempts.length),
    resetTime: recentAttempts.length > 0 ? new Date(recentAttempts[0] + windowMs) : null
  };
}