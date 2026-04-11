import fs from 'node:fs';
import path from 'node:path';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('finance governance live workflow dashboard surface', () => {
  it('shows submit/approve/reject/escalate actions connected to API endpoints', () => {
    const source = read('app/finance-governance/live/workflow/page.tsx');

    expect(source).toContain('Submit sample workflow item');
    expect(source).toContain("void runApprovalAction(item.id, 'approve')");
    expect(source).toContain("void runApprovalAction(item.id, 'reject')");
    expect(source).toContain("void runApprovalAction(item.id, 'escalate')");

    expect(source).toContain("financeGovernanceFetch('/api/finance-governance/submit'");
    expect(source).toContain("financeGovernanceFetch(`/api/finance-governance/approvals/${approvalId}/${action}`");
  });

  it('renders workflow summary cards for dashboard checks', () => {
    const source = read('app/finance-governance/live/workflow/page.tsx');

    expect(source).toContain('Pending approvals');
    expect(source).toContain('Open exceptions');
    expect(source).toContain('Ready exports');
    expect(source).toContain('Refresh workflow data');
  });
});
