import crypto from 'crypto';

// AES-256-GCM encryption for secure credential storage
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Generate a secure encryption key
 * @returns {string} Base64 encoded encryption key
 */
export function generateEncryptionKey() {
    return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Get or generate the master encryption key for the application
 * In production, this should be stored in a secure key management service
 * @returns {Buffer} The encryption key as a Buffer
 */
function getMasterKey() {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    
    if (!masterKey) {
        throw new Error('ENCRYPTION_MASTER_KEY environment variable is required');
    }
    
    // In production, validate key format and strength
    return Buffer.from(masterKey, 'base64');
}

/**
 * Derive a key for a specific agency using PBKDF2
 * @param {string} agencyId - The agency identifier
 * @param {string} keyId - Key version identifier for rotation
 * @returns {Buffer} Derived encryption key
 */
function deriveAgencyKey(agencyId, keyId = 'v1') {
    const masterKey = getMasterKey();
    const salt = crypto.createHash('sha256').update(agencyId + keyId).digest();
    
    return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param {string} plaintext - Data to encrypt
 * @param {string} agencyId - Agency identifier for key derivation
 * @param {string} keyId - Key version identifier
 * @returns {object} Encrypted data with metadata
 */
export function encrypt(plaintext, agencyId, keyId = 'v1') {
    try {
        if (!plaintext || typeof plaintext !== 'string') {
            throw new Error('Plaintext must be a non-empty string');
        }
        
        if (!agencyId || typeof agencyId !== 'string') {
            throw new Error('Agency ID must be a non-empty string');
        }
        
        const key = deriveAgencyKey(agencyId, keyId);
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipher(ALGORITHM, key);
        cipher.setAAD(Buffer.from(agencyId + keyId, 'utf8')); // Additional authenticated data
        
        let encrypted = cipher.update(plaintext, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        const tag = cipher.getAuthTag();
        
        const result = {
            encrypted: encrypted.toString('base64'),
            iv: iv.toString('base64'),
            tag: tag.toString('base64'),
            keyId: keyId,
            algorithm: ALGORITHM,
            timestamp: Date.now()
        };
        
        // Return as base64 encoded JSON string for database storage
        return Buffer.from(JSON.stringify(result)).toString('base64');
        
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error(`Encryption failed: ${error.message}`);
    }
}

/**
 * Decrypt sensitive data using AES-256-GCM
 * @param {string} encryptedData - Base64 encoded encrypted data with metadata
 * @param {string} agencyId - Agency identifier for key derivation
 * @returns {string} Decrypted plaintext
 */
export function decrypt(encryptedData, agencyId) {
    try {
        if (!encryptedData || typeof encryptedData !== 'string') {
            throw new Error('Encrypted data must be a non-empty string');
        }
        
        if (!agencyId || typeof agencyId !== 'string') {
            throw new Error('Agency ID must be a non-empty string');
        }
        
        // Parse the encrypted data
        const dataObj = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
        
        const {
            encrypted,
            iv,
            tag,
            keyId = 'v1',
            algorithm,
            timestamp
        } = dataObj;
        
        // Validate algorithm
        if (algorithm !== ALGORITHM) {
            throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
        
        // Check if data is too old (optional security measure)
        const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
        if (timestamp && Date.now() - timestamp > maxAge) {
            console.warn(`Decrypting old data from ${new Date(timestamp)}`);
        }
        
        const key = deriveAgencyKey(agencyId, keyId);
        const decipher = crypto.createDecipher(algorithm, key);
        
        decipher.setAAD(Buffer.from(agencyId + keyId, 'utf8'));
        decipher.setAuthTag(Buffer.from(tag, 'base64'));
        
        let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted.toString('utf8');
        
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * Rotate encryption keys for an agency
 * @param {string} agencyId - Agency identifier
 * @param {string} oldKeyId - Current key version
 * @param {string} newKeyId - New key version
 * @param {string} encryptedData - Data encrypted with old key
 * @returns {string} Data encrypted with new key
 */
export function rotateKey(agencyId, oldKeyId, newKeyId, encryptedData) {
    try {
        // Decrypt with old key
        const plaintext = decrypt(encryptedData, agencyId, oldKeyId);
        
        // Encrypt with new key
        return encrypt(plaintext, agencyId, newKeyId);
        
    } catch (error) {
        console.error('Key rotation error:', error);
        throw new Error(`Key rotation failed: ${error.message}`);
    }
}

/**
 * Validate encryption configuration
 * @returns {object} Validation results
 */
export function validateEncryption() {
    const results = {
        valid: true,
        errors: [],
        warnings: []
    };
    
    try {
        // Check if master key exists
        if (!process.env.ENCRYPTION_MASTER_KEY) {
            results.errors.push('ENCRYPTION_MASTER_KEY environment variable is missing');
            results.valid = false;
        }
        
        // Test encryption/decryption
        const testData = 'test-data-12345';
        const testAgency = 'TEST001';
        
        const encrypted = encrypt(testData, testAgency);
        const decrypted = decrypt(encrypted, testAgency);
        
        if (decrypted !== testData) {
            results.errors.push('Encryption test failed: data mismatch');
            results.valid = false;
        }
        
        // Check key strength
        const masterKey = getMasterKey();
        if (masterKey.length < KEY_LENGTH) {
            results.errors.push(`Master key too short: ${masterKey.length} bytes, need ${KEY_LENGTH}`);
            results.valid = false;
        }
        
    } catch (error) {
        results.errors.push(`Encryption validation failed: ${error.message}`);
        results.valid = false;
    }
    
    return results;
}

/**
 * Generate secure random credentials for testing
 * @returns {object} Test credentials
 */
export function generateTestCredentials() {
    return {
        apiKey: crypto.randomBytes(32).toString('hex'),
        webhookSecret: crypto.randomBytes(24).toString('base64'),
        accountId: `ACC_${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
        clientId: `CLIENT_${crypto.randomBytes(8).toString('hex').toUpperCase()}`
    };
}

/**
 * Hash sensitive data for comparison without storing plaintext
 * @param {string} data - Data to hash
 * @param {string} salt - Optional salt (generated if not provided)
 * @returns {object} Hash and salt
 */
export function hashSensitiveData(data, salt = null) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString('base64');
    }
    
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('base64');
    
    return { hash, salt };
}

/**
 * Verify hashed data
 * @param {string} data - Original data
 * @param {string} hash - Stored hash
 * @param {string} salt - Stored salt
 * @returns {boolean} True if data matches hash
 */
export function verifySensitiveData(data, hash, salt) {
    const { hash: computedHash } = hashSensitiveData(data, salt);
    return crypto.timingSafeEqual(
        Buffer.from(hash, 'base64'),
        Buffer.from(computedHash, 'base64')
    );
}

/**
 * Secure memory cleanup (best effort)
 * @param {string|Buffer} sensitiveData 
 */
export function secureCleanup(sensitiveData) {
    if (typeof sensitiveData === 'string') {
        // In Node.js, strings are immutable, so we can't truly zero them
        // This is more of a symbolic cleanup
        sensitiveData = null;
    } else if (Buffer.isBuffer(sensitiveData)) {
        sensitiveData.fill(0);
    }
}

// Export validation for startup checks
export const EncryptionHealth = {
    validate: validateEncryption,
    isConfigured: () => !!process.env.ENCRYPTION_MASTER_KEY
};

export default {
    encrypt,
    decrypt,
    rotateKey,
    validateEncryption,
    generateTestCredentials,
    hashSensitiveData,
    verifySensitiveData,
    secureCleanup,
    EncryptionHealth
};