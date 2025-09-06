export function exportTableToCSV(tableSelector, filename = 'export') {
  const table = document.querySelector(tableSelector);
  if (!table) return;
  
  const rows = Array.from(table.querySelectorAll('tr'));
  const csv = rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    return cells.map(cell => `"${cell.textContent.replace(/"/g, '""')}"`).join(',');
  }).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportDataToCSV(data, columns, filename = 'export') {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }
  
  // Create CSV header
  const header = columns.map(col => `"${col.label}"`).join(',');
  
  // Create CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = col.key.split('.').reduce((obj, key) => obj?.[key], item);
      return `"${(value || '').toString().replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  const csv = [header, ...rows].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper function for quotes export
export function exportQuotes() {
  // This function will be called from quotes pages
  if (typeof __api === 'undefined') {
    alert('API not available');
    return;
  }
  
  (async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('syncedup:user') || '{}');
      const quotes = await __api(`/quotes?agentId=${user.id}`);
      
      const columns = [
        { key: 'createdAt', label: 'Date' },
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'email', label: 'Email' },
        { key: 'productType', label: 'Product' },
        { key: 'monthlyPremium', label: 'Monthly Premium' },
        { key: 'status', label: 'Status' }
      ];
      
      exportDataToCSV(quotes, columns, 'quotes');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  })();
}

// Helper function for sales export
export function exportSales() {
  if (typeof __api === 'undefined') {
    alert('API not available');
    return;
  }
  
  (async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('syncedup:user') || '{}');
      const sales = await __api(`/sales?agentId=${user.id}`);
      
      const columns = [
        { key: 'createdAt', label: 'Date' },
        { key: 'customer', label: 'Customer' },
        { key: 'product', label: 'Product' },
        { key: 'amount', label: 'Amount' },
        { key: 'commission', label: 'Commission' }
      ];
      
      exportDataToCSV(sales, columns, 'sales');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  })();
}

// Helper function for users export (admin)
export function exportUsers() {
  if (typeof __api === 'undefined') {
    alert('API not available');
    return;
  }
  
  (async () => {
    try {
      const users = await __api('/users');
      
      const columns = [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'team', label: 'Team' },
        { key: 'status', label: 'Status' }
      ];
      
      exportDataToCSV(users, columns, 'users');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  })();
}