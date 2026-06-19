# @dsg/browserbase-automation

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
