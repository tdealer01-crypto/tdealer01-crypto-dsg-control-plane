# 🚀 Quick Stripe Setup — ทำครั้งเดียว ไม่ต้องทำซ้ำ!

**ปัญหา**: ต้องใส่ env vars ทุกวัน ซ้ำซากนับไม่ถ้วน  
**วิธีแก้**: Setup ครั้งเดียว → Save locally → Use forever

---

## ⚡ 5 นาที ก็เสร็จ

### Step 1: Collect Keys (จาก Stripe Dashboard)
```
1. https://dashboard.stripe.com/apikeys
   → Copy: sk_live_xxx (SECRET KEY)
   → Copy: pk_live_xxx (PUBLISHABLE KEY)

2. https://dashboard.stripe.com/webhooks
   → Copy: whsec_xxx (SIGNING SECRET)

3. https://dashboard.stripe.com/products
   → Copy: price_xxx (฿10 PRICE ID)

4. https://app.supabase.com/project/[id]/settings/api
   → Copy: Project URL
   → Copy: Service Role Key
```

### Step 2: Run Setup Script (One-time)
```bash
bash setup-stripe-env.sh
```

**ที่เข้ามา:**
```
Enter Stripe SECRET KEY: sk_live_xxx
Enter Stripe PUBLISHABLE KEY: pk_live_xxx
Enter Stripe WEBHOOK SECRET: whsec_xxx
Enter Stripe PRICE ID: price_xxx
Enter Supabase URL: https://xxx.supabase.co
Enter Supabase SERVICE ROLE KEY: eyJxxx
```

**ที่ออกไป:**
- ✅ `.env.local` (local, not committed)
- ✅ Vercel environment vars (automatic)

### Step 3: Deploy & Test
```bash
git push origin main
# Wait 2-3 minutes for Vercel rebuild

# Test
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/revenue
# Should return: {"status":"revenue-api-active"...}
```

---

## 🔒 Security

- ✅ `.env.local` is in `.gitignore` → Never committed
- ✅ Keys stored only locally (dev) + Vercel (prod)
- ✅ No hardcoded secrets in code
- ✅ Safe to run multiple times (idempotent)

---

## ❌ If Script Fails

**Manual Setup** (5 min):
```bash
# 1. Create .env.local
cp .env.example .env.local

# 2. Edit with your keys
nano .env.local

# 3. Save (Ctrl+X, Y, Enter)

# 4. For Vercel, use CLI:
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_PRICE_PRO
```

---

## 🎯 After Setup

**Never do this again:**
- ❌ Copy-paste env vars every day
- ❌ Remember which key is which
- ❌ Hunt in Stripe dashboard

**Just:**
- ✅ `npm run dev` → Works locally
- ✅ `git push` → Works on Vercel
- ✅ Test payment → ฿10 charged ✓

---

## 📋 Verify Setup Works

```bash
# Local test (should use .env.local)
npm run dev
# Go to: http://localhost:3000/checkout
# Should see payment form ✅

# Production test
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/checkout
# Should return HTML form ✅
```

---

**Run setup.sh ครั้งเดียว → ใช้ได้เรื่อยๆ!** 🚀
