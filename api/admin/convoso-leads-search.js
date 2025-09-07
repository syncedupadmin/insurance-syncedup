export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
      page = 1,
      limit = 50,
      date_range = 'created_at',
      from_date,
      to_date,
      filter_by,
      search_operator = 'contains',
      search_term,
      order_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    // In production, this would:
    // 1. Connect to your database
    // 2. Query the convoso_leads table
    // 3. Apply filters and sorting
    // 4. Return paginated results
    
    // For now, return sample data that matches the expected structure
    const sampleLeads = [
      {
        id: 'lead-1',
        convoso_lead_id: '12345678',
        first_name: 'John',
        last_name: 'Doe',
        phone_number: '8185551234',
        email: 'john.doe@example.com',
        list_name: 'PHS DATA - NextGen PL Plus',
        city: 'Los Angeles',
        state: 'CA',
        postal_code: '90210',
        status: 'NEW',
        last_disposition: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agency_name: 'PHS'
      },
      {
        id: 'lead-2',
        convoso_lead_id: '12345679',
        first_name: 'Jane',
        last_name: 'Smith',
        phone_number: '8185551235',
        email: 'jane.smith@example.com',
        list_name: 'PHS DATA - Refreshed Transfer',
        city: 'Beverly Hills',
        state: 'CA',
        postal_code: '90211',
        status: 'CONTACTED',
        last_disposition: 'Interested',
        created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        updated_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        agency_name: 'PHS'
      },
      {
        id: 'lead-3',
        convoso_lead_id: '12345680',
        first_name: 'Mike',
        last_name: 'Johnson',
        phone_number: '8185551236',
        email: 'mike.johnson@example.com',
        list_name: 'AMG DATA - NextGen Shared',
        city: 'Santa Monica',
        state: 'CA',
        postal_code: '90401',
        status: 'QUALIFIED',
        last_disposition: 'Callback Scheduled',
        created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        updated_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        agency_name: 'AMG'
      }
    ];

    // Apply search filter if provided
    let filteredLeads = sampleLeads;
    if (filter_by && search_term) {
      filteredLeads = sampleLeads.filter(lead => {
        const searchValue = lead[filter_by]?.toLowerCase() || '';
        const term = search_term.toLowerCase();
        
        switch (search_operator) {
          case 'equals':
            return searchValue === term;
          case 'starts':
            return searchValue.startsWith(term);
          case 'ends':
            return searchValue.endsWith(term);
          case 'contains':
          default:
            return searchValue.includes(term);
        }
      });
    }

    // Apply date range filter
    if (from_date || to_date) {
      filteredLeads = filteredLeads.filter(lead => {
        const leadDate = new Date(lead[date_range]);
        const fromDate = from_date ? new Date(from_date) : null;
        const toDate = to_date ? new Date(to_date + 'T23:59:59') : null;
        
        if (fromDate && leadDate < fromDate) return false;
        if (toDate && leadDate > toDate) return false;
        return true;
      });
    }

    // Sort results
    filteredLeads.sort((a, b) => {
      const aValue = a[order_by];
      const bValue = b[order_by];
      
      if (sort_order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Paginate
    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);
    const startIndex = (pageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      leads: paginatedLeads,
      total: filteredLeads.length,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(filteredLeads.length / pageSize)
    });

  } catch (error) {
    console.error('Leads search API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search leads',
      details: error.message 
    });
  }
}