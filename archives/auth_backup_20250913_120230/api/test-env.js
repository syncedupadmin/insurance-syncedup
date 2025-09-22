export default function handler(req, res) {
    const encKey = process.env.ENCRYPTION_MASTER_KEY;
    
    res.json({
        hasEncryptionKey: !!encKey,
        keyPreview: encKey ? encKey.substring(0, 20) + '...' : 'Not found',
        allEnvKeys: Object.keys(process.env).filter(key => key.includes('ENCRYPT') || key.includes('SUPABASE') || key.includes('JWT'))
    });
}