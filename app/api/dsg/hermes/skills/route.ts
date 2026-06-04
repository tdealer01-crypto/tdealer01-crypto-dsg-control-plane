/**
 * GET /api/dsg/hermes/skills
 *
 * Skills registry index for the Hermes Agent Skills Hub.
 * Returns built-in skills, optional skills, and community registry metadata.
 * Backed by lib/hermes/skills/registry.ts — canonical source.
 */

import { NextResponse } from 'next/server';
import {
  getAllSkills,
  getSkillSummary,
  REGISTRY_META,
} from '@/lib/hermes/skills/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    summary: {
      ...getSkillSummary(),
      catalogRefreshed: new Date().toISOString(),
    },
    registries: REGISTRY_META,
    skills: getAllSkills(),
  });
}
