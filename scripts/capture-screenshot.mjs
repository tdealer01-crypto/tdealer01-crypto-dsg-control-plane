#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';

const targetUrl = process.argv[2] || 'http://127.0.0.1:3000';
const outputPath = process.argv[3] || 'artifacts/screenshot.png';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

async function launchBrowser() {
  try {
    return await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Executable doesn't exist")) {
      throw error;
    }

    console.warn('Chromium executable missing. Installing Playwright headless shell...');
    try {
      execSync('npx playwright install --only-shell chromium', { stdio: 'inherit' });
    } catch (installError) {
      throw new Error(
        `Unable to install Chromium automatically. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to a local browser binary or allow access to Playwright CDN. Root cause: ${
          installError instanceof Error ? installError.message : String(installError)
        }`,
      );
    }

    return chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
  }
}

const browser = await launchBrowser();

try {
  await mkdir(dirname(outputPath), { recursive: true });
  const page = await browser.newPage();
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log(`Saved screenshot: ${outputPath}`);
} finally {
  await browser.close();
}
