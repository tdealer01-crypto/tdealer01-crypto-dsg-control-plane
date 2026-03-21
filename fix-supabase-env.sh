#!/usr/bin/env bash
set -euo pipefail

# ใส่ค่าจริง 2 บรรทัดนี้ก่อน
SUPABASE_URL="https://zeyguilldygozufpgxms.supabase.co"
SUPABASE_ANON_KEY="sb_publishable__T5uR3y1_EH6cDabodIEwA_Vads9ni4"

if [ "$SUPABASE_ANON_KEY"=  "PASTE_YOUR_SUPABASE_ANON_KEY_HERE" ]; then
  echo "ERROR: ใส่ SUPABASE_ANON_KEY ก่อน"
  exit 1
fi

echo "== Remove wrong envs =="
printf 'y\n' | vercel env rm NEXT_PUBLIC_SUPABASE_URL production || true
printf 'y\n' | vercel env rm NEXT_PUBLIC_SUPABASE_URL preview || true
printf 'y\n' | vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production || true
printf 'y\n' | vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY preview || true

echo "== Add correct NEXT_PUBLIC_SUPABASE_URL =="
printf 'no\n%s\n' "$SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
printf 'no\n%s\n\n' "$SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview

echo "== Add correct NEXT_PUBLIC_SUPABASE_ANON_KEY =="
printf 'no\n%s\n' "$SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
printf 'no\n%s\n\n' "$SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview

echo "== Pull production env to verify =="
vercel env pull .env.production --environment=production

echo
echo "== Verify =="
grep NEXT_PUBLIC_SUPABASE_URL .env.production || true
grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.production | cut -c1-30 || true

echo
echo "== Redeploy =="
vercel --prod --logs
