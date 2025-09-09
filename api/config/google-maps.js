// api/config/google-maps.js
// Provides Google Maps API key to frontend

export default function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get Google Maps API key from environment variables
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // Return the API key if available, otherwise a fallback message
    res.status(200).json({
        success: true,
        apiKey: apiKey || null,
        message: apiKey ? 'API key loaded' : 'No Google Maps API key configured'
    });
}