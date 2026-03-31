describe('/api/enterprise-proof/report', () => {
  it('returns public AI-first narrative payload', async () => {
    const { GET } = await import('../../../app/api/enterprise-proof/report/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.report_class).toBe('public_narrative');
    expect(json.mode).toBe('public_ai_first');
    expect(json.product_name).toBe('DSG ONE');
  });
});
