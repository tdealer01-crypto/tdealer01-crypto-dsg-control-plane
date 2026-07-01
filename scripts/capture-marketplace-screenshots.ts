#!/usr/bin/env node

/**
 * Capture marketplace screenshots from live Vercel deployment
 *
 * Usage: npx ts-node scripts/capture-marketplace-screenshots.ts
 *
 * Captures screenshots of:
 * 1. Dashboard - /api/health
 * 2. Revenue - /api/usage
 * 3. Governance - /api/dsg/v1/gates/evaluate
 * 4. Proof - /api/dsg/v1/proofs/prove
 * 5. Pricing - /api/dsg/v1/pricing
 */

import { chromium } from 'playwright';
import { createWriteStream } from 'fs';
import { resolve } from 'path';

const BASE_URL = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';
const MARKETPLACE_ASSETS_DIR = resolve(__dirname, '../marketplace-assets');
const SCREENSHOT_WIDTH = 1280;
const SCREENSHOT_HEIGHT = 720;

type ScreenshotSpec = {
  filename: string;
  path: string;
  title: string;
};

const screenshots: ScreenshotSpec[] = [
  {
    filename: 'screenshot-1-dashboard.png',
    path: '/api/health',
    title: 'Dashboard - Health Status',
  },
  {
    filename: 'screenshot-2-revenue.png',
    path: '/api/usage',
    title: 'Revenue - Usage Metrics',
  },
  {
    filename: 'screenshot-3-governance.png',
    path: '/api/dsg/v1/gates/evaluate',
    title: 'Governance - Gate Evaluation',
  },
  {
    filename: 'screenshot-4-proof.png',
    path: '/api/dsg/v1/proofs/prove',
    title: 'Proof - Cryptographic Verification',
  },
  {
    filename: 'screenshot-5-pricing.png',
    path: '/api/dsg/v1/pricing',
    title: 'Pricing - Service Plans',
  },
];

async function captureScreenshots() {
  console.log('🎬 Starting marketplace screenshot capture...\n');

  const browser = await chromium.launch();
  const context = await browser.createBrowserContext({
    viewport: { width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT },
  });

  try {
    for (const spec of screenshots) {
      const fullUrl = `${BASE_URL}${spec.path}`;
      console.log(`📸 Capturing: ${spec.title}`);
      console.log(`   URL: ${fullUrl}`);

      try {
        const page = await context.newPage();

        // Navigate to the page
        await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for content to render
        await page.waitForTimeout(1000);

        // Inject custom header if needed for API endpoints
        await page.evaluate(() => {
          // Add title to page
          const title = document.createElement('div');
          title.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 80px;
            background: linear-gradient(135deg, #0096c8, #00d4ff);
            color: white;
            display: flex;
            align-items: center;
            padding: 0 20px;
            font-size: 24px;
            font-weight: bold;
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
          `;
          document.body.prepend(title);
        });

        // Take screenshot
        const screenshotPath = `${MARKETPLACE_ASSETS_DIR}/${spec.filename}`;
        await page.screenshot({ path: screenshotPath, fullPage: false });

        console.log(`   ✅ Saved: ${screenshotPath}\n`);
        await page.close();
      } catch (error) {
        console.log(`   ⚠️  Error capturing ${spec.filename}:`, error);
        console.log(`   📝 Creating fallback placeholder...\n`);

        // Create fallback placeholder
        await createFallbackScreenshot(
          `${MARKETPLACE_ASSETS_DIR}/${spec.filename}`,
          spec.title
        );
      }
    }

    console.log('✅ Screenshot capture complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Review screenshots in marketplace-assets/');
    console.log('   2. Upload to GitHub Marketplace');
    console.log('   3. Submit for review');
  } finally {
    await browser.close();
  }
}

async function createFallbackScreenshot(
  filepath: string,
  title: string
): Promise<void> {
  // Create a simple SVG placeholder if screenshot fails
  const svg = `
<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="720" fill="#192337"/>
  <rect width="1280" height="80" fill="#0096c8"/>
  <text x="640" y="50" font-family="Arial, sans-serif" font-size="32" font-weight="bold" text-anchor="middle" fill="white">${title}</text>
  <g stroke="#324860" stroke-width="1" opacity="0.5">
    ${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 64}" y1="80" x2="${i * 64}" y2="720"/>`).join('')}
    ${Array.from({ length: 10 }, (_, i) => `<line x1="0" y1="${80 + i * 64}" x2="1280" y2="${80 + i * 64}"/>`).join('')}
  </g>
</svg>
  `.trim();

  const png = await import('sharp').then((m) =>
    m.default(Buffer.from(svg)).png().toBuffer()
  );

  await new Promise((resolve, reject) => {
    createWriteStream(filepath).on('finish', resolve).on('error', reject).end(png);
  });
}

// Run if executed directly
if (require.main === module) {
  captureScreenshots().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { captureScreenshots };
