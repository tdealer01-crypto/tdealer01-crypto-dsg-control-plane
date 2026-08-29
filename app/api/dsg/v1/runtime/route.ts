export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return Response.json(
    {
      service: 'dsg-control-plane',
      gitSha: process.env.DSG_GIT_SHA ?? null,
      imageDigest: process.env.DSG_IMAGE_DIGEST ?? null,
      builtAt: process.env.DSG_BUILD_TIMESTAMP ?? null,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
