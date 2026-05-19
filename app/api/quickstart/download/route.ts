// GET /api/quickstart/download?lang=python|javascript
// Returns a ready-to-use dsg_gate.py or dsg_gate.js file
// with the caller's real API key pre-filled.

import { NextRequest, NextResponse } from 'next/server';
import { requireActiveProfile } from '../../../../lib/auth/require-active-profile';
import { ensureStarterAgent } from '../../../../lib/quickstart/starter-agent';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

function pythonFile(baseUrl: string, apiKey: string, agentId: string): string {
  return `"""
dsg_gate.py — DSG ONE gate helper
วางไฟล์นี้ในโฟลเดอร์เดียวกับ agent ของคุณ แล้ว import ใช้ได้เลย

ติดตั้ง dependency:
  pip install requests

วิธีใช้:
  from dsg_gate import gate

  # ก่อนทุก action ที่ agent จะทำ
  if gate("my-session-01", "send_email") == "ALLOW":
      send_email(...)
  # ถ้า BLOCK — หยุด ไม่ทำ
"""

import requests
import logging
from typing import Literal

DSG_BASE_URL = "${baseUrl}"
DSG_API_KEY  = "${apiKey}"
DSG_AGENT_ID = "${agentId}"

logger = logging.getLogger(__name__)

Decision = Literal["ALLOW", "BLOCK", "STABILIZE"]


def gate(session_id: str, action: str) -> Decision:
    """
    ถาม DSG gate ก่อนทุก action
    Return: "ALLOW" | "BLOCK" | "STABILIZE"

    ตัวอย่างชื่อ action:
      "send_email"         — ส่ง email
      "delete_file"        — ลบไฟล์
      "call_payment_api"   — เรียก payment API
      "update_database"    — แก้ไข database
      "fetch_user_data"    — ดึงข้อมูล user
    """
    try:
        resp = requests.post(
            f"{DSG_BASE_URL}/api/execute",
            json={
                "agent_id": DSG_AGENT_ID,
                "action": action,
                "input": {"session_id": session_id},
                "context": {"source": "agent"},
            },
            headers={
                "Authorization": f"Bearer {DSG_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=5,
        )
        data = resp.json()
        decision: Decision = data.get("decision", "BLOCK")
        logger.debug("[DSG] session=%s action=%s decision=%s", session_id, action, decision)
        return decision
    except Exception as exc:
        logger.error("[DSG] gate error: %s — defaulting to BLOCK", exc)
        return "BLOCK"


def require_allow(session_id: str, action: str) -> None:
    """
    เหมือน gate() แต่ throw exception ถ้า BLOCK
    ใช้ได้ใน try/except block
    """
    decision = gate(session_id, action)
    if decision != "ALLOW":
        raise PermissionError(f"[DSG] BLOCK: {action} (session={session_id}, decision={decision})")
`;
}

function javascriptFile(baseUrl: string, apiKey: string, agentId: string): string {
  return `/**
 * dsg_gate.js — DSG ONE gate helper
 * วางไฟล์นี้ในโฟลเดอร์เดียวกับ agent ของคุณ แล้ว import ใช้ได้เลย
 *
 * วิธีใช้ (CommonJS):
 *   const { gate } = require('./dsg_gate');
 *
 * วิธีใช้ (ESM):
 *   import { gate } from './dsg_gate.js';
 *
 * ก่อนทุก action ที่ agent จะทำ:
 *   const decision = await gate("my-session-01", "send_email");
 *   if (decision === "ALLOW") { sendEmail(...); }
 */

const DSG_BASE_URL = "${baseUrl}";
const DSG_API_KEY  = "${apiKey}";
const DSG_AGENT_ID = "${agentId}";

/**
 * ถาม DSG gate ก่อนทุก action
 * @returns "ALLOW" | "BLOCK" | "STABILIZE"
 *
 * ตัวอย่างชื่อ action:
 *   "send_email"         — ส่ง email
 *   "delete_file"        — ลบไฟล์
 *   "call_payment_api"   — เรียก payment API
 *   "update_database"    — แก้ไข database
 *   "fetch_user_data"    — ดึงข้อมูล user
 */
async function gate(sessionId, action) {
  try {
    const res = await fetch(\`\${DSG_BASE_URL}/api/execute\`, {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${DSG_API_KEY}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: DSG_AGENT_ID,
        action,
        input: { session_id: sessionId },
        context: { source: "agent" },
      }),
    });
    const data = await res.json();
    const decision = data.decision ?? "BLOCK";
    console.debug(\`[DSG] session=\${sessionId} action=\${action} decision=\${decision}\`);
    return decision;
  } catch (err) {
    console.error("[DSG] gate error:", err, "— defaulting to BLOCK");
    return "BLOCK";
  }
}

/**
 * เหมือน gate() แต่ throw error ถ้า BLOCK
 */
async function requireAllow(sessionId, action) {
  const decision = await gate(sessionId, action);
  if (decision !== "ALLOW") {
    throw new Error(\`[DSG] BLOCK: \${action} (session=\${sessionId}, decision=\${decision})\`);
  }
}

module.exports = { gate, requireAllow };
`;
}

export async function GET(request: NextRequest) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'quickstart-download'),
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  const access = await requireActiveProfile();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const lang = request.nextUrl.searchParams.get('lang') ?? 'python';
  if (lang !== 'python' && lang !== 'javascript') {
    return NextResponse.json({ error: 'lang must be python or javascript' }, { status: 400 });
  }

  const starterAgent = await ensureStarterAgent(access.orgId);
  const baseUrl = request.nextUrl.origin;

  const isPython = lang === 'python';
  const filename = isPython ? 'dsg_gate.py' : 'dsg_gate.js';
  const content = isPython
    ? pythonFile(baseUrl, starterAgent.api_key, starterAgent.agent_id)
    : javascriptFile(baseUrl, starterAgent.api_key, starterAgent.agent_id);

  return new NextResponse(content, {
    headers: {
      ...headers,
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
