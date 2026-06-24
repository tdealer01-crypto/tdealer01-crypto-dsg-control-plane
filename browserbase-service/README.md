# @dsg/browserbase-automation

<<<<<<< HEAD
Browserbase automation service package for lead generation, scraping, testing, and monitoring.

## Environment

- `BROWSERBASE_PROJECT_ID`
- `BROWSERBASE_API_KEY`

## Usage — CLI

```bash
npm run lead-gen -- \
  --url "https://example.com/companies" \
  --list-selector ".company-card" \
  --item-selectors '{"name":".name","website":".website"}' \
  --max-items 20
```

## Usage — MCP server

Start the MCP stdio server:

```bash
npm run mcp
```

Then configure this server in your MCP client. Exposed tools:

- `browser_navigate`
- `browser_screenshot`
- `browser_click`
- `browser_scrape`
- `browser_lead_gen`
- `browser_monitor`
- `browser_form_fill`

Valid credentials are required. Actual browser execution depends on the runtime platform (Stagehand/Playwright-supported environment).
=======
Browserbase automation service package for lead generation, web scraping, testing, monitoring, and form automation.

## Features

- 🚀 **Navigate & Screenshot** - Full-page screenshots, PDF generation
- 🖱️ **Click & Interact** - Element clicking, form filling, navigation
- 📊 **Scrape & Extract** - HTML extraction, structured data, pagination
- 📝 **Form Automation** - Login, registration, data submission
- 🔍 **Monitor & Watch** - Change detection, status monitoring
- 🎯 **Lead Generation** - Multi-source data extraction with pagination
- 📹 **Session Recording** - Every session recorded at browserbase.com

## Installation

```bash
cd browserbase-service
npm install
npm run build
```

## Environment Variables

```bash
# Required
export BROWSERBASE_API_KEY="bb_live_xxx"
export BROWSERBASE_PROJECT_ID="xxx-xxx-xxx"

# Optional (for Stagehand AI agent)
export ANTHROPIC_API_KEY="sk-ant-xxx"
# or
export OPENAI_API_KEY="sk-xxx"
```

## CLI Usage

```bash
# Navigate and screenshot
npm run dev -- navigate -u "https://example.com"

# Click element
npm run dev -- click -u "https://example.com" -s "button.submit"

# Scrape content
npm run dev -- scrape -u "https://example.com" -s "article"

# Fill form
npm run dev -- fill-form -u "https://example.com/login" -f '{"input[name=email]":"test@test.com","input[name=password]":"secret"}'

# Monitor for changes
npm run dev -- monitor -u "https://example.com" -s ".status-badge" -i 30000 -m 10

# Lead generation
npm run dev -- lead-gen -u "https://github.com/trending,https://news.ycombinator.com" -f '["h1","h2",".title"]'
```

## Programmatic Usage

```typescript
import {
  createStagehand,
  navigate,
  screenshot,
  click,
  scrape,
  fillForm,
  monitor,
  leadGen,
  closeStagehand
} from "@dsg/browserbase-automation";

async function example() {
  const { stagehand, page, session } = await createStagehand({
    browserSettings: { context: { persist: true } },
    model: "anthropic/claude-sonnet-4-6",
  });

  try {
    console.log(`📹 Session: https://browserbase.com/sessions/${session.id}`);

    // Navigate
    await navigate(page, { url: "https://example.com" });

    // Screenshot
    await screenshot(page, { fullPage: true, path: "./screenshot.png" });

    // Click
    await click(page, { selector: "a[href='/about']" });

    // Scrape
    const data = await scrape(page, {
      url: "https://example.com/blog",
      selector: ".post-title",
      waitForSelector: ".post-list",
    });

    // Form fill
    await fillForm(page, {
      url: "https://example.com/login",
      fields: {
        "input[name='email']": "user@example.com",
        "input[name='password']": "password123",
      },
      submitSelector: "button[type='submit']",
      waitAfterSubmit: true,
    });

    // Monitor changes
    await monitor(page, {
      url: "https://example.com/status",
      checkSelector: ".status-badge",
      intervalMs: 30000,
      maxChecks: 10,
      onChange: (change) => console.log("🔄 Changed:", change),
    });

    // Lead generation
    const leads = await leadGen(page, {
      urls: ["https://github.com/trending", "https://news.ycombinator.com"],
      extractFields: ["h1", "h2", ".title"],
      pagination: { nextSelector: "a[rel='next']", maxPages: 3 },
    });

  } finally {
    await closeStagehand(stagehand, session.id);
  }
}
```

## Pricing Tiers (Service Offering)

| Tier | Sessions/Month | Price | Features |
|------|---------------|-------|----------|
| **Starter** | 1,000 | $49/mo | Basic nav, screenshot, click |
| **Pro** | 10,000 | $199/mo | + Scrape, form fill, monitor |
| **Agency** | 50,000 | $499/mo | + Lead gen, pagination, concurrency |
| **Enterprise** | Custom | Custom | + Dedicated IP, SLA, custom scripts |

## Project Structure

```
browserbase-service/
├── src/
│   ├── client.ts          # Core Browserbase/Stagehand wrapper
│   ├── index.ts           # CLI entry point (commander)
│   └── utils/             # Helper functions
├── examples/
│   ├── basic-navigate.ts
│   ├── form-fill.ts
│   ├── lead-gen.ts
│   └── monitor.ts
├── dist/                  # Built output (after npm run build)
├── package.json
├── tsconfig.json
└── README.md
```

## Session Recordings

Every session is automatically recorded and available at:
```
https://browserbase.com/sessions/{sessionId}
```

## Development

```bash
# Install deps
npm install

# Watch mode
npm run dev

# Build
npm run build

# Run tests
npm test
```

## License

MIT
>>>>>>> origin/main
