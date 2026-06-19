# @dsg/browserbase-automation

Browserbase automation service package for lead generation, scraping, testing, and monitoring.

This package wraps Browserbase Stagehand into reusable scripts and a CLI under one consistent env contract:
- `BROWSERBASE_PROJECT_ID`
- `BROWSERBASE_API_KEY`

## Scripts

- `npm run lead-gen` — collect leads from a listing page
- `npm run scrape` — extract content by selector
- `npm run monitor` — page health/readiness sample
- `npm run form-fill` — fill and optionally submit a form
- `npm run screenshot` — full-page screenshot capture

## Example usage

```bash
export BROWSERBASE_PROJECT_ID="your-project-id"
export BROWSERBASE_API_KEY="your-api-key"

npm run lead-gen -- \
  --url "https://example.com/companies" \
  --list-selector ".company-card" \
  --item-selectors '{"name":".name","website":".website"}' \
  --max-items 20
```

## Output

Each command prints a JSON result plus a Browserbase recording URL:
```
https://browserbase.com/sessions/<sessionId>
```
