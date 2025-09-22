import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and JSON files are allowed'));
    }
  }
});

// Middleware wrapper for multer
export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadMiddleware = upload.single('file');

// PHS Agency Configuration
const PHS_AGENCY_CONFIG = {
  agency_id: 'PHS-001',
  agency_name: 'PHS Agency',
  default_campaign_id: 'PHS-AUTO-2025',
  campaigns: [
    { id: 'PHS-AUTO-2025', name: 'PHS Auto Insurance Q1 2025' },
    { id: 'PHS-HOME-2025', name: 'PHS Home Insurance Q1 2025' },
    { id: 'PHS-LIFE-2025', name: 'PHS Life Insurance Q1 2025' },
    { id: 'PHS-HEALTH-2025', name: 'PHS Health Insurance Q1 2025' },
    { id: 'PHS-BUNDLE-2025', name: 'PHS Bundle Campaign 2025' }
  ]
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse multipart form data
  await new Promise((resolve, reject) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  const { campaign_id, agency_id, skip_duplicates = 'true', dry_run = 'false' } = req.body || req.query;
  
  // Validate agency access (ensure it's PHS agency)
  if (agency_id !== PHS_AGENCY_CONFIG.agency_id) {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'This endpoint is restricted to PHS agency only' 
    });
  }

  // Validate campaign
  const campaign = PHS_AGENCY_CONFIG.campaigns.find(c => c.id === campaign_id);
  if (!campaign) {
    return res.status(400).json({ 
      error: 'Invalid campaign',
      available_campaigns: PHS_AGENCY_CONFIG.campaigns 
    });
  }

  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let leads = [];
    
    // Parse file based on type
    if (file.mimetype === 'application/json') {
      leads = JSON.parse(file.buffer.toString());
    } else if (file.mimetype === 'text/csv') {
      leads = await parseCSV(file.buffer);
    }

    // Validate and process leads
    const processedLeads = [];
    const errors = [];
    const duplicates = [];
    
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const rowNum = i + 2; // Account for header row
      
      try {
        // Validate required fields
        const validatedLead = await validateAndTransformLead(lead, campaign, rowNum);
        
        // Check for duplicates if requested
        if (skip_duplicates === 'true') {
          const existing = await checkDuplicate(validatedLead.phone_number, agency_id);
          if (existing) {
            duplicates.push({
              row: rowNum,
              phone: validatedLead.phone_number,
              existing_lead_id: existing.lead_id
            });
            continue;
          }
        }
        
        processedLeads.push(validatedLead);
        
      } catch (error) {
        errors.push({
          row: rowNum,
          error: error.message,
          data: lead
        });
      }
    }

    // If dry run, return validation results without importing
    if (dry_run === 'true') {
      return res.status(200).json({
        success: true,
        dry_run: true,
        summary: {
          total_rows: leads.length,
          valid_leads: processedLeads.length,
          duplicates: duplicates.length,
          errors: errors.length
        },
        duplicates,
        errors,
        sample_data: processedLeads.slice(0, 5)
      });
    }

    // Import leads in batches
    const batchSize = 100;
    const importResults = [];
    
    for (let i = 0; i < processedLeads.length; i += batchSize) {
      const batch = processedLeads.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('convoso_leads')
        .insert(batch)
        .select();
      
      if (error) {
        console.error('Batch import error:', error);
        importResults.push({
          batch: Math.floor(i / batchSize) + 1,
          error: error.message,
          failed_count: batch.length
        });
      } else {
        importResults.push({
          batch: Math.floor(i / batchSize) + 1,
          success: true,
          imported_count: data.length
        });
      }
    }

    // Log import activity
    await logImportActivity(agency_id, campaign.id, {
      total_processed: leads.length,
      imported: processedLeads.length,
      duplicates: duplicates.length,
      errors: errors.length,
      import_results: importResults
    });

    // Return comprehensive results
    return res.status(200).json({
      success: true,
      campaign: campaign.name,
      summary: {
        total_rows: leads.length,
        imported: processedLeads.length,
        duplicates: duplicates.length,
        errors: errors.length
      },
      import_results: importResults,
      duplicates: duplicates.slice(0, 10), // Limit response size
      errors: errors.slice(0, 10) // Limit response size
    });

  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ 
      error: 'Import failed',
      details: error.message 
    });
  }
}

// Parse CSV buffer to JSON
async function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString());
    
    stream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Validate and transform lead data
async function validateAndTransformLead(lead, campaign, rowNum) {
  // Required fields validation
  if (!lead.phone && !lead.phone_number && !lead.Phone) {
    throw new Error(`Row ${rowNum}: Phone number is required`);
  }
  
  // Extract and normalize phone number
  const phone = (lead.phone || lead.phone_number || lead.Phone || '').toString().replace(/\D/g, '');
  if (phone.length < 10) {
    throw new Error(`Row ${rowNum}: Invalid phone number`);
  }
  
  // Generate unique lead ID
  const leadId = `PHS-${campaign.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Transform lead data to match database schema
  return {
    agency_id: PHS_AGENCY_CONFIG.agency_id,
    lead_id: leadId,
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    
    // Personal Information
    first_name: lead.first_name || lead.FirstName || lead['First Name'] || '',
    last_name: lead.last_name || lead.LastName || lead['Last Name'] || '',
    email: lead.email || lead.Email || '',
    phone_number: phone,
    
    // Address Information
    address_line1: lead.address || lead.Address || lead.address_line1 || '',
    city: lead.city || lead.City || '',
    state: lead.state || lead.State || '',
    zip_code: (lead.zip || lead.zip_code || lead.ZipCode || lead['Zip Code'] || '').toString(),
    
    // Lead Details
    source: 'campaign_import',
    status: 'new',
    priority: lead.priority || 'normal',
    lead_score: parseInt(lead.score || lead.lead_score || '50'),
    lead_temperature: lead.temperature || 'warm',
    
    // Insurance Information (if provided)
    insurance_type: detectInsuranceType(campaign.id, lead),
    current_carrier: lead.current_carrier || lead.carrier || '',
    annual_premium: parseFloat(lead.premium || lead.annual_premium || '0') || null,
    
    // Metadata
    notes: lead.notes || lead.comments || '',
    tags: generateTags(campaign.id, lead),
    additional_data: {
      import_date: new Date().toISOString(),
      import_campaign: campaign.id,
      original_data: lead
    },
    
    // Timestamps
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Check for duplicate phone numbers
async function checkDuplicate(phoneNumber, agencyId) {
  const { data, error } = await supabase
    .from('convoso_leads')
    .select('lead_id, phone_number')
    .eq('agency_id', agencyId)
    .eq('phone_number', phoneNumber)
    .limit(1)
    .single();
  
  return data;
}

// Detect insurance type from campaign or lead data
function detectInsuranceType(campaignId, lead) {
  if (campaignId.includes('AUTO')) return 'auto';
  if (campaignId.includes('HOME')) return 'home';
  if (campaignId.includes('LIFE')) return 'life';
  if (campaignId.includes('HEALTH')) return 'health';
  if (campaignId.includes('BUNDLE')) return 'bundle';
  
  // Check lead data for insurance type hints
  const insuranceType = lead.insurance_type || lead.type || lead.product || '';
  if (insuranceType) {
    return insuranceType.toLowerCase();
  }
  
  return 'auto'; // Default
}

// Generate tags based on campaign and lead data
function generateTags(campaignId, lead) {
  const tags = [];
  
  // Add campaign tag
  tags.push(`campaign:${campaignId}`);
  
  // Add source tag
  tags.push('source:import');
  
  // Add priority tag if high priority
  if (lead.priority === 'high' || lead.priority === 'urgent') {
    tags.push('high-priority');
  }
  
  // Add state tag
  if (lead.state || lead.State) {
    tags.push(`state:${(lead.state || lead.State).toUpperCase()}`);
  }
  
  return tags;
}

// Log import activity for auditing
async function logImportActivity(agencyId, campaignId, summary) {
  try {
    await supabase
      .from('convoso_audit_trail')
      .insert({
        agency_id: agencyId,
        action_type: 'LEAD_IMPORT',
        entity_type: 'campaign_leads',
        entity_id: campaignId,
        action_details: {
          campaign_id: campaignId,
          summary: summary,
          import_method: 'bulk_upload',
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log import activity:', error);
  }
}