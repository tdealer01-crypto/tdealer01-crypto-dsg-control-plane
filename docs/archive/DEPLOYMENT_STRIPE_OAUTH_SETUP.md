# Stripe OAuth 2.0 Configuration Guide

This guide walks through setting up Stripe OAuth for account linking and third-party integrations in the DSG Control Plane.

## Overview

Stripe OAuth 2.0 enables your application to:

- **Request permission** to access customer Stripe accounts
- **Create connected accounts** for marketplace/sub-merchant scenarios
- **Integrate with third-party services** that need Stripe permissions
- **Initiate payments** on behalf of customers without storing their API keys

This is distinct from webhook signing; it enables account-to-account authorization flows.

**Current Production URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## 1. OAuth 2.0 Configuration in Stripe Dashboard

### 1.1 Navigate to OAuth Settings

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Settings** (gear icon, top right)
3. Click **Connected accounts** (left sidebar) or search "OAuth"
4. You'll see:
   - **Application name** — your app's display name in Stripe's consent screen
   - **Redirect URIs** — where to return after authorization
   - **Scopes** — permissions your app requests
   - **Client ID** and **Client Secret** — credentials for token exchange

### 1.2 Create or Update OAuth Application

If this is your first OAuth setup:

1. In Stripe Settings → **Connected accounts** (or API keys section)
2. Look for **OAuth** configuration area
3. Click **+ Create application** or **Enable OAuth**
4. Fill in application details

---

## 2. Client ID and Client Secret Generation

### 2.1 View Credentials

In **Settings → OAuth** (or **Connected accounts**):

1. **Client ID** — Publicly visible identifier (safe to share, embed in frontend)
   - Format: `ca_xxxxxxxxxxxxxxxxxxxxxxxx`
   - Display to users; use in authorization URLs

2. **Client Secret** — Sensitive credential (must keep secret)
   - Format: `[YOUR_TEST_KEY]` or `[YOUR_SECRET_KEY]`
   - Use only on server-side for token exchange
   - Never commit or expose to frontend

### 2.2 Rotate Credentials (if compromised)

1. In Stripe Settings → **OAuth**
2. Click **Regenerate secret** (if available) or create a new OAuth app
3. Update environment variables immediately after rotation
4. Remove old credentials from all environments

### 2.3 Store Credentials Securely

#### For Development (`.env.local`)

```bash
STRIPE_OAUTH_CLIENT_ID=ca_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_OAUTH_CLIENT_SECRET=[YOUR_TEST_KEY]
```

#### For Vercel (Environment Variables)

1. Go to Vercel Project Settings → Environment Variables
2. Add two variables:
   ```
   Name: STRIPE_OAUTH_CLIENT_ID
   Value: ca_xxxxxxxxxxxxxxxxxxxxxxxx
   Environment: Preview, Production
   
   Name: STRIPE_OAUTH_CLIENT_SECRET
   Value: [YOUR_TEST_KEY]
   Environment: Preview (for staging)
   
   Name: STRIPE_OAUTH_CLIENT_SECRET
   Value: [YOUR_SECRET_KEY]
   Environment: Production
   ```
3. Click **Save** for each
4. Redeploy application

---

## 3. Redirect URI Configuration

Stripe will return the user to your application after they authorize access. You must register these URLs in advance.

### 3.1 Approved Redirect URIs

Register **both** of these URIs in Stripe Dashboard:

```
https://[YOUR_VERCEL_URL]/api/stripe/oauth/callback
https://[YOUR_VERCEL_URL]/stripe/oauth/callback
```

Replace `[YOUR_VERCEL_URL]` with your actual domain:

- **Development:** `http://localhost:3000`
  - `http://localhost:3000/api/stripe/oauth/callback`
  - `http://localhost:3000/stripe/oauth/callback`

- **Staging/Preview:**
  - `https://[preview-hash].vercel.app/api/stripe/oauth/callback`
  - `https://[preview-hash].vercel.app/stripe/oauth/callback`

- **Production:**
  - `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/oauth/callback`
  - `https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback`

### 3.2 Register in Stripe Dashboard

1. Go to **Settings → Connected accounts** (or **OAuth** section)
2. Click **Add redirect URI** (or edit existing list)
3. Enter the first URI: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/oauth/callback`
4. Click **Add redirect URI** again
5. Enter the second URI: `https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback`
6. Click **Save** or **Update**

**Why two URIs?**

- `/api/stripe/oauth/callback` — server API route (preferred for token exchange)
- `/stripe/oauth/callback` — frontend page route (alternative path for compatibility)

Register both so either can receive the callback.

### 3.3 Verify Redirect Matching

Stripe performs **exact string matching** on redirect URIs:

- Case-sensitive: `https://example.com/Callback` ≠ `https://example.com/callback`
- Trailing slash: `https://example.com/callback` ≠ `https://example.com/callback/`
- Query params: Not allowed in redirect URI registration; can be in auth request
- Fragments: Not used by OAuth (fragments aren't sent to server)

**Test redirect URI:**

```bash
curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/oauth/callback
# Should return 405 (Method Not Allowed) or 200
# Not 404 (which means URI doesn't exist)
```

---

## 4. PKCE (Proof Key for Public Clients)

**PKCE** (Proof Key for Code Exchange) adds security for native mobile and single-page apps that cannot keep a client secret.

### 4.1 When to Use PKCE

**Use PKCE if:**

- Your OAuth flow runs in a browser (single-page app, frontend JavaScript)
- You cannot securely store `client_secret` on the client
- You need extra protection against authorization code interception

**Skip PKCE if:**

- Authorization flows run only on your server (recommended for DSG Control Plane)
- You have a backend that keeps `client_secret` private

### 4.2 PKCE Flow (for reference)

If implementing PKCE:

1. **Generate code verifier** (random 43-128 character string):
   ```typescript
   const codeVerifier = crypto.randomUUID().replace(/-/g, '').substring(0, 128);
   ```

2. **Generate code challenge** (SHA256 hash of verifier, base64url encoded):
   ```typescript
   import crypto from 'crypto';
   const challenge = crypto
     .createHash('sha256')
     .update(codeVerifier)
     .digest('base64url');
   ```

3. **Send code_challenge in auth request:**
   ```
   GET /oauth/authorize
     ?client_id=ca_xxx
     &code_challenge=<base64url_sha256(verifier)>
     &code_challenge_method=S256
   ```

4. **Exchange code for token, include code_verifier:**
   ```
   POST /oauth/token
     code=auth_code
     client_id=ca_xxx
     code_verifier=<original_verifier>
   ```

For DSG Control Plane, store `code_verifier` in server session or Redis temporarily.

---

## 5. State Parameter Security

The **state parameter** prevents CSRF attacks in OAuth flows.

### 5.1 State Parameter Best Practices

1. **Generate random state before redirecting to Stripe:**
   ```typescript
   const state = crypto.randomUUID();
   // or
   const state = require('crypto').randomBytes(32).toString('hex');
   ```

2. **Store state in session/Redis** (with expiration):
   ```typescript
   // In authorization request handler
   const state = crypto.randomUUID();
   await redis.setex(`oauth_state_${state}`, 600, userId); // 10-minute TTL
   ```

3. **Include state in authorization URL:**
   ```
   https://connect.stripe.com/oauth/authorize
     ?client_id=ca_xxx
     &state=${state}
   ```

4. **Verify state in callback handler:**
   ```typescript
   // In callback handler
   const { code, state } = req.query;
   const storedUserId = await redis.get(`oauth_state_${state}`);
   if (!storedUserId) throw new Error('Invalid state parameter');
   ```

5. **Delete state after use** to prevent replay:
   ```typescript
   await redis.del(`oauth_state_${state}`);
   ```

### 5.2 Anti-CSRF Measures

- State parameter must be **cryptographically random**
- State must be **unique per request** (not hardcoded)
- State must be **short-lived** (seconds to minutes, not hours)
- State must be **validated before token exchange**
- Use **HTTPS only** (Stripe enforces this)

---

## 6. Token Storage in Supabase (Encrypted)

After successful OAuth flow, you receive an access token. Store it securely.

### 6.1 Schema: Stripe OAuth Tokens Table

Create or review the `stripe_oauth_tokens` table:

```sql
CREATE TABLE IF NOT EXISTS stripe_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE, -- e.g., acct_xxxxx
  access_token TEXT NOT NULL,             -- encrypted in app layer
  refresh_token TEXT,                     -- nullable; for offline access
  scope TEXT,                             -- space-separated permissions
  stripe_user_id TEXT,                    -- user identifier from Stripe
  token_type TEXT DEFAULT 'bearer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                 -- if token has expiration
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT org_stripe_account_unique UNIQUE(org_id, stripe_account_id)
);

CREATE INDEX ON stripe_oauth_tokens(org_id);
CREATE INDEX ON stripe_oauth_tokens(stripe_account_id);
```

### 6.2 Encryption Best Practices

**Never store access tokens in plaintext.** Encrypt them:

#### Server-Side Encryption (Recommended)

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.STRIPE_TOKEN_ENCRYPTION_KEY; // 32-byte hex

function encryptToken(plaintext: string): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

function decryptToken(encrypted: string, iv: string, authTag: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  return decipher.update(encrypted, 'hex', 'utf-8') + decipher.final('utf-8');
}
```

Store encrypted token, IV, and auth tag:

```typescript
const { encrypted, iv, authTag } = encryptToken(accessToken);
await supabase.from('stripe_oauth_tokens').insert({
  org_id: orgId,
  stripe_account_id: accountId,
  access_token: encrypted,
  iv,                     // needed for decryption
  authTag,                // needed for decryption
  scope,
  created_at: new Date(),
});
```

#### Supabase Vault (Alternative)

Supabase also provides encrypted secrets storage:

```sql
-- Use Supabase pgsodium extension (if enabled)
SELECT vault.create_secret(plaintext_token, 'stripe_token');
```

Consult your Supabase project's encryption settings.

### 6.3 Token Retrieval

When you need to call Stripe on behalf of the user:

```typescript
const { data } = await supabase
  .from('stripe_oauth_tokens')
  .select('access_token, iv, authTag')
  .eq('org_id', orgId)
  .single();

const token = decryptToken(data.access_token, data.iv, data.authTag);
const stripeConnected = new Stripe(token);
// Now use stripeConnected to make API calls on behalf of the account
```

---

## 7. Account Linking Flow Validation

### 7.1 OAuth Authorization Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "Link Stripe Account" in DSG Dashboard       │
│                                                              │
│ 2. Frontend POST /api/stripe/oauth/authorize                │
│    → Server generates state + PKCE verifier                │
│    → Stores state in Redis (10-minute TTL)                 │
│    → Redirects to Stripe authorization endpoint             │
│                                                              │
│ 3. User logs in to Stripe and grants permissions            │
│                                                              │
│ 4. Stripe redirects to:                                     │
│    https://tdealer01-crypto-dsg-control-plane.vercel.app   │
│    /api/stripe/oauth/callback                              │
│    ?code=<auth_code>&state=<state>                         │
│                                                              │
│ 5. Server validates state, exchanges code for token         │
│    POST https://connect.stripe.com/oauth/token              │
│    {code, client_id, client_secret, code_verifier}         │
│                                                              │
│ 6. Stripe returns {access_token, stripe_account_id, ...}   │
│                                                              │
│ 7. Server encrypts + stores token in Supabase               │
│                                                              │
│ 8. Redirect user to success page                            │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Validation Checklist

- [ ] **State parameter matches** stored value in Redis/session
- [ ] **State is not expired** (< 10 minutes old)
- [ ] **Code is single-use** (don't exchange same code twice)
- [ ] **Token exchange uses correct client_secret** (for your environment)
- [ ] **Redirect URI matches** registered URI in Stripe
- [ ] **Access token stored encrypted** with proper IV and auth tag
- [ ] **User is authenticated** (session/cookie present) before linking
- [ ] **Org ownership verified** (token linked to correct org)

### 7.3 Test Authorization Flow

```bash
# 1. Initiate authorization
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/oauth/authorize \
  -H "content-type: application/json" \
  -d '{"orgId": "org-123"}' \
  -c cookies.txt

# 2. Follow the redirect to Stripe (manual step in browser)
# Use cookies.txt for session if needed

# 3. After Stripe redirects to callback, check for errors:
curl -b cookies.txt https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/oauth/callback \
  '?code=ca_xxx&state=xxx'

# 4. Verify token was stored:
curl -X GET https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/oauth/status \
  -H "authorization: Bearer <auth_token>" \
  -H "content-type: application/json"
```

---

## 8. Troubleshooting

### 8.1 "Redirect URI Mismatch"

**Error:** `error=redirect_uri_mismatch`

**Causes:**

1. Redirect URI not registered in Stripe Dashboard
2. Redirect URI has typo or case mismatch
3. Trailing slash mismatch (e.g., `/callback` vs `/callback/`)

**Solutions:**

1. Verify URI in Stripe Settings → Connected accounts → Redirect URIs:
   ```
   https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/oauth/callback
   https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback
   ```

2. Ensure exact match in authorization URL:
   ```typescript
   const redirectUri = 'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/oauth/callback';
   // Must match registered URI exactly (case-sensitive, no trailing slash if not registered)
   ```

3. Test redirect URI exists:
   ```bash
   curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/oauth/callback
   ```

### 8.2 "Invalid Client ID"

**Error:** `error=invalid_client`

**Causes:**

1. Client ID is wrong or expired
2. Client ID for wrong environment (test vs live)
3. Client ID format incorrect

**Solutions:**

1. Verify `STRIPE_OAUTH_CLIENT_ID` in environment variables:
   ```bash
   vercel env ls | grep STRIPE_OAUTH_CLIENT_ID
   ```

2. Confirm it matches Stripe Dashboard (Settings → OAuth → Client ID):
   - Should start with `ca_`
   - Should not be confused with publishable key (`pk_`) or secret key (`sk_`)

3. If using test credentials, ensure mode is `test`:
   ```bash
   # In Stripe Dashboard, top-left toggle should show "Test mode"
   ```

### 8.3 "Invalid State Parameter"

**Error:** `error=invalid_state` or missing state in callback

**Causes:**

1. State not stored before authorization
2. State expired (> 10 minute TTL)
3. State modified in URL
4. Browser cleared cookies/session

**Solutions:**

1. Ensure state is stored **before** redirecting to Stripe:
   ```typescript
   const state = crypto.randomUUID();
   await redis.setex(`oauth_state_${state}`, 600, userId);
   // Then redirect
   ```

2. Check TTL — increase if needed:
   ```typescript
   await redis.setex(`oauth_state_${state}`, 1800, userId); // 30 minutes
   ```

3. Verify state validation before token exchange:
   ```typescript
   const { state, code } = req.query;
   const userId = await redis.get(`oauth_state_${state}`);
   if (!userId) throw new Error('State expired or invalid');
   ```

### 8.4 "Token Exchange Failed"

**Error:** `error=invalid_code` or `error=invalid_grant`

**Causes:**

1. Authorization code is invalid or expired
2. Client secret is wrong
3. Code already exchanged (single-use)
4. Redirect URI in token request doesn't match authorization request

**Solutions:**

1. Ensure client secret matches environment:
   ```bash
   # For test mode:
   STRIPE_OAUTH_CLIENT_SECRET=[YOUR_TEST_KEY]
   # For live mode:
   STRIPE_OAUTH_CLIENT_SECRET=[YOUR_SECRET_KEY]
   ```

2. Verify redirect URI in token request matches authorization request:
   ```typescript
   // Authorization request
   redirectTo = `https://connect.stripe.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;

   // Token request — must use SAME redirectUri
   const response = await fetch('https://connect.stripe.com/oauth/token', {
     method: 'POST',
     headers: { 'content-type': 'application/x-www-form-urlencoded' },
     body: new URLSearchParams({
       code,
       client_id: clientId,
       client_secret: clientSecret,
       redirect_uri: redirectUri,  // Same as above
     }).toString(),
   });
   ```

3. Don't exchange same code twice:
   ```typescript
   // Delete code after use to prevent reuse
   await redis.del(`stripe_auth_code_${code}`);
   ```

### 8.5 "Decryption Failed" or Token Not Retrievable

**Error:** Token retrieved but cannot decrypt

**Causes:**

1. IV or auth tag corrupted
2. Encryption key changed
3. Token stored without encryption metadata

**Solutions:**

1. Store IV and auth tag alongside token:
   ```typescript
   const { encrypted, iv, authTag } = encryptToken(token);
   await supabase.from('stripe_oauth_tokens').insert({
     access_token: encrypted,
     iv,
     authTag,
   });
   ```

2. If encryption key rotated, re-encrypt all tokens:
   ```bash
   # Backup old tokens first
   # Decrypt with old key, encrypt with new key
   # Update records
   ```

3. Test decryption with known value:
   ```typescript
   const plaintext = '[YOUR_TEST_KEY]';
   const { encrypted, iv, authTag } = encryptToken(plaintext);
   const decrypted = decryptToken(encrypted, iv, authTag);
   console.assert(decrypted === plaintext, 'Encryption/decryption mismatch');
   ```

---

## 9. Monitoring & Alerts

### 9.1 OAuth Token Expiration

Some OAuth tokens expire after a period. Monitor expiration:

```typescript
// Check if token expired
if (new Date(tokenRecord.expires_at) < new Date()) {
  // Token expired; need to re-authorize or use refresh token
  if (tokenRecord.refresh_token) {
    // Exchange refresh token for new access token
    await refreshOAuthToken(tokenRecord.refresh_token);
  } else {
    // Require user to re-authorize
    return { error: 'reauthentication_required' };
  }
}
```

### 9.2 Audit Logging

Log all OAuth events:

```typescript
// In authorization initiation
console.log(`[STRIPE_OAUTH] Authorization initiated for org ${orgId}`);

// In callback
console.log(`[STRIPE_OAUTH] Token granted for account ${accountId}`, {
  orgId,
  accountId,
  scope,
  timestamp: new Date(),
});

// Token usage
console.log(`[STRIPE_OAUTH] Token used to call API`, {
  orgId,
  accountId,
  action: 'create_charge',
  timestamp: new Date(),
});
```

### 9.3 Stripe Event Monitoring

Monitor Stripe events for connected account changes:

- `account.updated` — account details changed
- `account.application.deauthorized` — user revoked access
- `application.authorization.updated` — scope changed

---

## 10. OAuth Revocation & Cleanup

### 10.1 User Revokes Access

When user disconnects Stripe account from DSG:

```typescript
// 1. Delete stored token (revoke local)
await supabase
  .from('stripe_oauth_tokens')
  .delete()
  .eq('stripe_account_id', accountId);

// 2. Optionally notify Stripe (if Stripe supports revocation endpoint)
// This is informational; Stripe will mark account as deauthorized on their end
```

### 10.2 Stripe Event: Account Deauthorized

When user revokes in Stripe Dashboard:

Stripe sends `account.application.deauthorized` webhook. Handle it:

```typescript
// In webhook handler
if (event.type === 'account.application.deauthorized') {
  const { account_id } = event.data.object;
  
  // Delete local token
  await supabase
    .from('stripe_oauth_tokens')
    .delete()
    .eq('stripe_account_id', account_id);
  
  // Notify user
  await notifyUserAccountDeauthorized(account_id);
}
```

---

## Next Steps

1. **Register redirect URIs** — Update Stripe Dashboard with your URLs
2. **Store credentials** — Add to Vercel environment variables
3. **Implement authorization flow** — Create `/api/stripe/oauth/authorize` route
4. **Implement callback handler** — Create `/api/stripe/oauth/callback` route
5. **Test end-to-end** — Walk through OAuth flow locally with Stripe test mode
6. **Monitor production** — Set up alerts for failed OAuth exchanges

---

## References

- [Stripe OAuth Documentation](https://stripe.com/docs/connect/oauth)
- [Connected Accounts API](https://stripe.com/docs/connect)
- [OAuth Security Best Practices](https://stripe.com/docs/security#oauth)
- [PKCE Specification (RFC 7636)](https://tools.ietf.org/html/rfc7636)
- [Webhook Signature Verification](./STRIPE_WEBHOOK_SIGNATURE_VERIFICATION.md)
