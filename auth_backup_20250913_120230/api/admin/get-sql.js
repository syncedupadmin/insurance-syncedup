import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    try {
        const sqlPath = path.join(process.cwd(), 'database', 'create-essential-tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        res.setHeader('Content-Type', 'text/plain');
        res.status(200).send(sql);
        
    } catch (error) {
        res.status(500).json({ error: 'Could not read SQL file' });
    }
}