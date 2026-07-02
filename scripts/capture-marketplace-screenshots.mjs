#!/usr/bin/env node

/**
 * Capture marketplace screenshots from live Vercel deployment
 * Using Node.js ESM (no TypeScript needed)
 *
 * Usage: node scripts/capture-marketplace-screenshots.mjs
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';
const MARKETPLACE_ASSETS_DIR = resolve(__dirname, '../marketplace-assets');
const SCREENSHOT_WIDTH = 1280;
const SCREENSHOT_HEIGHT = 720;

const screenshots = [
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

  // Ensure marketplace-assets directory exists
  try {
    mkdirSync(MARKETPLACE_ASSETS_DIR, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }

  // Use pre-installed chromium at /opt/pw-browsers
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    headless: true,
  });

  try {
    for (const spec of screenshots) {
      const fullUrl = `${BASE_URL}${spec.path}`;
      console.log(`📸 Capturing: ${spec.title}`);
      console.log(`   URL: ${fullUrl}`);

      try {
        const page = await browser.newPage({
          viewport: { width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT },
        });

        // Set longer timeout for slow network
        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(30000);

        // Navigate to the page
        try {
          await page.goto(fullUrl, { waitUntil: 'load' });
        } catch (navError) {
          console.log(`   ⚠️  Navigation warning: ${navError.message}`);
          // Continue anyway - page might be partially loaded
        }

        // Wait for content to render
        await page.waitForTimeout(1500);

        // Inject header overlay with title
        await page.evaluate((title) => {
          // Remove any existing headers
          const existing = document.querySelector('[data-screenshot-header]');
          if (existing) existing.remove();

          // Create new header
          const header = document.createElement('div');
          header.setAttribute('data-screenshot-header', 'true');
          header.style.cssText = `
            position: fixed;
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
            z-index: 99999;
            font-family: system-ui, -apple-system, sans-serif;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          `;
          header.textContent = title;
          document.body.style.paddingTop = '80px';
          document.body.prepend(header);
        }, spec.title);

        // Take screenshot
        const screenshotPath = `${MARKETPLACE_ASSETS_DIR}/${spec.filename}`;
        const buffer = await page.screenshot({ fullPage: false });
        writeFileSync(screenshotPath, buffer);

        console.log(`   ✅ Saved: ${spec.filename} (${buffer.length} bytes)\n`);
        await page.close();
      } catch (error) {
        console.log(`   ⚠️  Error capturing ${spec.filename}:`);
        console.log(`       ${error.message}`);
        console.log(`   📝 Creating fallback placeholder...\n`);

        // Create fallback placeholder
        await createFallbackScreenshot(
          `${MARKETPLACE_ASSETS_DIR}/${spec.filename}`,
          spec.title
        );
      }
    }

    console.log('✅ Screenshot capture complete!\n');
    console.log('📋 Screenshots saved to:');
    console.log(`   ${MARKETPLACE_ASSETS_DIR}/\n`);
    console.log('🚀 Next steps:');
    console.log('   1. Review screenshots');
    console.log('   2. Upload to GitHub Marketplace');
    console.log('   3. Submit for review');
  } finally {
    await browser.close();
  }
}

async function createFallbackScreenshot(filepath, title) {
  // Create a simple PNG placeholder using sharp
  try {
    const sharp = (await import('sharp')).default;

    const svg = `
<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0096c8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00d4ff;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="#192337"/>
  <rect width="1280" height="80" fill="url(#grad1)"/>
  <text x="640" y="50" font-family="Arial, sans-serif" font-size="32" font-weight="bold" text-anchor="middle" fill="white">${title}</text>
  <g stroke="#324860" stroke-width="1" opacity="0.5">
    ${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 64}" y1="80" x2="${i * 64}" y2="720"/>`).join('')}
    ${Array.from({ length: 10 }, (_, i) => `<line x1="0" y1="${80 + i * 64}" x2="1280" y2="${80 + i * 64}"/>`).join('')}
  </g>
</svg>
    `.trim();

    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    writeFileSync(filepath, buffer);
    console.log(`   ✅ Fallback created: ${filepath.split('/').pop()}\n`);
  } catch (e) {
    console.log(`   ❌ Could not create fallback: ${e.message}\n`);
  }
}

// Run the script
captureScreenshots().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
