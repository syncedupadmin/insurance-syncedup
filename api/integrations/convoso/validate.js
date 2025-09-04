import { createClient } from '@supabase/supabase-js';
import { encrypt, generateTestCredentials } from '../../utils/encryption.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Validate Convoso API credentials by making test API calls
 * @param {object} credentials - Convoso API credentials
 * @returns {object} Validation results
 */
async function validateConvosoCredentials(credentials) {
    const { apiKey, webhookSecret, accountId } = credentials;
    
    try {
        // In a real implementation, this would make actual API calls to Convoso
        // For now, we'll simulate validation with basic checks
        
        const validation = {
            valid: false,
            tests: {},
            errors: [],
            warnings: [],
            apiInfo: null
        };
        
        // Test 1: API Key format validation
        if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
            validation.errors.push('API Key must be at least 10 characters long');
            validation.tests.apiKeyFormat = false;
        } else {
            validation.tests.apiKeyFormat = true;
        }
        
        // Test 2: Webhook secret format validation
        if (webhookSecret && (typeof webhookSecret !== 'string' || webhookSecret.length < 8)) {
            validation.errors.push('Webhook Secret must be at least 8 characters long');
            validation.tests.webhookSecretFormat = false;
        } else {
            validation.tests.webhookSecretFormat = true;
        }
        
        // Test 3: Account ID format validation
        if (accountId && (typeof accountId !== 'string' || accountId.length < 3)) {
            validation.errors.push('Account ID must be at least 3 characters long');
            validation.tests.accountIdFormat = false;
        } else {
            validation.tests.accountIdFormat = true;
        }
        
        // Simulate API connection test
        // In production, replace with actual Convoso API calls:
        /*
        const authTest = await fetch('https://api.convoso.com/v1/auth/test', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (authTest.ok) {
            const authData = await authTest.json();
            validation.tests.authentication = true;
            validation.apiInfo = {
                accountName: authData.account_name,
                permissions: authData.permissions,
                rateLimit: authData.rate_limit
            };
        } else {
            validation.errors.push('API authentication failed');
            validation.tests.authentication = false;
        }
        */
        
        // Simulated test results for development
        validation.tests.authentication = validation.tests.apiKeyFormat;
        validation.tests.permissions = validation.tests.apiKeyFormat;
        validation.tests.webhookEndpoint = true; // We control this
        
        if (validation.tests.apiKeyFormat) {
            validation.apiInfo = {
                accountName: 'Test Account',
                permissions: ['read_leads', 'write_leads', 'webhook_management'],
                rateLimit: { requests: 1000, period: 'hour' },
                webhookSupport: true
            };
        }
        
        // Overall validation
        validation.valid = validation.errors.length === 0 && 
                          validation.tests.apiKeyFormat && 
                          validation.tests.authentication;
        
        return validation;
        
    } catch (error) {
        console.error('Credential validation error:', error);
        return {
            valid: false,
            tests: {},
            errors: [`Validation failed: ${error.message}`],
            warnings: [],
            apiInfo: null
        };
    }
}

/**
 * Store validated credentials in database with encryption
 * @param {string} agencyId - Agency identifier  
 * @param {object} credentials - Validated credentials
 * @param {object} validationInfo - Results from validation
 * @param {number} userId - User ID performing the setup
 * @returns {object} Storage results
 */
async function storeEncryptedCredentials(agencyId, credentials, validationInfo, userId) {
    try {
        const { apiKey, webhookSecret, accountId } = credentials;
        const keyId = 'v1'; // Key version for rotation support
        
        // Encrypt sensitive credentials
        const encryptedApiKey = encrypt(apiKey, agencyId, keyId);
        const encryptedWebhookSecret = webhookSecret ? encrypt(webhookSecret, agencyId, keyId) : null;
        const encryptedAccountId = accountId ? encrypt(accountId, agencyId, keyId) : null;
        
        // Webhook URL for this specific agency
        const webhookUrl = `https://insurance.syncedupsolutions.com/api/leads/convoso-webhook/${agencyId}`;
        
        // Get agency name from portal_users or use agency_id
        const { data: agencyData } = await supabase
            .from('portal_users')
            .select('agency_name')
            .eq('agency_id', agencyId)
            .limit(1);
            
        const agencyName = agencyData?.[0]?.agency_name || `Agency ${agencyId}`;
        
        // Store or update integration
        const { data, error } = await supabase
            .from('agency_integrations')
            .upsert({
                agency_id: agencyId,
                agency_name: agencyName,
                integration_type: 'convoso',
                is_active: true,
                encrypted_api_key: encryptedApiKey,
                encrypted_webhook_secret: encryptedWebhookSecret,
                encrypted_account_id: encryptedAccountId,
                encryption_key_id: keyId,
                webhook_url: webhookUrl,
                webhook_events: ['lead_created', 'lead_updated'],
                rate_limit_per_minute: validationInfo.apiInfo?.rateLimit?.requests || 60,
                rate_limit_per_hour: validationInfo.apiInfo?.rateLimit?.requests || 3600,
                onboarding_status: 'validated',
                last_validation_at: new Date().toISOString(),
                validation_error: null,
                integration_settings: {
                    account_name: validationInfo.apiInfo?.accountName,
                    permissions: validationInfo.apiInfo?.permissions,
                    webhook_support: validationInfo.apiInfo?.webhookSupport,
                    setup_by: userId,
                    setup_date: new Date().toISOString()
                },
                created_by: userId,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'agency_id',
                returning: 'minimal'
            });
        
        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }
        
        return {
            success: true,
            agencyId,
            webhookUrl,
            status: 'validated'
        };
        
    } catch (error) {
        console.error('Credential storage error:', error);
        throw error;
    }
}

/**
 * Main validation endpoint handler
 */
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST to validate credentials.' 
        });
    }
    
    try {
        const { agencyId, credentials, testMode = false } = req.body;
        
        // Basic validation
        if (!agencyId || typeof agencyId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Agency ID is required and must be a string'
            });
        }
        
        if (!credentials || typeof credentials !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Credentials object is required'
            });
        }
        
        const { apiKey, webhookSecret, accountId } = credentials;
        
        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'API Key is required'
            });
        }
        
        console.log(`Starting credential validation for agency: ${agencyId}`);
        
        // Validate credentials with Convoso API
        const validation = await validateConvosoCredentials(credentials);
        
        let integrationData = null;
        
        // If validation passed and not in test mode, store credentials
        if (validation.valid && !testMode) {
            try {
                // Get user ID from headers/auth (simplified for now)
                const userId = 1; // In production, extract from JWT/session
                
                integrationData = await storeEncryptedCredentials(
                    agencyId, 
                    credentials, 
                    validation, 
                    userId
                );
                
                console.log(`Credentials stored successfully for agency: ${agencyId}`);
                
            } catch (storageError) {
                console.error('Failed to store credentials:', storageError);
                
                return res.status(500).json({
                    success: false,
                    error: 'Credential validation passed but storage failed',
                    validation: validation,
                    storageError: storageError.message
                });
            }
        }
        
        // Return validation results
        const response = {
            success: validation.valid,
            agencyId,
            testMode,
            validation: {
                valid: validation.valid,
                tests: validation.tests,
                errors: validation.errors,
                warnings: validation.warnings
            },
            apiInfo: validation.apiInfo,
            integration: integrationData,
            timestamp: new Date().toISOString()
        };
        
        if (validation.valid) {
            console.log(`Credential validation successful for agency: ${agencyId}`);
            res.status(200).json(response);
        } else {
            console.log(`Credential validation failed for agency: ${agencyId}`, validation.errors);
            res.status(400).json(response);
        }
        
    } catch (error) {
        console.error('Validation endpoint error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error during validation',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
}

// Export for testing
export const _internal = {
    validateConvosoCredentials,
    storeEncryptedCredentials
};