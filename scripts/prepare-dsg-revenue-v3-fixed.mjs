import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath = 'tests/integration/revenue-automation-dsg-grounded-pairwise-v3.test.ts';
const targetPath = 'tests/integration/revenue-automation-dsg-grounded-pairwise-v3-fixed.test.ts';
let source = readFileSync(sourcePath, 'utf8');

const oldJudge = /async function judge\([\s\S]*?\n}\n\ndescribe\('DSG ONE deterministic grounded revenue pool v3'/;
const newJudge = `async function judgeOne(apiKey: string, model: string, answer: string, evidencePack: string): Promise<AnswerScore> {
  const payload = await chat(apiKey, model, {
    messages: [
      {
        role: 'system',
        content: 'ประเมินคำตอบเดียว 0-20 ใน relevance,revenueClarity,automationQuality,actionability,groundingAndRisk รวม 100; feasible=false ถ้ามี claim สำคัญไม่รองรับ evidence หรือ flow ใช้ไม่ได้; implementation evidence สำคัญกว่า planning docs. คืน JSON เท่านั้น {"score":{"relevance":0,"revenueClarity":0,"automationQuality":0,"actionability":0,"groundingAndRisk":0,"total":0,"feasible":true,"reason":"..."}}',
      },
      { role: 'user', content: JSON.stringify({ question: QUESTION, evidence: evidencePack, answer }) },
    ],
    temperature: 0,
    max_tokens: 1100,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(String(payload?.choices?.[0]?.message?.content ?? '{}'));
  const x = parsed?.score ?? (Array.isArray(parsed?.scores) ? parsed.scores[0] : null);
  if (!x) throw new Error('Judge did not return a score object');
  return {
    relevance: Number(x.relevance),
    revenueClarity: Number(x.revenueClarity),
    automationQuality: Number(x.automationQuality),
    actionability: Number(x.actionability),
    groundingAndRisk: Number(x.groundingAndRisk),
    total: Number(x.total),
    feasible: Boolean(x.feasible),
    reason: String(x.reason || ''),
  };
}

describe('DSG ONE deterministic grounded revenue pool v3'`;

if (!oldJudge.test(source)) {
  throw new Error('Could not locate v3 judge block');
}
source = source.replace(oldJudge, newJudge);

const oldCall = `const scores = await judge(apiKey!, model, [answers.baseline, answers.composite], evidence.pack); expect(scores.length).toBe(2); const baselineScore = scores[0]; const compositeScore = scores[1];`;
const newCall = `const baselineScore = await judgeOne(apiKey!, model, answers.baseline, evidence.pack); const compositeScore = await judgeOne(apiKey!, model, answers.composite, evidence.pack);`;
if (!source.includes(oldCall)) {
  throw new Error('Could not locate v3 judge invocation');
}
source = source.replace(oldCall, newCall);
writeFileSync(targetPath, source);
console.log(`prepared ${targetPath}`);
