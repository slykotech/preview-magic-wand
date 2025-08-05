// Puppeteer service for web scraping with anti-detection
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

export interface ScrapedEvent {
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  location_name: string;
  location_address?: string;
  city?: string;
  region?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  category: string;
  price_range?: string;
  organizer?: string;
  source_url: string;
  source_platform: string;
  image_url?: string;
  tags?: string[];
  venue_details?: Record<string, any>;
  expires_at: string;
}

export class PuppeteerBrowserService {
  private browser: any = null;
  private pagePool: any[] = [];
  private maxPages = 3;

  async launchBrowser() {
    if (this.browser) return this.browser;

    console.log('Launching Puppeteer browser...');
    
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        ],
        defaultViewport: { width: 1366, height: 768 }
      });
      
      console.log('Browser launched successfully');
      return this.browser;
    } catch (error) {
      console.error('Failed to launch browser:', error);
      throw error;
    }
  }

  async createPage() {
    await this.launchBrowser();
    
    if (this.pagePool.length > 0) {
      return this.pagePool.pop();
    }

    const page = await this.browser.newPage();
    
    // Anti-detection measures
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      delete (window as any).navigator.webdriver;
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
      
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
    });

    // Set random viewport
    const width = 1200 + Math.floor(Math.random() * 400);
    const height = 800 + Math.floor(Math.random() * 400);
    await page.setViewport({ width, height });

    // Set headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });

    return page;
  }

  async recyclePage(page: any) {
    if (this.pagePool.length < this.maxPages) {
      try {
        // Clear page state
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        
        this.pagePool.push(page);
      } catch (error) {
        console.error('Error recycling page:', error);
        await page.close().catch(() => {});
      }
    } else {
      await page.close().catch(() => {});
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.pagePool = [];
    }
  }

  async waitForSelector(page: any, selector: string, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      console.log(`Selector ${selector} not found within ${timeout}ms`);
      return false;
    }
  }

  async randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async extractText(page: any, selector: string): Promise<string | null> {
    try {
      const element = await page.$(selector);
      if (element) {
        return await page.evaluate((el: any) => el.textContent?.trim() || null, element);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async extractAttribute(page: any, selector: string, attribute: string): Promise<string | null> {
    try {
      const element = await page.$(selector);
      if (element) {
        return await page.evaluate(
          (el: any, attr: string) => el.getAttribute(attr),
          element,
          attribute
        );
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async extractMultiple(page: any, selector: string, textOnly = true): Promise<string[]> {
    try {
      const elements = await page.$$(selector);
      const results = [];
      
      for (const element of elements) {
        if (textOnly) {
          const text = await page.evaluate((el: any) => el.textContent?.trim(), element);
          if (text) results.push(text);
        } else {
          const html = await page.evaluate((el: any) => el.outerHTML, element);
          if (html) results.push(html);
        }
      }
      
      return results;
    } catch (error) {
      return [];
    }
  }

  parseDate(dateString: string): string | null {
    if (!dateString) return null;

    try {
      // Common date patterns
      const patterns = [
        /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i,
        /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/,
        /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
        /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
      ];

      const monthMap: Record<string, string> = {
        'jan': '01', 'january': '01', 'feb': '02', 'february': '02',
        'mar': '03', 'march': '03', 'apr': '04', 'april': '04',
        'may': '05', 'jun': '06', 'june': '06', 'jul': '07', 'july': '07',
        'aug': '08', 'august': '08', 'sep': '09', 'september': '09',
        'oct': '10', 'october': '10', 'nov': '11', 'november': '11',
        'dec': '12', 'december': '12'
      };

      for (const pattern of patterns) {
        const match = dateString.match(pattern);
        if (match) {
          if (pattern.source.includes('Jan|Feb')) {
            // Format: DD MMM YYYY
            const day = match[1].padStart(2, '0');
            const month = monthMap[match[2].toLowerCase()];
            const year = match[3];
            return `${year}-${month}-${day}`;
          } else if (pattern.source.includes('January|February')) {
            // Format: DD Month YYYY
            const day = match[1].padStart(2, '0');
            const month = monthMap[match[2].toLowerCase()];
            const year = match[3];
            return `${year}-${month}-${day}`;
          } else if (match[3] && match[3].length === 4) {
            // Format: MM/DD/YYYY or DD/MM/YYYY
            const day = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            const year = match[3];
            return `${year}-${month}-${day}`;
          } else if (match[1] && match[1].length === 4) {
            // Format: YYYY/MM/DD
            const year = match[1];
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        }
      }

      // Fallback to Date parsing
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      return null;
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return null;
    }
  }

  parsePrice(priceString: string): string | null {
    if (!priceString) return null;

    try {
      // Extract price patterns
      const patterns = [
        /₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)/,
        /\$\s*(\d+(?:\.\d{2})?)/,
        /(\d+(?:,\d+)*(?:\.\d{2})?)\s*₹/,
        /Free|FREE/i,
        /(\d+)\s*-\s*(\d+)/
      ];

      for (const pattern of patterns) {
        const match = priceString.match(pattern);
        if (match) {
          if (match[0].toLowerCase().includes('free')) {
            return 'Free';
          } else if (match[2]) {
            // Range pattern
            return `₹${match[1]} - ₹${match[2]}`;
          } else {
            return priceString.includes('₹') ? `₹${match[1]}` : `$${match[1]}`;
          }
        }
      }

      return priceString.trim();
    } catch (error) {
      return priceString?.trim() || null;
    }
  }
}

export default PuppeteerBrowserService;