import { NextResponse } from 'next/server';
import { listGatewayControlTemplates } from '../../../../../lib/gateway/control-templates';

export const dynamic = 'force-dynamic';

export async function GET() {
  const templates = listGatewayControlTemplates();

  return NextResponse.json({
    ok: true,
    type: 'dsg-gateway-control-template-library',
    count: templates.length,
    implemented: templates.filter((template) => template.status === 'implemented').length,
    planned: templates.filter((template) => template.status === 'planned').length,
    templates,
    boundary: {
      statement: 'Control templates support governance workflow adoption. They are not certification claims by themselves.',
      certificationClaim: false,
    },
  });
}
