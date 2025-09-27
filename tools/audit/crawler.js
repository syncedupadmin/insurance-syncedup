const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class InsurancePortalCrawler {
  constructor(baseUrl = 'http://localhost:3002') {
    this.baseUrl = baseUrl;
    this.visitedUrls = new Set();
    this.errors = [];
    this.networkFailures = [];
    this.consoleErrors = [];
    this.actionErrors = [];
    this.portals = [
      { path: '/login.html', name: 'Login Portal' },
      { path: '/_admin/', name: 'Admin Portal' },
      { path: '/_agent/', name: 'Agent Portal' },
      { path: '/_customer-service/', name: 'Customer Service Portal' },
      { path: '/_leaderboard/', name: 'Leaderboard Portal' },
      { path: '/_manager/', name: 'Manager Portal' },
      { path: '/_super-admin/', name: 'Super Admin Portal' }
    ];
  }

  async start() {
    console.log('🚀 Starting Insurance Portal Audit...\n');
    
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });

    const page = await context.newPage();
    
    // Setup error collectors
    this.setupErrorCollectors(page);
    
    // Crawl each portal
    for (const portal of this.portals) {
      await this.crawlPortal(page, portal);
    }
    
    await browser.close();
    
    // Generate report
    const report = await this.generateReport();
    await fs.writeFile(
      path.join(__dirname, 'audit-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    return report;
  }

  setupErrorCollectors(page) {
    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const location = msg.location();
        this.consoleErrors.push({
          text: msg.text(),
          url: location.url,
          lineNumber: location.lineNumber,
          columnNumber: location.columnNumber,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Collect page errors
    page.on('pageerror', error => {
      const stack = error.stack || '';
      const match = stack.match(/at\s+(.+):(\d+):(\d+)/);
      
      this.errors.push({
        message: error.message,
        stack: error.stack,
        file: match ? match[1] : 'unknown',
        line: match ? parseInt(match[2]) : 0,
        column: match ? parseInt(match[3]) : 0,
        timestamp: new Date().toISOString()
      });
    });

    // Collect network failures
    page.on('requestfailed', request => {
      this.networkFailures.push({
        url: request.url(),
        method: request.method(),
        failure: request.failure(),
        timestamp: new Date().toISOString()
      });
    });

    // Monitor responses for errors
    page.on('response', response => {
      if (response.status() >= 400) {
        this.networkFailures.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          method: response.request().method(),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  async crawlPortal(page, portal) {
    console.log(`\n📍 Crawling ${portal.name}...`);
    const url = `${this.baseUrl}${portal.path}`;
    
    if (this.visitedUrls.has(url)) {
      return;
    }
    
    this.visitedUrls.add(url);
    
    try {
      // Navigate to portal
      const response = await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      if (!response || response.status() >= 400) {
        console.log(`  ❌ Failed to load: ${response?.status()} ${response?.statusText()}`);
        return;
      }
      
      console.log(`  ✅ Loaded successfully`);
      
      // Wait for initial content
      await page.waitForTimeout(2000);
      
      // Test interactive elements
      await this.testInteractiveElements(page, portal);
      
      // Find and crawl links
      await this.crawlLinks(page, portal);
      
    } catch (error) {
      this.errors.push({
        portal: portal.name,
        url: url,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  async testInteractiveElements(page, portal) {
    console.log(`  🔍 Testing interactive elements...`);
    
    // Test all buttons
    const buttons = await page.$$('[role="button"], button');
    console.log(`    Found ${buttons.length} buttons`);
    
    for (let i = 0; i < buttons.length; i++) {
      try {
        const button = buttons[i];
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        
        if (isVisible && !text?.includes('Logout')) {
          console.log(`    Testing button: "${text?.trim()}"`);
          
          // Click with error handling
          await Promise.race([
            button.click({ trial: true }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Click timeout')), 2000)
            )
          ]);
        }
      } catch (error) {
        this.actionErrors.push({
          portal: portal.name,
          element: 'button',
          index: i,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Test form inputs
    const inputs = await page.$$('input:not([type="hidden"]), select, textarea');
    console.log(`    Found ${inputs.length} form inputs`);
    
    for (let i = 0; i < inputs.length; i++) {
      try {
        const input = await inputs[i];
        const type = await input.getAttribute('type');
        const isVisible = await input.isVisible();
        
        if (isVisible) {
          // Test focus
          await input.focus();
          
          // Test typing for text inputs
          if (!type || type === 'text' || type === 'email' || type === 'password') {
            await input.type('test', { delay: 10 });
            await input.fill('');
          }
        }
      } catch (error) {
        this.actionErrors.push({
          portal: portal.name,
          element: 'input',
          index: i,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Test links
    const links = await page.$$('a[href], [role="link"]');
    console.log(`    Found ${links.length} links`);

    for (let i = 0; i < Math.min(links.length, 3); i++) {
      try {
        const link = links[i];
        const href = await link.getAttribute('href');
        const isVisible = await link.isVisible();
        
        if (isVisible && href && !href.startsWith('http') && !href.startsWith('#')) {
          console.log(`    Testing link: ${href}`);
          
          // Test hover
          await link.hover();
          await page.waitForTimeout(100);
        }
      } catch (error) {
        this.actionErrors.push({
          portal: portal.name,
          element: 'link',
          index: i,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  async crawlLinks(page, portal) {
    // Get all internal links
    const links = await page.$$eval('a[href]', links => 
      links.map(link => ({
        href: link.href,
        text: link.textContent.trim()
      }))
      .filter(link => 
        link.href && 
        !link.href.startsWith('http') && 
        !link.href.includes('mailto:') &&
        !link.href.includes('tel:')
      )
    );
    
    console.log(`  📎 Found ${links.length} internal links`);
    
    // Visit unique links (limit to prevent infinite crawling)
    const uniqueLinks = [...new Set(links.map(l => l.href))].slice(0, 10);
    
    for (const link of uniqueLinks) {
      if (!this.visitedUrls.has(link)) {
        this.visitedUrls.add(link);
        console.log(`    Visiting: ${link}`);
        
        try {
          await page.goto(link, { 
            waitUntil: 'domcontentloaded',
            timeout: 10000 
          });
          await page.waitForTimeout(1000);
        } catch (error) {
          this.networkFailures.push({
            url: link,
            portal: portal.name,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }

  async generateReport() {
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        baseUrl: this.baseUrl,
        portalsChecked: this.portals.length,
        urlsVisited: this.visitedUrls.size,
        totalErrors: this.errors.length + this.consoleErrors.length + 
                     this.networkFailures.length + this.actionErrors.length
      },
      errors: {
        pageErrors: this.errors,
        consoleErrors: this.consoleErrors,
        networkFailures: this.networkFailures,
        actionErrors: this.actionErrors
      },
      portals: this.portals.map(portal => ({
        ...portal,
        visited: this.visitedUrls.has(`${this.baseUrl}${portal.path}`)
      })),
      visitedUrls: Array.from(this.visitedUrls)
    };
    
    // Add source file analysis
    report.suspectFiles = this.analyzeSuspectFiles();
    
    return report;
  }

  analyzeSuspectFiles() {
    const fileMap = new Map();
    
    // Analyze console errors
    this.consoleErrors.forEach(error => {
      const file = this.extractFileName(error.url);
      if (file) {
        if (!fileMap.has(file)) {
          fileMap.set(file, { errors: [], lines: new Set() });
        }
        fileMap.get(file).errors.push(error);
        if (error.lineNumber) {
          fileMap.get(file).lines.add(error.lineNumber);
        }
      }
    });
    
    // Analyze page errors
    this.errors.forEach(error => {
      if (error.file && error.file !== 'unknown') {
        const file = this.extractFileName(error.file);
        if (file) {
          if (!fileMap.has(file)) {
            fileMap.set(file, { errors: [], lines: new Set() });
          }
          fileMap.get(file).errors.push(error);
          if (error.line) {
            fileMap.get(file).lines.add(error.line);
          }
        }
      }
    });
    
    // Convert to array with file:line format
    const suspects = [];
    fileMap.forEach((data, file) => {
      const lines = Array.from(data.lines).sort((a, b) => a - b);
      suspects.push({
        file: file,
        errorCount: data.errors.length,
        lines: lines,
        fileLineRefs: lines.map(line => `${file}:${line}`)
      });
    });
    
    return suspects.sort((a, b) => b.errorCount - a.errorCount);
  }

  extractFileName(url) {
    if (!url) return null;
    
    // Remove query params and hash
    let cleanUrl = url.split('?')[0].split('#')[0];
    
    // Extract path from full URL
    if (cleanUrl.startsWith('http')) {
      try {
        const urlObj = new URL(cleanUrl);
        cleanUrl = urlObj.pathname;
      } catch {
        // Invalid URL, use as is
      }
    }
    
    // Remove leading slash
    if (cleanUrl.startsWith('/')) {
      cleanUrl = cleanUrl.substring(1);
    }
    
    // Return if it looks like a file path
    if (cleanUrl && (cleanUrl.includes('.') || cleanUrl.includes('/'))) {
      return cleanUrl;
    }
    
    return null;
  }
}

// Export for use in other scripts
module.exports = InsurancePortalCrawler;

// Run if called directly
if (require.main === module) {
  const crawler = new InsurancePortalCrawler();
  crawler.start()
    .then(report => {
      console.log('\n📊 Audit Complete!');
      console.log(`Total errors found: ${report.summary.totalErrors}`);
      console.log(`Report saved to: ${path.join(__dirname, 'audit-report.json')}`);
      
      if (report.summary.totalErrors > 0) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Audit failed:', error);
      process.exit(1);
    });
}