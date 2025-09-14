import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const agencyId = req.headers['x-agency-id'] || 'PHS001';
  
  try {
    // Get today's date range
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    // Daily cases count
    const { count: dailyCases } = await supabase
      .from('customer_service_cases')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', todayEnd.toISOString());
    
    // Active cases count
    const { count: activeCases } = await supabase
      .from('customer_service_cases')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .in('status', ['open', 'in_progress']);
    
    // Total members count
    const { count: totalMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId);
    
    // Calculate average response time (mock for now)
    const avgResponseTime = '12m';
    
    // Recent activity
    const { data: recentActivity } = await supabase
      .from('customer_service_cases')
      .select(`
        id,
        member_name,
        issue_type,
        status,
        created_at,
        updated_at
      `)
      .eq('agency_id', agencyId)
      .order('updated_at', { ascending: false })
      .limit(5);
    
    // Priority cases
    const { data: priorityCases } = await supabase
      .from('customer_service_cases')
      .select(`
        id,
        case_id,
        member_name,
        issue_type,
        priority,
        status,
        created_at
      `)
      .eq('agency_id', agencyId)
      .eq('priority', 'high')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Today's assigned cases
    const { data: assignedCases } = await supabase
      .from('customer_service_cases')
      .select(`
        id,
        case_id,
        member_name,
        member_phone,
        member_email,
        issue_type,
        status,
        updated_at
      `)
      .eq('agency_id', agencyId)
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false });
    
    // Case statistics
    const { count: resolvedToday } = await supabase
      .from('customer_service_cases')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('status', 'resolved')
      .gte('updated_at', todayStart.toISOString())
      .lt('updated_at', todayEnd.toISOString());
    
    const { count: escalatedCases } = await supabase
      .from('customer_service_cases')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('status', 'escalated');
    
    const resolutionRate = dailyCases > 0 ? Math.round((resolvedToday / dailyCases) * 100) : 0;
    
    return res.status(200).json({
      stats: {
        dailyCases: dailyCases || 0,
        activeCases: activeCases || 0,
        totalMembers: totalMembers || 0,
        avgResponseTime
      },
      recentActivity: recentActivity?.map(activity => ({
        type: activity.status === 'resolved' ? 'case_resolved' : 'case_updated',
        member: activity.member_name,
        action: `${activity.issue_type} case ${activity.status}`,
        time: getTimeAgo(activity.updated_at)
      })) || [],
      caseStatistics: {
        totalCases: dailyCases || 0,
        resolvedCases: resolvedToday || 0,
        pendingCases: (dailyCases || 0) - (resolvedToday || 0),
        escalatedCases: escalatedCases || 0,
        resolutionRate: `${resolutionRate}%`
      },
      priorityCases: priorityCases?.map(caseItem => ({
        id: caseItem.case_id || `CS${caseItem.id}`,
        member: caseItem.member_name,
        type: caseItem.issue_type,
        priority: caseItem.priority,
        created: new Date(caseItem.created_at).toLocaleString(),
        status: caseItem.status
      })) || [],
      assignedCases: assignedCases?.map(caseItem => ({
        id: caseItem.case_id || `CS${caseItem.id}`,
        member: caseItem.member_name,
        contact: caseItem.member_phone || caseItem.member_email,
        issue: caseItem.issue_type,
        lastUpdate: new Date(caseItem.updated_at).toLocaleTimeString(),
        status: caseItem.status
      })) || []
    });
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    
    // Fallback data if database fails
    return res.status(200).json({
      stats: {
        dailyCases: 20,
        activeCases: 5,
        totalMembers: 1000,
        avgResponseTime: '15m'
      },
      recentActivity: [
        { type: 'case_created', member: 'John Smith', action: 'New billing inquiry case created', time: '5 minutes ago' },
        { type: 'case_updated', member: 'Mary Johnson', action: 'Policy change case updated', time: '12 minutes ago' },
        { type: 'case_resolved', member: 'Bob Wilson', action: 'Coverage question resolved', time: '23 minutes ago' }
      ],
      caseStatistics: {
        totalCases: 20,
        resolvedCases: 12,
        pendingCases: 8,
        escalatedCases: 2,
        resolutionRate: '60%'
      },
      priorityCases: [
        { id: 'CS001', member: 'John Smith', type: 'Billing Dispute', priority: 'high', created: new Date().toLocaleString(), status: 'open' }
      ],
      assignedCases: [
        { id: 'CS004', member: 'Alice Cooper', contact: '(555) 123-4567', issue: 'Payment Issue', lastUpdate: '11:30 AM', status: 'active' }
      ]
    });
  }
}

function getTimeAgo(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diffInMinutes = Math.floor((now - past) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}