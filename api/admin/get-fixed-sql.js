import fs from 'fs';
import path from 'path';

function handler(req, res) {
    try {
        const sqlPath = path.join(process.cwd(), 'database', 'create-tables-fixed.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        res.setHeader('Content-Type', 'text/plain');
        res.status(200).send(sql);
        
    } catch (error) {
        res.status(500).json({ error: 'Could not read fixed SQL file' });
    }
}
module.exports = handler;
