# Neon PostgreSQL Integration Guide

This guide explains how to set up Neon PostgreSQL for the DSG control plane, either as a production database or for testing/development.

## Overview

Neon is a serverless PostgreSQL platform that provides:
- Auto-scaling compute
- Branching for safe schema changes
- Connection pooling for serverless environments
- Vercel integration for automated environment setup

The DSG control plane supports both **Supabase** (current primary) and **Neon** for PostgreSQL database backends.

## Setup Steps

### 1. Create a Neon Project

1. Visit [console.neon.tech](https://console.neon.tech)
2. Create a new project (or select existing project)
3. Note your project credentials:
   - **Project ID**: `<your-project-id>`
   - **Database Name**: `neondb` (default)
   - **Role**: `neondb_owner` (default)

### 2. Generate Neon Connection Strings

#### Option A: Neon Dashboard

1. Go to **Project** → **Database**
2. Select your role and find the connection string
3. Two connection types:
   - **Direct**: For standard PostgreSQL clients
   - **Pooled**: For serverless/lambda functions (recommended)

#### Option B: Neon CLI

```bash
# Install Neon CLI
npm install -g neon

# Get connection strings
neon projects list
neon connection-string <project-id>
```

### 3. Environment Variables

Add to `.env` or Vercel project settings:

```bash
# Primary Neon connection (direct)
NEON_PG_CONNECTION_STRING=postgresql://[user]:[password]@[host]/[database]

# Pooled connection (recommended for serverless)
NEON_PG_POOLED_CONNECTION_STRING=postgresql://[user]:[password]@[host]:6432/[database]

# Neon API key (optional, for programmatic operations)
NEON_API_KEY=<your-neon-api-key>

# Neon project ID (optional)
NEON_PROJECT_ID=<your-project-id>
```

### 4. Vercel Integration (Recommended)

1. **Install Neon Integration in Vercel:**
   - Go to Vercel Dashboard → Integrations
   - Search for "Neon"
   - Click "Install"
   - Authorize Neon account

2. **Add Integration to Project:**
   - Select project: `tdealer01-crypto-dsg-control-plane`
   - Database branching options:
     - ✅ **Production**: Create branch for production deployments
     - ✅ **Preview**: Create branches for preview deployments
   - Custom prefix: `neon_pg` (or your preference, letters/digits/underscores only)
   - Leave "Sensitive" unchecked

3. **Vercel Auto-Configuration:**
   Environment variables automatically created:
   - `NEON_PG_CONNECTION_STRING` — production
   - `NEON_PG_POOLED_CONNECTION_STRING` — pooled (recommended)
   - `NEON_PG_DATABASE_URL` — alternate naming

### 5. Run Migrations

#### Supabase-to-Neon Migration

If migrating from Supabase to Neon:

```bash
# 1. Dump Supabase schema
pg_dump --no-owner --no-privileges \
  postgresql://[supabase_user]:[password]@[supabase_host]/postgres \
  > schema.sql

# 2. Apply to Neon
psql $NEON_PG_CONNECTION_STRING < schema.sql
```

#### Fresh Neon Setup

For new Neon databases, apply existing DSG migrations:

```bash
# 1. Install Supabase CLI (if not already installed)
npm install -g supabase

# 2. Apply migrations to Neon
npx supabase db push \
  --db-url $NEON_PG_CONNECTION_STRING
```

Or manually run migrations:

```bash
# Connect to Neon and run SQL migrations from supabase/migrations/
psql $NEON_PG_CONNECTION_STRING \
  -f supabase/migrations/001_initial_schema.sql
```

### 6. Test Configuration

```bash
# Test connection
psql $NEON_PG_POOLED_CONNECTION_STRING -c "SELECT version();"

# Run DSG migration tests
npm run test:migrations
```

## Configuration Options

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEON_PG_CONNECTION_STRING` | Direct connection (non-pooled) | `postgresql://user:pass@host/db` |
| `NEON_PG_POOLED_CONNECTION_STRING` | PgBouncer pooled connection | `postgresql://user:pass@host:6432/db` |
| `NEON_API_KEY` | Neon API access (optional) | `pne_...` |
| `NEON_PROJECT_ID` | Neon project ID (optional) | `xyz123` |

### CI/CD Configuration

All GitHub workflows automatically support Neon:

- `.github/workflows/ci.yml`
- `.github/workflows/production-quality-gates.yml`
- `.github/workflows/m1-go-no-go.yml`
- `.github/workflows/restore-production-readiness.yml`

To enable Neon in CI:

1. **Add GitHub secrets:**
   ```
   NEON_PG_CONNECTION_STRING
   NEON_PG_POOLED_CONNECTION_STRING
   NEON_API_KEY (optional)
   ```

2. **Workflows automatically detect and use** Neon connection strings when secrets are set

## Supabase vs Neon Comparison

| Feature | Supabase | Neon |
|---------|----------|------|
| **PostgreSQL Version** | Latest | Latest |
| **Auth Support** | Built-in | Manual (JWT) |
| **Real-time API** | ✅ Included | ❌ Not included |
| **Serverless** | ✅ Native | ✅ Native |
| **Branch Support** | ❌ Limited | ✅ Full branching |
| **Vercel Integration** | ✅ Via env | ✅ Native marketplace |
| **Connection Pooling** | PgBouncer | PgBouncer |

## Troubleshooting

### Connection Refused

```bash
# Check Neon status
curl -s https://neon.tech/status | jq .

# Verify credentials
psql postgresql://user:pass@host/db -c "SELECT 1;"
```

### Pooled vs Direct Connection

- **Use Pooled** (`host:6432`): Serverless functions, short-lived connections
- **Use Direct** (`host:5432`): Long-running processes, persistent connections

### SSL/TLS Errors

Neon requires SSL. Add to connection string:

```
?sslmode=require
```

Or set environment variable:

```bash
export PGSSLMODE=require
```

## Next Steps

1. ✅ Create Neon project and get connection strings
2. ✅ Add environment variables to Vercel and local `.env`
3. ✅ Run migrations: `npm run test:migrations`
4. ✅ Verify CI passes with Neon secrets
5. ✅ Monitor Neon dashboard for performance

## Resources

- [Neon Documentation](https://neon.tech/docs)
- [Neon Vercel Integration](https://neon.tech/docs/guides/vercel)
- [Connection String Guide](https://neon.tech/docs/connect/connect-from-any-app)
- [Branching for Deployments](https://neon.tech/docs/guides/branching-neon-postgres)
