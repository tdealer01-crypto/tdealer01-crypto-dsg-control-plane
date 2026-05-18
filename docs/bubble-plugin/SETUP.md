# DSG ONE Bubble Plugin — Setup Guide

## What it does

This plugin adds a **Generate App** element to your Bubble page.
When clicked it calls DSG ONE, generates a full Next.js CRUD app
connected to your Bubble data, and embeds the result as an iframe.

## Step 1 — Create plugin in Bubble

1. In your Bubble app go to **Plugins → Add plugins → Build a plugin**
2. Name it **DSG ONE Generator**
3. Go to **Elements** tab → **Add a new element** → name it **DSG Generator**

## Step 2 — Add properties

In the element editor add these **Properties**:

| Name | Type | Caption |
|---|---|---|
| `dsg_api_url` | text | DSG API URL |
| `bubble_domain` | text | Bubble App Domain |
| `data_type` | text | Data Type Name |
| `fields` | text | Fields (name:type,...) |
| `button_label` | text | Button Label |
| `frame_height` | number | Frame Height (px) |

## Step 3 — Add states

In **States** tab add:

| Name | Type |
|---|---|
| `deploy_url` | text |
| `job_id` | text |
| `job_status` | text |

## Step 4 — Add events

In **Events** tab add:
- `job_created`
- `job_completed`
- `job_failed`

## Step 5 — Paste plugin code

- **Initialize** tab → paste contents of `plugin.js`
- **Update** tab → paste contents of `update.js`

## Step 6 — Configure in Bubble editor

Drag the **DSG Generator** element onto your page and fill in properties:

```
DSG API URL:      https://tdealer01-crypto-dsg-control-plane.vercel.app
Bubble App Domain: myapp.bubbleapps.io
Data Type Name:   Product
Fields:           name:text,price:number,description:text,image_url:text
Button Label:     Generate App
Frame Height:     600
```

### Fields format

Comma-separated list of `fieldname:type` pairs:
```
name:text,price:number,is_active:boolean,created_date:date
```

Supported types: `text`, `number`, `boolean`, `date`, `image`, `file`

## Step 7 — Authentication

The plugin calls the control-plane API using the user's session cookie
(`credentials: 'include'`). The user must be logged in to your Bubble app
**and** have a DSG ONE account with the same email.

If users are not authenticated with DSG ONE, the Generate button will
return a 401 error. Add a redirect to the DSG ONE login page for those users.

## How it works end-to-end

```
Bubble page
  → DSG Generator element (iframe)
    → POST /api/dsg-bridge/bubble  (control-plane)
      → POST /api/dsg/bubble        (dsg-one-v1)
        → createRuntimeJob()        (Supabase)
          → job ID returned
  → poll /api/dsg-bridge/jobs/:id every 5s
  → when completed → embed deploy URL as iframe
```

## Troubleshooting

| Error | Fix |
|---|---|
| 401 Unauthorized | User not logged in to DSG ONE |
| 503 DSG workspace not configured | Set `DSG_ONE_V1_WORKSPACE_ID` in control-plane Vercel |
| 502 Bridge failed | Check `DSG_ONE_V1_URL` in control-plane Vercel |
| Missing configuration | Fill all 4 required properties in Bubble editor |
