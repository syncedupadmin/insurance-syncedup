export function getUserContext(req) {
  // Extract from JWT/session
  return {
    userId: req.user?.id,
    agencyId: req.user?.agency_id,
    agentId: req.user?.agent_id,
    role: req.user?.role
  };
}