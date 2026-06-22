# DOI, Zenodo Caching และ EU Law Map

dsg-control-plane สำหรับ agent และผู้ใช้งานที่ต้องการเข้าถึงกฎหมาย EU, DOI, และ Zenodo caching ได้อย่างรวดเร็ว

---

## Quick Links สำหรับ Agent

### EU Law
- `/compliance/eu-ai-act` — EU AI Act compliance mapping (article-based)
- `/eu-ai-act` — EU AI Act live status + evidence
- `/app/eu-ai-act` — EU AI Act app shell
- `/iso-42001` — ISO 42001 AI management system
- `/evidence-pack` — Evidence pack download
- `/compliance/evidence` — Full evidence chain viewer
- API: `/api/compliance/export?format=audit-log.json&framework=EU+AI+Act`

### Policies & Markdoc
- `/dashboard/markdoc-policies` — Markdoc policies list (create/edit)
- API: `/api/markdoc-policies` — GET list, POST create
- API: `/api/markdoc-policies/[id]` — GET detail, PUT update, DELETE

### Runtime & Audit (for evidence collection)
- `/dashboard/ledger` — Ledger + audit entries
- `/dashboard/audit` — Audit log
- `/dashboard/proofs` — Proof artifacts
- `/dashboard/verification` — Verification panel
- `/dashboard/readiness-config` — Readiness config
- `/api/ledger` — Ledger JSON
- `/api/audit` — Audit JSON
- `/api/proofs` — Proofs JSON

### Multi-Agent Orchestrator
- `/dashboard/hermes/agents` — 5-agent mesh dashboard + benchmark UI
- `/api/hermes/chat` — Orchestrator entry (5 parallel roles)
- `/api/hermes/multi-agent/execute` — DAG-based multi-agent batch
- `/dashboard/hermes/page` — Hermes command center

---

## DOI & Zenodo Caching

### Why DOI?
- DOI (Digital Object Identifier) จัดการให้ Wissenschaft/Academic มี unique รหัสให้งาน/artifact อย่างถาวร
- DSG Control Plane ใช้ DOI สำหรับ:
  - Benchmark results
  - Evidence packs
  - Compliance exports
  - Policy snapshots

### Zenodo Caching Strategy
1. **Generate** artifact locally (JSON/Markdown/PDF)
2. **Upload** ไปยัง Zenodo (OA) → ได้ DOI
3. **Cache** DOI metadata ในฐานข้อมูล:
   - `doi_registry` table: doi, url, artifact_type, created_at, zenodo_metadata
4. **Verify** DOI ทุก 24h ผ่าน Zenodo API
5. **Fallback** ไปใช้ local artifact ถ้า Zenodo ช้าลม

### Cached DOI Endpoints
- `GET /api/dois` — list DOI registry
- `POST /api/dois` — mint DOI ใหม่ (upload to Zenodo + register)
- `GET /api/dois/{doi}` — verify DOI + return cached metadata
- `DELETE /api/dois/{doi}` — soft delete (mark revoked)

### DOI Cache Schema ( Supabase )

```sql
create table doi_registry (
  id uuid primary key default gen_random_uuid(),
  doi text unique not null,
  artifact_type text not null, -- 'benchmark' | 'evidence' | 'policy' | 'compliance'
  artifact_url text not null,
  zenodo_metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  status text default 'active' -- 'active' | 'revoked' | 'deprecated'
);

create index idx_doi_registry_doi on doi_registry(doi);
create index idx_doi_registry_type on doi_registry(artifact_type);
```

### README Integration (สำหรับ audience ภายนอก)
ใช้┌functions:
- badge `![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.XXXXXXX.svg)`
- link `https://doi.org/10.5281/zenodo.XXXXXXX`
- citation block สำหรับ academic use

---

## EU Law Mapping ( authoritative source )

### Primary Frameworks
| Framework | Source URL | Local Page | API |
|-----------|-----------|------------|-----|
| EU AI Act | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689 | `/compliance/eu-ai-act` | `/api/compliance/export` |
| EU Cyber Resilience Act | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2155 | `/compliance/eu-ai-act` | same |
| GDPR | https://gdpr-info.eu/ | `/ai-compliance` | `/api/audit` |
| ISO 42001 | https://www.iso.org/standard/81233.html | `/iso-42001` | N/A |

### Mapping Principles
1. **Article → Control → Evidence → Test** tree
2. DSG mapping เป็น pre-audit mapping ห้ามใช้แทน certified legal opinion
3. ทุก mapping ต้องมี:
   - Evidence type (ledger, proof, audit)
   - Min severity level (L0-L3)
   - Associated test file path
4. Section `pending` = ยังไม่ผ่าน verified gate → ต้องรอรัน test + collect evidence ก่อน claim ว่า compliant

### วิธีเพิ่ม EU Article ใหม่
1. เพิ่มเข้า `lib/ccvs/compliance-matrix.ts` ใน `REQUIREMENT_CATALOG`
2. เพิ่ม description + DSG response เข้า `app/compliance/eu-ai-act/page.tsx` ใน `EU_ARTICLES`
3. เพิ่ม test case ใน `tests/e2e/compliance/`
4. run `npx playwright test tests/e2e/compliance/eu-ai-act.spec.ts`
5. collect evidence → archive ใน `evidence-pack/`
6. mint DOI ผ่าน Zenodo แล้ว cache DOI

---

## Agent Navigation Guide

### Efficient Routes
- Start: `/dashboard` — ภาพรวม全院
- Policies: `/dashboard/markdoc-policies`
- Compliance: `/compliance/eu-ai-act`
- Evidence: `/compliance/evidence`
- Audit: `/dashboard/audit`
- Multi-Agent: `/dashboard/hermes/agents`
- Docs: `/docs`

### Navigation Pattern Recommendation
1. เข้า `/dashboard`
2. ใช้ menu แบนด้านบน (`DashboardNav`) — breadcrumb ครบถ้วน
3. ถ้าเจอหน้า 404/401 → redirect กลับ `/login`
4. policy status ดู `/api/markdoc-policies?include_versions=true`

### Cached Assets
- DOI registry: cache TTL 24h, auto-refresh tick
- Markdoc renders: ISR รeron-demand, revalidate 1h
- Compliance matrix: build-time static, runtime fallback from DB

---

## Acceptance Checklist

- [ ] Agent สามารถโหลดหน้า EU AI Act ได้ (`/compliance/eu-ai-act`)
- [ ] Agent ดู policies + versions ได้ via `/api/markdoc-policies`
- [ ] DOI mint + cache flow ทำงาน ( pending Zenodo upload integration )
- [ ] Evidence pack export ได้ (`/api/compliance/export`)
- [ ] Multi-agent mesh dashboard accessible (`/dashboard/hermes/agents`)
