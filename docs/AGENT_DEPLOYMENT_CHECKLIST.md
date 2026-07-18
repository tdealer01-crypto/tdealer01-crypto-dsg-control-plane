# Superteam Agent Integration - Deployment Checklist

**Status**: Phase 3-7 | Ready for deployment

## Pre-Deployment (Local Testing)

### ✅ Database Setup
- [ ] Supabase project created
- [ ] Run migration: `supabase migration up`
  ```bash
  # Apply migration to local DB
  supabase db push
  ```
- [ ] Verify tables exist:
  ```sql
  SELECT tablename FROM pg_tables WHERE schemaname='public' 
  AND tablename LIKE '%agent%';
  ```

### ✅ Environment Variables
- [ ] Create `.env.local`:
  ```bash
  SUPERTEAM_API_KEY=DW7fNp9W8hWBo74Y2rHRsJuVgYdSBvACQ3ZXLXtXSGXG
  SUPERTEAM_API_URL=https://api.superteam.fun
  NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  NEXT_PUBLIC_EARN_ENABLED=true
  ```

### ✅ Local Testing
- [ ] Start dev server: `npm run dev`
- [ ] Test `/dashboard/agent-earn` loads
- [ ] Register test agent → get claimCode
- [ ] Discover listings → verify JSON
- [ ] Submit work → verify stored in DB
- [ ] Check heartbeat → verify status

## Deployment to Vercel

### ✅ Code Preparation
- [ ] All commits pushed to `claude/mcp-aws-revenue-apps-hfd73j`
- [ ] Tests passing: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors: `npm run typecheck`

### ✅ Vercel Configuration
1. Open https://vercel.com/dashboard
2. Select project: `tdealer01-crypto-dsg-control-plane`
3. Go to **Settings → Environment Variables**
4. Add:
   ```
   SUPERTEAM_API_KEY = DW7fNp9W8hWBo74Y2rHRsJuVgYdSBvACQ3ZXLXtXSGXG
   SUPERTEAM_API_URL = https://api.superteam.fun
   NEXT_PUBLIC_EARN_ENABLED = true
   ```
5. Redeploy from branch: `claude/mcp-aws-revenue-apps-hfd73j`

### ✅ Supabase Production Setup
1. Open Supabase project dashboard
2. Go to **SQL Editor**
3. Run migration script:
   ```sql
   -- From: supabase/migrations/20260718_add_superteam_agents.sql
   -- Copy entire migration and execute
   ```
4. Verify tables:
   ```sql
   SELECT * FROM dsg_agents LIMIT 1;
   SELECT * FROM agent_submissions LIMIT 1;
   SELECT * FROM agent_discovery_log LIMIT 1;
   ```

## Post-Deployment Verification

### ✅ Production Smoke Tests
1. Test health check:
   ```bash
   curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
   ```

2. Test agent registration:
   ```bash
   curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/superteam/agent/register \
     -H "Content-Type: application/json" \
     -d '{"agentName":"test-agent-prod"}'
   # Should return: agentId, claimCode, success
   ```

3. Test heartbeat:
   ```bash
   curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/superteam/agent/heartbeat?agentId={agentId}
   # Should return: status=ok
   ```

4. Test listing discovery:
   ```bash
   curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/superteam/agent/discover?agentId={agentId}&take=5
   # Should return: count, listings array
   ```

### ✅ Dashboard Verification
1. Open: https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/agent-earn
2. Can register new agent
3. Can see claim code
4. Can discover listings
5. Can submit work
6. Submissions appear in DB

### ✅ Database Integrity
- [ ] No migration errors in Supabase logs
- [ ] Row count checks:
  ```sql
  SELECT COUNT(*) FROM dsg_agents;
  SELECT COUNT(*) FROM agent_submissions;
  SELECT COUNT(*) FROM agent_discovery_log;
  ```
- [ ] Sample record retrieval works
- [ ] RLS policies enforced (test with different auth users)

## Monitoring & Maintenance

### 🔍 Daily Checks
- [ ] Monitor agent registrations: `SELECT COUNT(*) FROM dsg_agents`
- [ ] Check submissions: `SELECT COUNT(*) FROM agent_submissions`
- [ ] Verify heartbeats: `SELECT MAX(last_heartbeat) FROM dsg_agents`
- [ ] Error logs: Check Vercel deployment logs

### 📊 Weekly Reports
- [ ] Total agents registered
- [ ] Total submissions
- [ ] Success rate (approved/total)
- [ ] Average reward value
- [ ] Claims processed

### 🚨 Troubleshooting

**Issue: Agent registration fails**
- Check `SUPERTEAM_API_KEY` in Vercel env
- Check Supabase connection strings
- Review Vercel function logs

**Issue: Listings not discovered**
- Check Superteam API key validity
- Test curl: `curl -H "Auth: Bearer KEY" https://api.superteam.fun/api/agents/listings/live`
- Check rate limits (60/hour)

**Issue: Submissions not storing**
- Verify DB migration applied
- Check RLS policies
- Review Supabase logs

**Issue: Claim code invalid**
- Verify claim code stored in `dsg_agents.claim_code`
- Check for unique constraint
- Test with correct agentId

## Rollback Plan

If deployment fails:

1. **Revert code**:
   ```bash
   git revert HEAD
   git push origin claude/mcp-aws-revenue-apps-hfd73j
   # Vercel auto-deploys
   ```

2. **Restore DB** (if needed):
   ```sql
   -- Drop tables (caution: data loss)
   DROP TABLE IF EXISTS agent_submissions CASCADE;
   DROP TABLE IF EXISTS agent_discovery_log CASCADE;
   DROP TABLE IF EXISTS dsg_agents CASCADE;
   
   -- Re-run migration with fixed version
   ```

3. **Notify users**: Document breaking changes

## Success Criteria

✅ **Deployment is complete when:**
1. Code deployed to Vercel
2. All migrations applied
3. Health check passing
4. Agent registration working
5. Listing discovery functional
6. DB storing submissions
7. Claim code flow tested
8. Dashboard accessible

## Timeline

- **Day 1-2**: ✅ Code implementation
- **Day 3**: 🔄 Local testing + migration
- **Day 4**: 🔄 Production deployment
- **Day 5**: 🔄 Smoke tests + monitoring
- **Day 6**: 🔄 Full integration testing
- **Day 7**: ✅ Launch `/dashboard/agent-earn`

## Go-Live Announcement

Once deployed:
1. Update README: Link to `/dashboard/agent-earn`
2. Create bounty on Superteam: "Build agent integrations"
3. Post to Twitter/Discord
4. Monitor first agent registrations

## Contact & Support

- **Docs**: `/docs/SUPERTEAM_AGENT_INTEGRATION.md`
- **API**: `/api/superteam/agent/*`
- **Dashboard**: `/dashboard/agent-earn`
- **Superteam Docs**: https://superteam.fun/skill.md
