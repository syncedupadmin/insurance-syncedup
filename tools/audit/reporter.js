const fs = require('fs').promises;
const path = require('path');

class AuditReporter {
  constructor(reportPath = path.join(__dirname, 'audit-report.json')) {
    this.reportPath = reportPath;
  }

  async generateHtmlReport() {
    const data = JSON.parse(await fs.readFile(this.reportPath, 'utf-8'));
    const html = this.buildHtmlReport(data);
    
    const htmlPath = path.join(__dirname, 'audit-report.html');
    await fs.writeFile(htmlPath, html);
    
    console.log(`📄 HTML report generated: ${htmlPath}`);
    return htmlPath;
  }

  async generateMarkdownReport() {
    const data = JSON.parse(await fs.readFile(this.reportPath, 'utf-8'));
    const markdown = this.buildMarkdownReport(data);
    
    const mdPath = path.join(__dirname, 'audit-report.md');
    await fs.writeFile(mdPath, markdown);
    
    console.log(`📝 Markdown report generated: ${mdPath}`);
    return mdPath;
  }

  async generateConsoleReport() {
    const data = JSON.parse(await fs.readFile(this.reportPath, 'utf-8'));
    this.printConsoleReport(data);
  }

  buildHtmlReport(data) {
    const { summary, errors, suspectFiles, portals } = data;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Insurance Portal Audit Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 { color: #d32f2f; border-bottom: 3px solid #d32f2f; padding-bottom: 10px; }
        h2 { color: #1976d2; margin-top: 30px; }
        h3 { color: #388e3c; }
        .summary {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .stat {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #1976d2;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #1976d2;
        }
        .stat-label {
            color: #666;
            font-size: 14px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            margin-top: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th {
            background: #1976d2;
            color: white;
            text-align: left;
            padding: 12px;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #e0e0e0;
        }
        tr:hover { background: #f5f5f5; }
        .error-count { 
            background: #d32f2f; 
            color: white; 
            padding: 2px 8px; 
            border-radius: 12px;
            font-size: 12px;
        }
        .file-link {
            font-family: 'Monaco', 'Courier New', monospace;
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            color: #d32f2f;
            text-decoration: none;
        }
        .file-link:hover { background: #e0e0e0; }
        .error-message {
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            color: #666;
            max-width: 500px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .portal-status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
        }
        .portal-visited { background: #c8e6c9; color: #2e7d32; }
        .portal-not-visited { background: #ffcdd2; color: #c62828; }
        .no-errors { color: #4caf50; font-weight: bold; }
        .timestamp { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <h1>🔍 Insurance Portal Audit Report</h1>
    
    <div class="summary">
        <p class="timestamp">Generated: ${new Date(summary.timestamp).toLocaleString()}</p>
        <div class="stats">
            <div class="stat">
                <div class="stat-value">${summary.portalsChecked}</div>
                <div class="stat-label">Portals Checked</div>
            </div>
            <div class="stat">
                <div class="stat-value">${summary.urlsVisited}</div>
                <div class="stat-label">URLs Visited</div>
            </div>
            <div class="stat">
                <div class="stat-value">${summary.totalErrors}</div>
                <div class="stat-label">Total Errors</div>
            </div>
            <div class="stat">
                <div class="stat-value">${errors.pageErrors.length}</div>
                <div class="stat-label">Page Errors</div>
            </div>
            <div class="stat">
                <div class="stat-value">${errors.consoleErrors.length}</div>
                <div class="stat-label">Console Errors</div>
            </div>
            <div class="stat">
                <div class="stat-value">${errors.networkFailures.length}</div>
                <div class="stat-label">Network Failures</div>
            </div>
        </div>
    </div>

    <h2>📍 Portal Status</h2>
    <table>
        <thead>
            <tr>
                <th>Portal</th>
                <th>Path</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${portals.map(portal => `
                <tr>
                    <td>${portal.name}</td>
                    <td><code>${portal.path}</code></td>
                    <td>
                        <span class="portal-status ${portal.visited ? 'portal-visited' : 'portal-not-visited'}">
                            ${portal.visited ? '✓ Visited' : '✗ Not Visited'}
                        </span>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <h2>🔴 Suspect Files</h2>
    ${suspectFiles && suspectFiles.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>File</th>
                    <th>Error Count</th>
                    <th>Line Numbers</th>
                    <th>File:Line References</th>
                </tr>
            </thead>
            <tbody>
                ${suspectFiles.map(file => `
                    <tr>
                        <td><code>${file.file}</code></td>
                        <td><span class="error-count">${file.errorCount}</span></td>
                        <td>${file.lines.join(', ')}</td>
                        <td>
                            ${file.fileLineRefs.map(ref => 
                                `<span class="file-link">${ref}</span>`
                            ).join(' ')}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : '<p class="no-errors">No suspect files identified</p>'}

    <h2>❌ Console Errors</h2>
    ${errors.consoleErrors.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>File</th>
                    <th>Line</th>
                    <th>Error Message</th>
                    <th>File:Line</th>
                </tr>
            </thead>
            <tbody>
                ${errors.consoleErrors.map(error => `
                    <tr>
                        <td><code>${this.extractFileName(error.url) || 'unknown'}</code></td>
                        <td>${error.lineNumber || '-'}</td>
                        <td class="error-message" title="${this.escapeHtml(error.text)}">${this.escapeHtml(error.text)}</td>
                        <td>
                            ${error.url && error.lineNumber ? 
                                `<span class="file-link">${this.extractFileName(error.url)}:${error.lineNumber}</span>` : 
                                '-'
                            }
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : '<p class="no-errors">No console errors detected</p>'}

    <h2>🌐 Network Failures</h2>
    ${errors.networkFailures.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>URL</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Error</th>
                </tr>
            </thead>
            <tbody>
                ${errors.networkFailures.map(failure => `
                    <tr>
                        <td><code>${failure.url}</code></td>
                        <td>${failure.method || '-'}</td>
                        <td>${failure.status || '-'}</td>
                        <td>${failure.statusText || failure.error || failure.failure?.errorText || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : '<p class="no-errors">No network failures detected</p>'}

    <h2>⚠️ Page Errors</h2>
    ${errors.pageErrors.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Portal</th>
                    <th>Message</th>
                    <th>File:Line</th>
                </tr>
            </thead>
            <tbody>
                ${errors.pageErrors.map(error => `
                    <tr>
                        <td>${error.portal || '-'}</td>
                        <td class="error-message" title="${this.escapeHtml(error.message)}">${this.escapeHtml(error.message)}</td>
                        <td>
                            ${error.file && error.line ? 
                                `<span class="file-link">${error.file}:${error.line}</span>` : 
                                '-'
                            }
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : '<p class="no-errors">No page errors detected</p>'}

    <h2>🖱️ Action Errors</h2>
    ${errors.actionErrors.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Portal</th>
                    <th>Element</th>
                    <th>Index</th>
                    <th>Error</th>
                </tr>
            </thead>
            <tbody>
                ${errors.actionErrors.map(error => `
                    <tr>
                        <td>${error.portal}</td>
                        <td>${error.element}</td>
                        <td>${error.index}</td>
                        <td class="error-message">${this.escapeHtml(error.error)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : '<p class="no-errors">No action errors detected</p>'}

</body>
</html>`;
  }

  buildMarkdownReport(data) {
    const { summary, errors, suspectFiles, portals } = data;
    
    let markdown = `# 🔍 Insurance Portal Audit Report

Generated: ${new Date(summary.timestamp).toLocaleString()}

## 📊 Summary

| Metric | Value |
|--------|-------|
| Portals Checked | ${summary.portalsChecked} |
| URLs Visited | ${summary.urlsVisited} |
| **Total Errors** | **${summary.totalErrors}** |
| Page Errors | ${errors.pageErrors.length} |
| Console Errors | ${errors.consoleErrors.length} |
| Network Failures | ${errors.networkFailures.length} |
| Action Errors | ${errors.actionErrors.length} |

## 📍 Portal Status

| Portal | Path | Status |
|--------|------|--------|
${portals.map(p => `| ${p.name} | \`${p.path}\` | ${p.visited ? '✅ Visited' : '❌ Not Visited'} |`).join('\n')}

## 🔴 Suspect Files with Errors

`;

    if (suspectFiles && suspectFiles.length > 0) {
      markdown += `| File | Errors | File:Line References |
|------|--------|---------------------|
${suspectFiles.map(f => 
  `| \`${f.file}\` | ${f.errorCount} | ${f.fileLineRefs.map(ref => `\`${ref}\``).join(', ')} |`
).join('\n')}

`;
    } else {
      markdown += `✅ No suspect files identified\n\n`;
    }

    // Console Errors
    if (errors.consoleErrors.length > 0) {
      markdown += `## ❌ Console Errors

| File:Line | Error Message |
|-----------|--------------|
${errors.consoleErrors.map(e => {
  const file = this.extractFileName(e.url) || 'unknown';
  const ref = e.lineNumber ? `\`${file}:${e.lineNumber}\`` : file;
  return `| ${ref} | ${e.text.substring(0, 100)}... |`;
}).join('\n')}

`;
    }

    // Network Failures
    if (errors.networkFailures.length > 0) {
      markdown += `## 🌐 Network Failures

| URL | Method | Status | Error |
|-----|--------|--------|-------|
${errors.networkFailures.map(f => 
  `| \`${f.url}\` | ${f.method || '-'} | ${f.status || '-'} | ${f.statusText || f.error || '-'} |`
).join('\n')}

`;
    }

    // Page Errors
    if (errors.pageErrors.length > 0) {
      markdown += `## ⚠️ Page Errors

| Portal | File:Line | Error |
|--------|-----------|-------|
${errors.pageErrors.map(e => {
  const ref = e.file && e.line ? `\`${e.file}:${e.line}\`` : '-';
  return `| ${e.portal || '-'} | ${ref} | ${e.message.substring(0, 100)}... |`;
}).join('\n')}

`;
    }

    // Repro Commands
    markdown += `## 🔧 Reproduction Commands

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# In another terminal, run the audit
npm run audit

# Generate reports
npm run audit:report
\`\`\`

## 🧪 Playwright Test Examples

Based on the errors found, here are Playwright tests to prevent regressions:

\`\`\`javascript
const { test, expect } = require('@playwright/test');

test.describe('Portal Accessibility', () => {
${portals.map(portal => `
  test('${portal.name} should load without errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    await page.goto('http://localhost:3001${portal.path}');
    await expect(page).toHaveTitle(/.*./);
    expect(consoleErrors).toHaveLength(0);
  });`).join('\n')}
});
\`\`\`
`;

    return markdown;
  }

  printConsoleReport(data) {
    const { summary, errors, suspectFiles } = data;
    
    console.log('\n' + '='.repeat(80));
    console.log('                    INSURANCE PORTAL AUDIT REPORT');
    console.log('='.repeat(80));
    
    console.log('\n📊 SUMMARY');
    console.log('-'.repeat(40));
    console.log(`  Generated:        ${new Date(summary.timestamp).toLocaleString()}`);
    console.log(`  Portals Checked:  ${summary.portalsChecked}`);
    console.log(`  URLs Visited:     ${summary.urlsVisited}`);
    console.log(`  Total Errors:     ${summary.totalErrors}`);
    
    if (summary.totalErrors === 0) {
      console.log('\n✅ NO ERRORS FOUND - All portals passed audit!');
      return;
    }
    
    console.log('\n❌ ERROR BREAKDOWN');
    console.log('-'.repeat(40));
    console.log(`  Page Errors:      ${errors.pageErrors.length}`);
    console.log(`  Console Errors:   ${errors.consoleErrors.length}`);
    console.log(`  Network Failures: ${errors.networkFailures.length}`);
    console.log(`  Action Errors:    ${errors.actionErrors.length}`);
    
    if (suspectFiles && suspectFiles.length > 0) {
      console.log('\n🔴 SUSPECT FILES');
      console.log('-'.repeat(40));
      
      const table = suspectFiles.slice(0, 10).map(file => ({
        File: file.file,
        Errors: file.errorCount,
        'File:Line': file.fileLineRefs.slice(0, 3).join(', ')
      }));
      
      console.table(table);
    }
    
    // Show sample errors
    if (errors.consoleErrors.length > 0) {
      console.log('\n📍 SAMPLE CONSOLE ERRORS');
      console.log('-'.repeat(40));
      errors.consoleErrors.slice(0, 5).forEach(error => {
        const file = this.extractFileName(error.url) || 'unknown';
        const ref = error.lineNumber ? `${file}:${error.lineNumber}` : file;
        console.log(`  ${ref}`);
        console.log(`    ${error.text.substring(0, 100)}...`);
      });
    }
    
    if (errors.networkFailures.length > 0) {
      console.log('\n📍 SAMPLE NETWORK FAILURES');
      console.log('-'.repeat(40));
      errors.networkFailures.slice(0, 5).forEach(failure => {
        console.log(`  ${failure.method} ${failure.url}`);
        console.log(`    Status: ${failure.status || 'Failed'} ${failure.statusText || failure.error || ''}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('Run `npm run audit:report` to generate detailed HTML/Markdown reports');
    console.log('='.repeat(80) + '\n');
  }

  extractFileName(url) {
    if (!url) return null;
    let cleanUrl = url.split('?')[0].split('#')[0];
    if (cleanUrl.startsWith('http')) {
      try {
        const urlObj = new URL(cleanUrl);
        cleanUrl = urlObj.pathname;
      } catch {}
    }
    if (cleanUrl.startsWith('/')) {
      cleanUrl = cleanUrl.substring(1);
    }
    return cleanUrl || null;
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// Export for use
module.exports = AuditReporter;

// Run if called directly
if (require.main === module) {
  const reporter = new AuditReporter();
  
  Promise.all([
    reporter.generateConsoleReport(),
    reporter.generateHtmlReport(),
    reporter.generateMarkdownReport()
  ]).then(() => {
    console.log('\n✅ All reports generated successfully!');
  }).catch(error => {
    console.error('Failed to generate reports:', error);
    process.exit(1);
  });
}