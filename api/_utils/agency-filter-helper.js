// Agency Filtering Helper
// Add this to your API files

function applyAgencyFilter(query, req, tableName = null) {
  // Super admins see everything
  if (req.user.role === 'super-admin' || req.user.role === 'super_admin') {
    return query;
  }

  // Everyone else filtered by their agency
  return query.eq('agency_id', req.user.agency_id);
}

// Usage:
// let query = supabase.from('portal_users').select('*');
// query = applyAgencyFilter(query, req);
// const { data } = await query;
