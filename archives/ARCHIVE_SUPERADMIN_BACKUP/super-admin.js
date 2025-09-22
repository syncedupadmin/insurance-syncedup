/**
 * EMERGENCY: Super Admin Portal Protection
 * Edge function that protects /super-admin routes
 */

function decodeJWT(token) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(payload));
    if (decoded.exp && decoded.exp < Date.now() / 1000) return null;
    return decoded;
  } catch (error) {
    return null;
  }
}

export default function handler(request) {
  const url = new URL(request.url);
  
  // Extract token
  let token = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    const cookies = request.headers.get('cookie') || '';
    const match = cookies.match(/auth-token=([^;]+)/);
    if (match) token = match[1];
  }
  
  if (!token) {
    return Response.redirect(new URL('/login', request.url), 302);
  }
  
  const payload = decodeJWT(token);
  if (!payload || payload.role !== 'super_admin') {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('error', 'unauthorized_super_admin');
    return Response.redirect(redirectUrl, 302);
  }
  
  // Serve the super admin page
  return fetch(new URL('/super-admin.html', request.url));
}

export const config = {
  runtime: 'edge',
};