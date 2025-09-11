// Secure User Management API - Uses RLS and Edge Functions
import { showNotification } from '../modules/utils.js';

const EDGE_FUNCTION_URL = 'https://your-project.supabase.co/functions/v1/admin-api';

// Get auth token from cookie
function getAuthToken() {
    const match = document.cookie.match(/auth_token=([^;]+)/);
    return match ? match[1] : null;
}

// Create new user (secure via Edge Function)
export async function createUserSecure(userData) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token');
        }

        const response = await fetch(`${EDGE_FUNCTION_URL}/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: userData.email,
                password: userData.password,
                role: userData.role,
                full_name: userData.full_name
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create user');
        }

        const result = await response.json();
        showNotification(`User ${userData.email} created successfully`, 'success');
        return result;
    } catch (error) {
        console.error('Create user error:', error);
        showNotification(`Failed to create user: ${error.message}`, 'error');
        throw error;
    }
}

// Update user role (secure via Edge Function)
export async function updateUserRole(userId, newRole) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token');
        }

        const response = await fetch(`${EDGE_FUNCTION_URL}/users/${userId}/role`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: newRole })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update role');
        }

        showNotification('User role updated successfully', 'success');
        return await response.json();
    } catch (error) {
        console.error('Update role error:', error);
        showNotification(`Failed to update role: ${error.message}`, 'error');
        throw error;
    }
}

// Delete user (secure via Edge Function)
export async function deleteUserSecure(userId) {
    try {
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token');
        }

        const response = await fetch(`${EDGE_FUNCTION_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete user');
        }

        showNotification('User deleted successfully', 'success');
        return await response.json();
    } catch (error) {
        console.error('Delete user error:', error);
        showNotification(`Failed to delete user: ${error.message}`, 'error');
        throw error;
    }
}

// Direct database operations (RLS protected)
// These work because super_admin has RLS policies
export async function directDatabaseOperations() {
    try {
        // Example: Direct read from portal_users (RLS allows for super_admin)
        const response = await fetch('/api/super-admin/users', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const users = await response.json();
            console.log('Direct DB read successful:', users.length, 'users');
            return users;
        }
    } catch (error) {
        console.error('Direct DB operation error:', error);
    }
}

// Activate/Deactivate user
export async function toggleUserStatus(userId, isActive) {
    try {
        const response = await fetch(`/api/super-admin/users/${userId}/status`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_active: isActive })
        });

        if (!response.ok) {
            throw new Error('Failed to update user status');
        }

        showNotification(`User ${isActive ? 'activated' : 'deactivated'} successfully`, 'success');
        return await response.json();
    } catch (error) {
        console.error('Toggle status error:', error);
        showNotification(`Failed to update status: ${error.message}`, 'error');
        throw error;
    }
}

// Bulk operations
export async function bulkUpdateUsers(userIds, updates) {
    try {
        const token = getAuthToken();
        const promises = userIds.map(userId => 
            fetch(`${EDGE_FUNCTION_URL}/users/${userId}/role`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            })
        );

        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        showNotification(`Updated ${successful} users, ${failed} failed`, 
                        failed > 0 ? 'warning' : 'success');
        
        return results;
    } catch (error) {
        console.error('Bulk update error:', error);
        showNotification('Bulk update failed', 'error');
        throw error;
    }
}

// Export for use in other modules
export default {
    createUserSecure,
    updateUserRole,
    deleteUserSecure,
    directDatabaseOperations,
    toggleUserStatus,
    bulkUpdateUsers
};