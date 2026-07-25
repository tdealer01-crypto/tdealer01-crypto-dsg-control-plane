# Week 1 Prospect Research Guide: Building the 100-Company List

## Objective
Build a targeted list of 100 crypto/fintech companies that match the ICP (Ideal Customer Profile) for DSG ONE. This list is the foundation for all Week 1 outreach (LinkedIn, email, communities).

**Timeline:** Monday, before Tuesday outreach begins

**Deliverable:** CSV file with 100+ prospects, structured as:
```
Company_Name, Contact_Name, Title, Email, LinkedIn_URL, Funding_Stage, ARR_Est, Fund_Movement_Volume, Primary_Pain, Tech_Stack, Response_Channel, Lead_Score
```

---

## ICP Profile (Target Characteristics)

✅ **Company size:** 50-300 employees  
✅ **ARR:** $5-50M (or $10M+ TVL for DeFi)  
✅ **Funding:** Series A, B, or C  
✅ **Industry:** Crypto exchanges, staking platforms, DeFi protocols, fintech payouts, custody/wallet services  
✅ **Pain:** Manual audit prep, compliance risk, chargeback liability, regulatory pressure  
✅ **Tech stack:** Stripe, OpenAI APIs, Solana integration, custom fund movement APIs  
✅ **Decision maker:** CFO, Chief Compliance Officer, VP Operations, CTO/Engineering Lead  

---

## Research Sources & Tools

### Source 1: LinkedIn Sales Navigator (Preferred, requires LinkedIn Premium)

**Setup:**
1. Go to LinkedIn Sales Navigator (`https://business.linkedin.com/talent-solutions/sales-navigator`)
2. Log in with your LinkedIn account (requires Premium subscription, $79/month)

**Search query (Crypto Exchanges):**
```
Keywords: "crypto exchange" OR "digital asset exchange" OR "cryptocurrency trading"
Company size: 51-500
Employees: 50-300
Funding: Series A, B, C
Industry: Financial Services
Years founded: 2018+
Recent hires: Last 3 months (indicator of growth)
```

**Search query (DeFi Protocols):**
```
Keywords: "DeFi" OR "yield protocol" OR "lending protocol"
Company size: 11-200
Industry: Financial Services, Technology
Tech stack: Solana OR Ethereum (if company mentions)
Years founded: 2020+
```

**Search query (Staking Platforms):**
```
Keywords: "staking" OR "stake pool" OR "validator" OR "staking service"
Company size: 11-200
Industry: Cryptocurrency
Years founded: 2020+
```

**For each prospect, capture:**
- Company name
- Contact name (CFO, CTO, or Compliance Officer)
- Contact title
- Email (if visible, otherwise guess: firstname@company.com or fname@company.com)
- LinkedIn URL (person profile)
- Company ARR (if mentioned in LinkedIn)
- Fund movement volume (if mentioned)
- Pain points (scan their recent posts, articles, or About section)

**Export:** LinkedIn allows exporting to CSV. Download and clean the data.

---

### Source 2: Crunchbase (Free tier available, premium for better data)

**Setup:**
1. Go to Crunchbase (`https://www.crunchbase.com`)
2. Create free account (or use existing)
3. Go to "Discover" → "Companies"

**Filter 1 (Crypto Exchanges):**
- Categories: Cryptocurrency, Blockchain
- Keywords: "exchange", "trading"
- Founded: 2018+
- Funding Stage: Series A, B, C
- Funding: $1M+
- Number of employees: 50-300
- HQ location: Any (global, but can filter by region)

**Filter 2 (DeFi Protocols):**
- Categories: DeFi, Cryptocurrency
- Keywords: "protocol", "lending", "yield", "staking"
- Founded: 2020+
- Funding: $500K+
- Employees: 10-200

**For each prospect:**
- Export to CSV: company name, website, founding date, funding stage, HQ, employee count
- Find contact info separately (LinkedIn + company website)

**Export:** Crunchbase Pro allows CSV export. Free tier allows manual export.

---

### Source 3: GitHub (Free, good for technical founders)

**Setup:**
1. Go to GitHub (`https://github.com`)
2. Use search box

**Search queries:**
```
language:solana stars:100+
language:rust solana-program
path:Cargo.toml "solana-program"
path:package.json "stripe"
```

**For each match:**
- Identify company (check repo description or organization)
- Find company GitHub org
- Look for founders/key engineers
- Cross-reference with LinkedIn to find company info

**Caveat:** GitHub is noisy; use this to find technical founders and validate tech stacks.

---

### Source 4: Crunchbase News + LinkedIn Posts (Manual, free)

**Setup:**
- Set up Google Alerts for keywords
- Monitor LinkedIn hashtags and trending posts

**Keywords:**
```
"crypto exchange" "Series B"
"DeFi protocol" funding
"staking platform" launch
"fintech" "fund movement"
```

**When you find a company:**
1. Note the company name and funding news
2. Go to LinkedIn → search for company
3. Find CFO/CTO/Compliance officer
4. Add to list

---

## List Building Workflow (Monday, 8 hrs)

### Hour 1-2: LinkedIn Sales Navigator Setup & Initial Search

1. **Open LinkedIn Sales Navigator**
2. **Search #1: Crypto Exchanges**
   - Run query from guide above
   - Export first batch (20-30 prospects)
   - Add to CSV: company, contact (CFO/Ops), title, email guess, LinkedIn URL, funding stage, ARR estimate
3. **Search #2: DeFi Protocols**
   - Run query from guide
   - Export second batch (15-20 prospects)
   - Add to CSV

### Hour 3-4: Crunchbase Mining

1. **Open Crunchbase**
2. **Filter #1: Crypto Exchanges (25-30 companies)**
   - Export or manually add top prospects
   - Cross-reference with LinkedIn to find contacts
3. **Filter #2: DeFi Protocols (15-20 companies)**
   - Export and cross-reference

### Hour 5-6: GitHub + Manual Research

1. **GitHub search** for technical founders (if applicable)
2. **Manual research** for top 20 prospects:
   - Visit company website
   - Look for "About" or "Team" page
   - Find CFO/CTO/Compliance officer contact info
   - Search LinkedIn for that person
   - Add email to CSV (if available)

### Hour 7-8: Data Cleanup & Lead Scoring

1. **Review all 100 prospects**
2. **Score each 1-10:**
   - 9-10: Clear fund movement pain + known funding stage
   - 7-8: Crypto/fintech company + right employee count
   - 5-6: Relevant industry, but unclear pain or contact info missing
   - 1-4: Low fit (too small, wrong industry)
3. **Clean CSV:**
   - Remove duplicates
   - Ensure emails are present (or can be guessed)
   - Add LinkedIn URLs
   - Estimate ARR/TVL where possible

**Target:** 100 prospects with score 7+ by Monday 5 PM UTC

---

## Contact Info Research (Email Finding)

**If LinkedIn shows email:** Use it directly

**If no email visible:**

1. **Company website:**
   - Check "Contact" or "About" page
   - Look for team email format (firstname@company.com, f.lastname@company.com, etc.)

2. **Hunter.io (free tier):**
   - Go to Hunter.io
   - Enter company domain
   - Search for CFO/CTO/Compliance officer name
   - Free tier: 25 searches/month

3. **RocketReach (paid, but accurate):**
   - Similar to Hunter
   - More expensive but higher accuracy

4. **Email guessing:**
   - If you find a pattern (e.g., all emails are firstname@company.com)
   - Guess based on contact's LinkedIn first/last name
   - Note as "guessed" in CSV

**Important:** Guessed emails will have lower response rates. Prioritize known emails.

---

## Data Quality Checklist

- [ ] 100+ companies in list
- [ ] At least 80 have direct contact names (CFO, CTO, Compliance)
- [ ] At least 70 have email addresses (known or guessed)
- [ ] All entries have funding stage or ARR estimate
- [ ] At least 50 have estimated fund movement volume or pain point
- [ ] All entries have tech stack noted (Stripe, Solana, custom API, etc.)
- [ ] No duplicate companies
- [ ] CSV is properly formatted (commas escaped, no line breaks in fields)
- [ ] Lead scores 1-10 assigned to all entries
- [ ] Primary response channel selected (LinkedIn, Email, Community)

---

## CSV Template (Copy into Week 1 GTM folder)

```csv
Company_Name,Contact_Name,Title,Email,LinkedIn_URL,Funding_Stage,ARR_Est,Fund_Movement_Volume,Primary_Pain,Tech_Stack,Response_Channel,Lead_Score,Outreach_Status,Date_Added
Phantom Crypto,Sarah Chen,CFO,sarah@phantom.com,https://linkedin.com/in/sarah-chen,Series B,$5-10M,$50M+ monthly,"Manual audit 10hrs/cycle",Stripe,LinkedIn,8,Not started,2026-07-25
Marinade Finance,James Li,Operations Lead,james@marinade.com,https://linkedin.com/in/james-li,Series A,$2-5M,$100M+ staking,"Compliance proof needed",Solana,Email,7,Not started,2026-07-25
Magic Eden,Unknown,VP Finance,finance@magiceden.com,https://linkedin.com/company/magic-eden,Series C,$10M+,$500M+ trading,"Chargeback liability",Stripe,LinkedIn,9,Not started,2026-07-25
```

---

## Segmentation Strategy (For Later Outreach Personalization)

Once list is built, segment by:

**Segment A: High-pain, high-intent (15-20 prospects)**
- Series B/C with known compliance challenges
- Score 9-10
- **Outreach:** Priority LinkedIn message or email Week 1 Tue

**Segment B: Good fit, mid-intent (30-40 prospects)**
- Series A/B with relevant tech stack
- Score 7-8
- **Outreach:** Email or LinkedIn Wed-Thu Week 1

**Segment C: Exploratory, lower intent (40-50 prospects)**
- Crypto/fintech, but pain unclear
- Score 5-6
- **Outreach:** Community posts or nurture email list

**Segment D: Low fit (skip)**
- Score 1-4
- Don't reach out

---

## Success Metrics

By Monday 5 PM UTC:
- ✅ 100+ prospects in CSV
- ✅ 80%+ have contact names
- ✅ 70%+ have email (known or guessed)
- ✅ All scored 1-10
- ✅ Primary response channel assigned

If you miss metrics:
- **>30 prospects missing emails?** Use Hunter.io or RocketReach for top 50 high-score companies
- **<70% with contact names?** Focus on LinkedIn Sales Navigator searches for Ops/Finance leads specifically
- **Too many low-score entries?** Re-filter Crunchbase/LinkedIn for Series A+ only

---

## Next Steps After List Is Built

1. **Tuesday morning:** Begin LinkedIn outreach (15-20 messages using templates from linkedin-outreach-messages.md)
2. **Tuesday afternoon:** Begin cold email (20 emails using templates from cold-email-sequences.md)
3. **Wednesday-Thursday:** Community posts + follow-ups
4. **Friday:** Summarize responses, score leads, schedule demos for Week 2

---
