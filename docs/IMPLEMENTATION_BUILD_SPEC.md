# Implementation Build Spec

## Goal

Turn the current control-plane into the single sellable DSG ONE product shell.

## Product repo
`tdealer01-crypto-dsg-control-plane`

## Engine repo
`DSG-Deterministic-Safety-Gate`

---

## Current working product paths

### Commercial shell already present
- pricing page
- Stripe checkout route
- Stripe webhook route
- agent creation route
- execute route
- usage route
- dashboard shell
- health route
- audit route
- executions route

These paths make the control-plane the correct primary product repo.

---

## Required database tables

The product shell should treat these as the minimum live schema:
- `users`
- `agents`
- `executions`
- `audit_logs`
- `usage_events`
- `usage_counters`
- `billing_customers`
- `billing_subscriptions`
- `billing_events`

## Table intent

### users
- auth user mapping
- org membership
- active state

### agents
- issued API keys as hashes only
- status
- policy id
- monthly limit
- last used timestamp

### executions
- customer-visible execution history
- decision
- latency
- policy version
- reason

### audit_logs
- evidence bundle storage
- execution trace
- policy version
- decision reason

### usage_events
- per-execution billing events
- unit and amount tracking

### usage_counters
- fast monthly execution totals by billing period

### billing_customers
- Stripe customer to org mapping

### billing_subscriptions
- plan, status, billing interval, current period window

### billing_events
- persisted Stripe webhook events for traceability

---

## Route-by-route implementation order

## 1. `/api/health`
Purpose:
- prove the control-plane is up
- prove DSG core is reachable

Must return:
- control-plane status
- timestamp
- `core_ok`
- DSG core URL
- DSG core version
- DSG core status or error

## 2. `/api/agents`
Purpose:
- create agents
- list agents

Rules:
- issue API key once
- store only hash in persistence
- keep agent status and monthly limit visible

## 3. `/api/execute`
Purpose:
- receive customer execution requests
- authenticate agent
- call DSG core
- persist execution
- persist audit log
- increment usage

Rules:
- DSG core is the only source of decision
- write execution record before returning success to the customer whenever possible
- usage event and usage counter must update in the same request flow

## 4. `/api/usage`
Purpose:
- show plan, billing period, executions, included executions, overage, projected amount

Rules:
- derive plan from billing subscription state
- derive included quota from plan key
- compute overage from live counters

## 5. `/api/executions`
Purpose:
- give dashboard a customer-visible execution list
- include DSG core ledger and metrics snapshots where available

Rules:
- customer-visible history comes from product database
- engine-level live detail comes from DSG core

## 6. `/api/audit`
Purpose:
- show audit events and determinism checks in dashboard

Rules:
- authorize by logged-in org user
- read audit events from DSG core
- read determinism results from DSG core

## 7. `/api/billing/checkout`
Purpose:
- start Stripe subscription checkout

Rules:
- use fixed live Stripe price envs
- store plan and interval in metadata
- send customer to dashboard billing on success

## 8. `/api/billing/webhook`
Purpose:
- sync Stripe events into product persistence

Rules:
- verify webhook signature
- upsert billing events
- upsert billing customers
- upsert billing subscriptions
- map customer email or org metadata back to org id

---

## UI migration from DSG-ONE

Move these UX surfaces from `DSG-ONE` into the control-plane:
- proof explorer
- replay view
- ledger inspector
- mission-control execution stream
- operator decision timeline

Do not move:
- local heuristic decision logic
- local persistence as production storage

---

## Acceptance order

### Step 1
Public site, pricing, login, and dashboard open correctly.

### Step 2
Agent creation works and returns one-time API key.

### Step 3
Execution requests reach DSG core and return canonical decision payload.

### Step 4
Executions, audit logs, usage events, and counters persist.

### Step 5
Dashboard shows real health, executions, usage, and audit data.

### Step 6
Billing changes plan entitlements and quota behavior.

### Step 7
Proof, replay, and ledger views are moved into the customer-facing shell.

### Step 8
Replay protection and idempotency are hardened for production.

---

## Final build rule

The product is ready to sell only when the customer-facing shell, the billing state, and the DSG decision engine all agree on the same execution truth.
