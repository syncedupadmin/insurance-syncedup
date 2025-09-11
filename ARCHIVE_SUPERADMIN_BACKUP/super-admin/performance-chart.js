import { createClient } from '@supabase/supabase-js';
const { verifySuperAdmin } = require('./_auth-helper');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Authentication check
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
        const user = await verifySuperAdmin(token);
        if (!user) {
            return res.status(403).json({ error: 'Super admin privileges required' });
        }

async function getPerformanceChartData() {
    try {
        // Generate performance data for the last 24 hours
        const hours = [];
        const currentTime = new Date();
        
        for (let i = 23; i >= 0; i--) {
            const time = new Date(currentTime);
            time.setHours(time.getHours() - i, 0, 0, 0);
            hours.push(time);
        }

        // Simulate realistic performance data
        const performanceMetrics = hours.map((time, index) => {
            // Business hours tend to have higher activity
            const hour = time.getHours();
            const isBusinessHour = hour >= 9 && hour <= 17;
            const baseFactor = isBusinessHour ? 1.5 : 0.8;
            
            // Add some randomness and trends
            const randomFactor = 0.7 + Math.random() * 0.6;
            const trendFactor = 1 + (index * 0.001); // Slight improvement over time
            
            return {
                timestamp: time.toISOString(),
                hour_label: time.getHours().toString().padStart(2, '0') + ':00',
                response_time: Math.round((50 + Math.random() * 100) * baseFactor * randomFactor),
                throughput: Math.round((200 + Math.random() * 300) * baseFactor * trendFactor),
                error_rate: Math.round((0.5 + Math.random() * 2) * (isBusinessHour ? 1.2 : 0.8) * 100) / 100,
                cpu_usage: Math.round((20 + Math.random() * 40) * baseFactor),
                memory_usage: Math.round((30 + Math.random() * 30) * baseFactor),
                active_connections: Math.round((10 + Math.random() * 50) * baseFactor * trendFactor)
            };
        });

        // Calculate summary statistics
        const avgResponseTime = Math.round(
            performanceMetrics.reduce((sum, metric) => sum + metric.response_time, 0) / performanceMetrics.length
        );
        
        const avgThroughput = Math.round(
            performanceMetrics.reduce((sum, metric) => sum + metric.throughput, 0) / performanceMetrics.length
        );
        
        const avgErrorRate = (
            performanceMetrics.reduce((sum, metric) => sum + metric.error_rate, 0) / performanceMetrics.length
        ).toFixed(2);
        
        const maxResponseTime = Math.max(...performanceMetrics.map(m => m.response_time));
        const minResponseTime = Math.min(...performanceMetrics.map(m => m.response_time));

        return {
            chartData: {
                labels: performanceMetrics.map(m => m.hour_label),
                datasets: [
                    {
                        label: 'Response Time (ms)',
                        data: performanceMetrics.map(m => m.response_time),
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        fill: false,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Throughput (req/min)',
                        data: performanceMetrics.map(m => m.throughput),
                        borderColor: '#48bb78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        fill: false,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Error Rate (%)',
                        data: performanceMetrics.map(m => m.error_rate),
                        borderColor: '#f56565',
                        backgroundColor: 'rgba(245, 101, 101, 0.1)',
                        fill: false,
                        yAxisID: 'y2'
                    }
                ]
            },
            rawData: performanceMetrics,
            summary: {
                avg_response_time: avgResponseTime,
                min_response_time: minResponseTime,
                max_response_time: maxResponseTime,
                avg_throughput: avgThroughput,
                avg_error_rate: avgErrorRate,
                peak_hour: performanceMetrics.reduce((peak, current) => 
                    current.throughput > peak.throughput ? current : peak
                ).hour_label,
                status: avgErrorRate < 1 ? 'excellent' : avgErrorRate < 2 ? 'good' : avgErrorRate < 5 ? 'fair' : 'poor'
            }
        };

    } catch (error) {
        console.error('Error getting performance chart data:', error);
        throw error;
    }
}