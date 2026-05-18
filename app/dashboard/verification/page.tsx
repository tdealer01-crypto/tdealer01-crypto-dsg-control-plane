import Link from 'next/link';
import { EmptyState, EvidenceRow, MetricTile, RuntimeWorkflowPage, WorkflowPanel } from '../_components/runtime-workflow';

const verificationSteps = [
  {
    label: '1',
    title: 'Collect evidence',
    body: 'รวม execution, checkpoint, policy และ audit event จาก runtime จริงก่อนสรุปสถานะ',
  },
  {
    label: '2',
    title: 'Verify chain',
    body: 'ตรวจ ledger sequence, truth state และ checkpoint hash ว่าต่อกันครบหรือไม่',
  },
  {
    label: '3',
    title: 'Review exceptions',
    body: 'แยก warning/fail ให้ผู้ใช้รู้ว่าต้องแก้ policy, runtime หรือ environment',
  },
  {
    label: '4',
    title: 'Package proof',
    body: 'เตรียมหลักฐานสำหรับลูกค้า, audit, Marketplace หรือ Cloud Run smoke evidence',
  },
];

const proofItems = [
  ['Runtime spine', 'truth_states + ledger_entries + checkpoints', 'green'],
  ['Policy source', 'runtime_policies with legacy fallback', 'blue'],
  ['Agent gate', 'Audit Only / Enforce Gate decision path', 'gold'],
  ['Evidence export', 'Ready after live smoke test passes', 'slate'],
] as const;

export default function VerificationPage() {
  return (
    <RuntimeWorkflowPage
      active="/dashboard/verification"
      eyebrow="DSG Evidence Verification"
      title="Verification Flow"
      description="หน้าเช็กหลักฐานก่อนบอกลูกค้าหรือ Marketplace ว่าระบบพร้อมจริง: เห็นว่า runtime มีอะไรครบ, จุดไหนยัง pending, และขั้นต่อไปต้องทำอะไร"
      status="Evidence review"
      statusTone="blue"
      actions={[
        { href: '/dashboard/live-control', label: 'Open live control', tone: 'gold' },
        { href: '/dashboard/audit', label: 'Audit trail', tone: 'slate' },
      ]}
      steps={verificationSteps}
    >
      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile label="Proof readiness" value="Review" helper="รอ smoke evidence จาก production deployment ล่าสุด" tone="blue" />
            <MetricTile label="Runtime spine" value="Ready" helper="RPC/checkpoint path ถูกเติมใน Supabase แล้ว" tone="green" />
            <MetricTile label="Policy flow" value="Ready" helper="หน้า policy workflow + runtime_policies ถูกเตรียมแล้ว" tone="gold" />
            <MetricTile label="Claim boundary" value="Pending" helper="ยังไม่ claim production-ready จนกว่า Vercel build ผ่าน" tone="red" />
          </div>

          <WorkflowPanel
            eyebrow="What user gets"
            title="เห็นผลทันทีตรงไหน"
            body="ผู้ใช้ไม่ต้องอ่าน log ยาว ๆ ก่อนตัดสินใจ หน้านี้แยกให้เห็นว่าอะไรผ่านแล้ว อะไรต้องตรวจซ้ำ และควรกดหน้าไหนต่อเพื่อปิดหลักฐาน"
            tone="green"
          />
        </div>

        <div className="space-y-6">
          <WorkflowPanel eyebrow="Verification checklist" title="Proof chain status">
            <div className="space-y-3">
              {proofItems.map(([label, value, tone]) => (
                <EvidenceRow key={label} label={label} value={value} tone={tone} />
              ))}
            </div>
          </WorkflowPanel>

          <WorkflowPanel eyebrow="Next action" title="ทำอะไรต่อ">
            <EmptyState
              title="ต้องมี deploy evidence ก่อนปิดงาน"
              body="หลัง Vercel production build ผ่าน ให้เปิด Live Control และ Audit เพื่อตรวจ runtime status, executions, audit events แล้วค่อยบันทึก smoke evidence สำหรับ Cloud Run/Marketplace"
              href="/dashboard/live-control"
              action="Go to live control"
            />
          </WorkflowPanel>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/dashboard/executions" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-slate-100">
              Review executions
            </Link>
            <Link href="/dashboard/policies" className="rounded-xl bg-amber-300 px-4 py-3 text-center text-sm font-semibold text-slate-950">
              Review policy flow
            </Link>
          </div>
        </div>
      </section>
    </RuntimeWorkflowPage>
  );
}
