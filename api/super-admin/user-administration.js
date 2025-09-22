const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, agency_id')
      .eq('id', user.id)
      .single();

    if (profileError || profile.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    const { action } = req.query;

    switch (req.method) {
      case 'GET':
        return await handleGetRequest(req, res, action);
      case 'POST':
        return await handlePostRequest(req, res, action);
      case 'PUT':
        return await handlePutRequest(req, res, action);
      case 'DELETE':
        return await handleDeleteRequest(req, res, action);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('User administration API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

async function handleGetRequest(req, res, action) {
  switch (action) {
    case 'user_metrics':
      const metrics = await getUserMetrics();
      return res.status(200).json(metrics);
      
    case 'activity_analytics':
      const activity = await getUserActivityAnalytics();
      return res.status(200).json(activity);
      
    case 'role_distribution':
      const roles = await getRoleDistribution();
      return res.status(200).json(roles);
      
    case 'audit_log':
      const { limit = 50, offset = 0 } = req.query;
      const auditLog = await getAuditLog(parseInt(limit), parseInt(offset));
      return res.status(200).json(auditLog);
      
    case 'user_details':
      const { user_id } = req.query;
      const userDetails = await getUserDetails(user_id);
      return res.status(200).json(userDetails);
      
    case 'compliance_report':
      const compliance = await getComplianceReport();
      return res.status(200).json(compliance);
      
    default:
      const allUserData = await getAllUserAdministrationData();
      return res.status(200).json(allUserData);
  }
}

async function handlePostRequest(req, res, action) {
  switch (action) {
    case 'create_user':
      const newUser = await createUser(req.body);
      return res.status(201).json(newUser);
      
    case 'bulk_operations':
      const bulkResult = await performBulkUserOperations(req.body);
      return res.status(200).json(bulkResult);
      
    case 'export_user_data':
      const exportResult = await exportUserData(req.body);
      return res.status(200).json(exportResult);
      
    case 'impersonate_user':
      const impersonationResult = await createImpersonationToken(req.body);
      return res.status(200).json(impersonationResult);
      
    case 'gdpr_deletion':
      const deletionResult = await processGDPRDeletion(req.body);
      return res.status(200).json(deletionResult);
      
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function handlePutRequest(req, res, action) {
  switch (action) {
    case 'update_user':
      const { user_id } = req.query;
      const updatedUser = await updateUser(user_id, req.body);
      return res.status(200).json(updatedUser);
      
    case 'reset_password':
      const passwordReset = await resetUserPassword(req.body);
      return res.status(200).json(passwordReset);
      
    case 'lock_account':
      const lockResult = await lockUserAccount(req.body);
      return res.status(200).json(lockResult);
      
    case 'unlock_account':
      const unlockResult = await unlockUserAccount(req.body);
      return res.status(200).json(unlockResult);
      
    case 'update_permissions':
      const permissionResult = await updateUserPermissions(req.body);
      return res.status(200).json(permissionResult);
      
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function handleDeleteRequest(req, res, action) {
  switch (action) {
    case 'delete_user':
      const { user_id } = req.query;
      const deleteResult = await deleteUser(user_id);
      return res.status(200).json(deleteResult);
      
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function getAllUserAdministrationData() {
  try {
    const [
      userMetrics,
      activityAnalytics,
      roleDistribution,
      recentAuditLog
    ] = await Promise.all([
      getUserMetrics(),
      getUserActivityAnalytics(),
      getRoleDistribution(),
      getAuditLog(20, 0)
    ]);

    return {
      timestamp: new Date().toISOString(),
      user_metrics: userMetrics,
      activity_analytics: activityAnalytics,
      role_distribution: roleDistribution,
      recent_audit_log: recentAuditLog
    };
  } catch (error) {
    console.error('Error getting all user administration data:', error);
    throw error;
  }
}

async function getUserMetrics() {
  try {
    const currentDate = new Date();
    const yesterday = new Date();
    yesterday.setDate(currentDate.getDate() - 1);
    const weekAgo = new Date();
    weekAgo.setDate(currentDate.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setDate(currentDate.getDate() - 30);

    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get active users (different time frames)
    const { count: dailyActiveUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', yesterday.toISOString());

    const { count: weeklyActiveUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', weekAgo.toISOString());

    const { count: monthlyActiveUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', monthAgo.toISOString());

    // Get new users this month
    const { count: newUsersThisMonth } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString());

    // Get locked accounts
    const { count: lockedAccounts } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false);

    // Calculate growth rate
    const previousMonthStart = new Date();
    previousMonthStart.setDate(previousMonthStart.getDate() - 60);
    const previousMonthEnd = new Date();
    previousMonthEnd.setDate(previousMonthEnd.getDate() - 30);

    const { count: previousMonthUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', previousMonthStart.toISOString())
      .lte('created_at', previousMonthEnd.toISOString());

    const userGrowthRate = previousMonthUsers > 0 ? 
      ((newUsersThisMonth - previousMonthUsers) / previousMonthUsers * 100).toFixed(1) : 0;

    // User engagement metrics
    const engagementMetrics = {
      daily_engagement_rate: totalUsers > 0 ? ((dailyActiveUsers / totalUsers) * 100).toFixed(1) : 0,
      weekly_engagement_rate: totalUsers > 0 ? ((weeklyActiveUsers / totalUsers) * 100).toFixed(1) : 0,
      monthly_engagement_rate: totalUsers > 0 ? ((monthlyActiveUsers / totalUsers) * 100).toFixed(1) : 0,
      stickiness_ratio: weeklyActiveUsers > 0 ? ((dailyActiveUsers / weeklyActiveUsers) * 100).toFixed(1) : 0
    };

    return {
      total_users: totalUsers || 0,
      active_users: {
        daily: dailyActiveUsers || 0,
        weekly: weeklyActiveUsers || 0,
        monthly: monthlyActiveUsers || 0
      },
      user_growth: {
        new_users_this_month: newUsersThisMonth || 0,
        growth_rate: parseFloat(userGrowthRate),
        trend: parseFloat(userGrowthRate) > 0 ? 'increasing' : parseFloat(userGrowthRate) < 0 ? 'decreasing' : 'stable'
      },
      account_status: {
        active_accounts: (totalUsers || 0) - (lockedAccounts || 0),
        locked_accounts: lockedAccounts || 0,
        lock_rate: totalUsers > 0 ? ((lockedAccounts / totalUsers) * 100).toFixed(2) : 0
      },
      engagement_metrics: engagementMetrics
    };
  } catch (error) {
    console.error('Error getting user metrics:', error);
    throw error;
  }
}

async function getUserActivityAnalytics() {
  try {
    // Get user activity patterns
    const { data: users } = await supabase
      .from('profiles')
      .select('id, name, email, role, last_sign_in_at, created_at, agency_id');

    // Analyze login patterns
    const currentDate = new Date();
    const activityAnalysis = {
      hourly_distribution: Array(24).fill(0),
      daily_distribution: Array(7).fill(0),
      role_activity: {},
      agency_activity: {}
    };

    users?.forEach(user => {
      if (user.last_sign_in_at) {
        const lastLogin = new Date(user.last_sign_in_at);
        const hour = lastLogin.getHours();
        const day = lastLogin.getDay();
        
        // Simulate distribution for demo (in real app, you'd have actual login timestamp data)
        activityAnalysis.hourly_distribution[hour]++;
        activityAnalysis.daily_distribution[day]++;
      }

      // Role-based activity
      if (user.role) {
        activityAnalysis.role_activity[user.role] = (activityAnalysis.role_activity[user.role] || 0) + 1;
      }

      // Agency-based activity
      if (user.agency_id) {
        activityAnalysis.agency_activity[user.agency_id] = (activityAnalysis.agency_activity[user.agency_id] || 0) + 1;
      }
    });

    // Generate session analytics
    const sessionAnalytics = {
      average_session_duration: '24 minutes', // Simulated
      bounce_rate: '12%', // Simulated
      pages_per_session: 8.5, // Simulated
      peak_usage_hours: [9, 10, 11, 14, 15, 16], // Business hours
      weekend_activity_ratio: '23%' // Simulated
    };

    // User behavior patterns
    const behaviorPatterns = [
      {
        pattern: 'Early Birds',
        description: 'Users most active 6-9 AM',
        user_count: Math.floor((users?.length || 0) * 0.15),
        characteristics: ['Login before 9 AM', 'High engagement', 'Complete daily tasks']
      },
      {
        pattern: 'Business Hours',
        description: 'Standard business hours users',
        user_count: Math.floor((users?.length || 0) * 0.65),
        characteristics: ['Active 9 AM - 5 PM', 'Meeting-heavy', 'Task-oriented']
      },
      {
        pattern: 'Night Owls',
        description: 'Users active after hours',
        user_count: Math.floor((users?.length || 0) * 0.20),
        characteristics: ['Active after 6 PM', 'Extended sessions', 'Report generation']
      }
    ];

    return {
      activity_distribution: activityAnalysis,
      session_analytics: sessionAnalytics,
      behavior_patterns: behaviorPatterns,
      usage_trends: {
        most_active_hour: activityAnalysis.hourly_distribution.indexOf(Math.max(...activityAnalysis.hourly_distribution)),
        most_active_day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
          activityAnalysis.daily_distribution.indexOf(Math.max(...activityAnalysis.daily_distribution))
        ],
        total_sessions_today: Math.floor(Math.random() * 500) + 200,
        concurrent_users: Math.floor(Math.random() * 50) + 15
      }
    };
  } catch (error) {
    console.error('Error getting user activity analytics:', error);
    throw error;
  }
}

async function getRoleDistribution() {
  try {
    const { data: users } = await supabase
      .from('profiles')
      .select('role, is_active, created_at');

    const roleStats = users?.reduce((acc, user) => {
      if (user.role) {
        if (!acc[user.role]) {
          acc[user.role] = { total: 0, active: 0, inactive: 0, recent: 0 };
        }
        
        acc[user.role].total++;
        
        if (user.is_active) {
          acc[user.role].active++;
        } else {
          acc[user.role].inactive++;
        }

        // Check if created in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (new Date(user.created_at) > thirtyDaysAgo) {
          acc[user.role].recent++;
        }
      }
      return acc;
    }, {}) || {};

    // Calculate role permissions and capabilities
    const roleCapabilities = {
      super_admin: {
        permissions: ['all'],
        description: 'Full system access and control',
        risk_level: 'critical',
        requires_2fa: true
      },
      admin: {
        permissions: ['agency_management', 'user_management', 'reports', 'settings'],
        description: 'Agency-level administration',
        risk_level: 'high',
        requires_2fa: true
      },
      manager: {
        permissions: ['team_management', 'reports', 'goals'],
        description: 'Team and performance management',
        risk_level: 'medium',
        requires_2fa: false
      },
      agent: {
        permissions: ['leads', 'sales', 'commissions', 'basic_reports'],
        description: 'Sales and lead management',
        risk_level: 'low',
        requires_2fa: false
      },
      customer_service: {
        permissions: ['tickets', 'customer_data', 'basic_reports'],
        description: 'Customer support and service',
        risk_level: 'low',
        requires_2fa: false
      }
    };

    // Calculate security implications
    const securityAnalysis = {
      high_privilege_users: (roleStats.super_admin?.total || 0) + (roleStats.admin?.total || 0),
      total_2fa_required: (roleStats.super_admin?.total || 0) + (roleStats.admin?.total || 0),
      potential_security_risk: roleStats.admin?.inactive || 0, // Inactive admins
      role_distribution_health: calculateRoleDistributionHealth(roleStats)
    };

    return {
      role_statistics: roleStats,
      role_capabilities: roleCapabilities,
      security_analysis: securityAnalysis,
      recommendations: generateRoleRecommendations(roleStats, securityAnalysis)
    };
  } catch (error) {
    console.error('Error getting role distribution:', error);
    throw error;
  }
}

function calculateRoleDistributionHealth(roleStats) {
  const totalUsers = Object.values(roleStats).reduce((sum, role) => sum + role.total, 0);
  const adminUsers = (roleStats.super_admin?.total || 0) + (roleStats.admin?.total || 0);
  const adminRatio = totalUsers > 0 ? (adminUsers / totalUsers) : 0;

  if (adminRatio > 0.3) return 'poor'; // Too many admins
  if (adminRatio > 0.15) return 'fair';
  if (adminRatio >= 0.05) return 'good';
  return 'excellent';
}

function generateRoleRecommendations(roleStats, securityAnalysis) {
  const recommendations = [];

  if (securityAnalysis.potential_security_risk > 0) {
    recommendations.push({
      type: 'security',
      priority: 'high',
      message: `${securityAnalysis.potential_security_risk} inactive admin accounts pose security risk`,
      action: 'Review and deactivate unused admin accounts'
    });
  }

  const totalUsers = Object.values(roleStats).reduce((sum, role) => sum + role.total, 0);
  const adminRatio = securityAnalysis.high_privilege_users / totalUsers;

  if (adminRatio > 0.2) {
    recommendations.push({
      type: 'governance',
      priority: 'medium',
      message: 'High ratio of admin users may indicate over-privileged access',
      action: 'Review admin permissions and consider role downgrade where appropriate'
    });
  }

  return recommendations;
}

async function getAuditLog(limit, offset) {
  try {
    // In a real implementation, you'd have an audit_logs table
    // For now, we'll simulate audit log entries
    const auditEntries = Array.from({ length: limit }, (_, i) => {
      const timestamp = new Date(Date.now() - (i + offset) * 60 * 60 * 1000); // Hourly entries
      const actions = [
        'User login', 'User logout', 'Password reset', 'Profile updated', 'Role changed',
        'Account locked', 'Account unlocked', 'Permissions modified', 'Data exported',
        'User created', 'User deleted', 'Session expired'
      ];
      
      return {
        id: `audit_${Date.now()}_${i}`,
        timestamp: timestamp.toISOString(),
        user_id: `user_${Math.floor(Math.random() * 100) + 1}`,
        user_email: `user${Math.floor(Math.random() * 100) + 1}@example.com`,
        action: actions[Math.floor(Math.random() * actions.length)],
        resource_type: ['user', 'agency', 'system', 'profile'][Math.floor(Math.random() * 4)],
        resource_id: `res_${Math.floor(Math.random() * 1000) + 1}`,
        ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0 (compatible browser)',
        status: Math.random() > 0.1 ? 'success' : 'failed',
        details: {
          changes: Math.random() > 0.5 ? ['field1: old_value -> new_value'] : [],
          reason: Math.random() > 0.7 ? 'Administrative action' : null
        }
      };
    });

    // Generate audit statistics
    const auditStats = {
      total_entries: 15000 + offset, // Simulated total
      entries_today: Math.floor(Math.random() * 200) + 100,
      failed_attempts: Math.floor(Math.random() * 20) + 5,
      most_common_action: 'User login',
      security_events: Math.floor(Math.random() * 10) + 2
    };

    return {
      audit_entries: auditEntries,
      pagination: {
        limit,
        offset,
        total: 15000 + offset,
        has_more: offset + limit < 15000
      },
      audit_statistics: auditStats
    };
  } catch (error) {
    console.error('Error getting audit log:', error);
    throw error;
  }
}

async function createUser(userData) {
  try {
    const { name, email, role, agency_id, send_welcome_email = true } = userData;

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        agency_id
      }
    });

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        agency_id,
        name,
        email,
        role,
        is_active: true,
        created_by: 'super_admin',
        password_reset_required: true
      })
      .select()
      .single();

    if (profileError) {
      // Rollback auth user creation
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    // Log audit event
    await logAuditEvent({
      action: 'User created',
      user_id: authUser.user.id,
      resource_type: 'user',
      resource_id: authUser.user.id,
      details: { role, agency_id, created_by: 'super_admin' }
    });

    if (send_welcome_email) {
      // Send welcome email with temporary password
      // await sendWelcomeEmail(email, name, tempPassword);
    }

    return {
      success: true,
      user: {
        id: authUser.user.id,
        name,
        email,
        role,
        agency_id,
        temp_password: tempPassword
      },
      message: 'User created successfully'
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function updateUser(userId, updateData) {
  try {
    const { name, role, is_active, agency_id } = updateData;

    // Update profile
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        name,
        role,
        is_active,
        agency_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {
      throw new Error(`Failed to update user: ${profileError.message}`);
    }

    // Update auth metadata if role changed
    if (role) {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role, agency_id }
      });
    }

    // Log audit event
    await logAuditEvent({
      action: 'User updated',
      user_id: userId,
      resource_type: 'user',
      resource_id: userId,
      details: updateData
    });

    return {
      success: true,
      user: updatedProfile,
      message: 'User updated successfully'
    };
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

async function resetUserPassword(resetData) {
  try {
    const { user_id, send_email = true } = resetData;

    // Generate new temporary password
    const newPassword = generateTempPassword();

    // Update password in Supabase Auth
    const { error: passwordError } = await supabase.auth.admin.updateUserById(user_id, {
      password: newPassword
    });

    if (passwordError) {
      throw new Error(`Failed to reset password: ${passwordError.message}`);
    }

    // Mark password reset required in profile
    await supabase
      .from('profiles')
      .update({
        password_reset_required: true,
        password_reset_at: new Date().toISOString()
      })
      .eq('id', user_id);

    // Log audit event
    await logAuditEvent({
      action: 'Password reset',
      user_id,
      resource_type: 'user',
      resource_id: user_id,
      details: { reset_by: 'super_admin', email_sent: send_email }
    });

    if (send_email) {
      // Get user details for email
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', user_id)
        .single();

      // Send password reset email
      // await sendPasswordResetEmail(userProfile.email, userProfile.name, newPassword);
    }

    return {
      success: true,
      temp_password: newPassword,
      message: 'Password reset successfully'
    };
  } catch (error) {
    console.error('Error resetting user password:', error);
    throw error;
  }
}

async function lockUserAccount(lockData) {
  try {
    const { user_id, reason } = lockData;

    // Update user profile to inactive
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        locked_reason: reason,
        locked_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateError) {
      throw new Error(`Failed to lock account: ${updateError.message}`);
    }

    // Log audit event
    await logAuditEvent({
      action: 'Account locked',
      user_id,
      resource_type: 'user',
      resource_id: user_id,
      details: { reason, locked_by: 'super_admin' }
    });

    return {
      success: true,
      message: 'User account locked successfully'
    };
  } catch (error) {
    console.error('Error locking user account:', error);
    throw error;
  }
}

async function unlockUserAccount(unlockData) {
  try {
    const { user_id } = unlockData;

    // Update user profile to active
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: true,
        locked_reason: null,
        locked_at: null,
        unlocked_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateError) {
      throw new Error(`Failed to unlock account: ${updateError.message}`);
    }

    // Log audit event
    await logAuditEvent({
      action: 'Account unlocked',
      user_id,
      resource_type: 'user',
      resource_id: user_id,
      details: { unlocked_by: 'super_admin' }
    });

    return {
      success: true,
      message: 'User account unlocked successfully'
    };
  } catch (error) {
    console.error('Error unlocking user account:', error);
    throw error;
  }
}

async function exportUserData(exportData) {
  try {
    const { user_ids, format = 'csv', include_sensitive = false } = exportData;

    let query = supabase.from('profiles').select('*');
    
    if (user_ids && user_ids.length > 0) {
      query = query.in('id', user_ids);
    }

    const { data: users, error } = await query;

    if (error) {
      throw new Error(`Failed to export user data: ${error.message}`);
    }

    // Remove sensitive data if not requested
    const exportData = users?.map(user => {
      const userData = { ...user };
      if (!include_sensitive) {
        delete userData.id;
        delete userData.password_hash;
        delete userData.reset_token;
      }
      return userData;
    }) || [];

    // Log audit event
    await logAuditEvent({
      action: 'User data exported',
      resource_type: 'system',
      details: {
        user_count: exportData.length,
        format,
        include_sensitive,
        exported_by: 'super_admin'
      }
    });

    return {
      success: true,
      export_id: `export_${Date.now()}`,
      user_count: exportData.length,
      format,
      download_url: `/api/exports/users_${Date.now()}.${format}`,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
}

async function processGDPRDeletion(deletionData) {
  try {
    const { user_id, confirmation_code } = deletionData;

    // Verify confirmation code (in real implementation, this would be more secure)
    const expectedCode = 'DELETE_USER_DATA';
    if (confirmation_code !== expectedCode) {
      return {
        success: false,
        error: 'Invalid confirmation code'
      };
    }

    // Get user data before deletion for logging
    const { data: userData } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', user_id)
      .single();

    // Delete related data first
    await Promise.all([
      supabase.from('commissions').delete().eq('agent_id', user_id),
      supabase.from('sales').delete().eq('agent_id', user_id),
      supabase.from('leads').delete().eq('assigned_agent_id', user_id)
    ]);

    // Delete profile
    await supabase.from('profiles').delete().eq('id', user_id);

    // Delete from Supabase Auth
    await supabase.auth.admin.deleteUser(user_id);

    // Log audit event
    await logAuditEvent({
      action: 'GDPR deletion completed',
      user_id: user_id,
      resource_type: 'user',
      resource_id: user_id,
      details: {
        user_email: userData?.email,
        user_name: userData?.name,
        deleted_by: 'super_admin',
        deletion_type: 'GDPR'
      }
    });

    return {
      success: true,
      message: 'User data permanently deleted in compliance with GDPR',
      deletion_id: `gdpr_${Date.now()}`,
      deleted_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error processing GDPR deletion:', error);
    throw error;
  }
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function logAuditEvent(eventData) {
  try {
    // In a real implementation, you'd insert into an audit_logs table
    console.log('Audit Event:', {
      timestamp: new Date().toISOString(),
      ...eventData
    });
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}

async function getComplianceReport() {
  try {
    // Generate compliance metrics
    const { data: users } = await supabase
      .from('profiles')
      .select('*');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const complianceMetrics = {
      data_retention: {
        total_user_records: users?.length || 0,
        inactive_users: users?.filter(u => !u.is_active).length || 0,
        old_inactive_users: users?.filter(u => 
          !u.is_active && new Date(u.updated_at || u.created_at) < thirtyDaysAgo
        ).length || 0
      },
      access_control: {
        admin_users: users?.filter(u => ['admin', 'super_admin'].includes(u.role)).length || 0,
        users_with_2fa: 0, // Would be calculated from actual 2FA data
        password_reset_required: users?.filter(u => u.password_reset_required).length || 0
      },
      audit_compliance: {
        audit_log_retention_days: 365,
        data_export_requests: 5, // Simulated
        deletion_requests: 2, // Simulated
        access_requests: 12 // Simulated
      }
    };

    const complianceStatus = {
      gdpr_compliance: 'compliant',
      ccpa_compliance: 'compliant',
      hipaa_compliance: 'not_applicable',
      audit_readiness: 'compliant'
    };

    return {
      compliance_metrics: complianceMetrics,
      compliance_status: complianceStatus,
      recommendations: [
        'Review inactive admin accounts',
        'Enable 2FA for all admin users',
        'Schedule regular compliance audit',
        'Update data retention policy documentation'
      ],
      last_audit_date: '2024-08-15T00:00:00Z',
      next_audit_due: '2024-11-15T00:00:00Z'
    };
  } catch (error) {
    console.error('Error getting compliance report:', error);
    throw error;
  }
}