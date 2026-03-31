describe('/api/enterprise-proof/report', () => {
  it('returns legacy public AI-first narrative payload', async () => {
    const { GET } = await import('../../../app/api/enterprise-proof/report/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.product_name).toBe('DSG ONE');
    expect(json.recommended_links?.json_report).toBe('/api/enterprise-proof/report');
    expect(json.org_id).toBeUndefined();
    expect(json.report_class).toBeUndefined();
  });
});
