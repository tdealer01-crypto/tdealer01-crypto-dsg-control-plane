'use client';

import { useState } from 'react';
import Link from 'next/link';

interface TestResult {
  testId: string;
  timestamp: string;
  decision: 'ALLOW' | 'BLOCK';
  reason: string;
  proofChain: {
    requestHash: string;
    proofHash: string;
    bundleHash: string;
    merkleRoot: string;
  };
  ccvsLevel: 'L1' | 'L2' | 'L3';
  auditTrail: {
    shareableLink: string;
  };
}

type Language = 'th' | 'en';

const translations: Record<Language, Record<string, string>> = {
  th: {
    backHome: '← กลับหน้าหลัก',
    title: '🧪 ระบบการทดสอบสาธารณะ',
    subtitle: 'ทดสอบการตรวจสอบ Arbiter Count โดยบุคคลที่สาม ด้วยความเป็นอิสระและโปร่งใส',
    badge: '✓ ไม่ต้องสมัครสมาชิก • ไม่ต้องการ API key • ผลลัพธ์ชะบ่อนหลักฐานที่สามารถตรวจสอบได้',
    setupLabel: '⚙️ ตั้งค่าการทดสอบ',
    minArbiterLabel: 'จำนวน Arbiters ที่ต้องการ (ขั้นต่ำ)',
    actualArbiterLabel: 'จำนวน Arbiters ที่แท้จริง',
    testNameLabel: 'ชื่อการทดสอบ (ทางเลือก)',
    testNamePlaceholder: 'เช่น Insufficient Arbiters',
    runTestBtn: '▶️ เรียกใช้การทดสอบ',
    runningBtn: 'กำลังดำเนินการทดสอบ...',
    quickTemplates: 'แม่แบบด่วน',
    insufficient: '❌ ไม่เพียงพอ (2/1)',
    perfect: '✅ พอดี (2/2)',
    exceeded: '✅ เกิน (2/3)',
    result: 'ผลลัพธ์',
    ccvs: 'CCVS',
    testId: 'Test ID',
    time: 'เวลา',
    status: 'สถานะ',
    verified: '✓ ตรวจสอบแล้ว',
    proofChain: '🔐 ห่วงโซ่พิสูจน์',
    requestHash: 'Request Hash',
    proofHash: 'Proof Hash',
    merkleRoot: 'Merkle Root',
    viewDetails: '📋 ดูรายละเอียดเต็ม',
    exportJSON: '📥 ส่งออก JSON',
    runTestHint: 'เรียกใช้การทดสอบด้านซ้ายเพื่อดูผลลัพธ์',
    resultsHere: 'ผลลัพธ์จะปรากฏที่นี่',
    testHistory: '📊 ประวัติการทดสอบ',
    tamperProof: '🔍 ป้องกันการปลอมแปลง',
    tamperProofDesc: 'SHA-256 WORM Chain ทำให้ไม่สามารถเปลี่ยนผลลัพธ์ได้โดยไม่บอก',
    compliant: '⚖️ สอดคล้องกับกฎเกณฑ์',
    compliantDesc: 'ผลลัพธ์ทั้งหมดพร้อมสำหรับ CCVS, PDPA, EU AI Act',
    verifiable: '✓ ตรวจสอบได้',
    verifiableDesc: 'ทำซ้ำการทดสอบเดิมด้วยพารามิเตอร์เดียวกันเพื่อยืนยัน',
    seeCode: 'ต้องการดูโค้ด? เยี่ยมชมที่',
    testError: 'ไม่สามารถดำเนินการทดสอบได้',
    generalError: 'เกิดข้อผิดพลาด',
  },
  en: {
    backHome: '← Back Home',
    title: '🧪 Public Testing System',
    subtitle: 'Third-party Arbiter Count verification with independence and transparency',
    badge: '✓ No signup • No API key • Tamper-proof verifiable results',
    setupLabel: '⚙️ Test Configuration',
    minArbiterLabel: 'Minimum Arbiters Required',
    actualArbiterLabel: 'Actual Arbiters',
    testNameLabel: 'Test Name (optional)',
    testNamePlaceholder: 'e.g., Insufficient Arbiters',
    runTestBtn: '▶️ Run Test',
    runningBtn: 'Running test...',
    quickTemplates: 'Quick Templates',
    insufficient: '❌ Insufficient (2/1)',
    perfect: '✅ Perfect (2/2)',
    exceeded: '✅ Exceeded (2/3)',
    result: 'Result',
    ccvs: 'CCVS',
    testId: 'Test ID',
    time: 'Time',
    status: 'Status',
    verified: '✓ Verified',
    proofChain: '🔐 Proof Chain',
    requestHash: 'Request Hash',
    proofHash: 'Proof Hash',
    merkleRoot: 'Merkle Root',
    viewDetails: '📋 View Full Details',
    exportJSON: '📥 Export JSON',
    runTestHint: 'Run a test on the left to see results',
    resultsHere: 'Results will appear here',
    testHistory: '📊 Test History',
    tamperProof: '🔍 Tamper-Proof',
    tamperProofDesc: 'SHA-256 WORM Chain makes results immutable without detection',
    compliant: '⚖️ Regulatory Compliant',
    compliantDesc: 'All results ready for CCVS, PDPA, EU AI Act',
    verifiable: '✓ Verifiable',
    verifiableDesc: 'Replay the same test with same parameters to verify',
    seeCode: 'Want to see the code? Visit',
    testError: 'Unable to run test',
    generalError: 'An error occurred',
  },
};

export default function PublicTestPage() {
  const [language, setLanguage] = useState<Language>('th');
  const [minArbiterCount, setMinArbiterCount] = useState(1);
  const [actualArbiterCount, setActualArbiterCount] = useState(0);
  const [testName, setTestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);

  const t = translations[language];

  const handleRunTest = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/public/test/arbiter-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minArbiterCount,
          actualArbiterCount,
          testName: testName || `Test ${minArbiterCount}/${actualArbiterCount}`,
        }),
      });

      if (!response.ok) {
        throw new Error(t.testError);
      }

      const data = await response.json() as TestResult;
      setResult(data);
      setTestHistory([data, ...testHistory.slice(0, 4)]);

      // Store result in sessionStorage for result viewer to access
      const storedResults = sessionStorage.getItem('public-test-results');
      const results: Record<string, TestResult> = storedResults ? JSON.parse(storedResults) : {};
      results[data.testId] = data;
      sessionStorage.setItem('public-test-results', JSON.stringify(results));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.generalError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07080a] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Language Toggle */}
        <div className="mb-8 flex justify-between items-center">
          <Link href="/" className="text-emerald-300 hover:text-emerald-200 text-sm font-semibold">
            {t.backHome}
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('th')}
              className={`px-3 py-1 rounded text-sm font-semibold transition ${
                language === 'th'
                  ? 'bg-emerald-300 text-slate-950'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              ไทย
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded text-sm font-semibold transition ${
                language === 'en'
                  ? 'bg-emerald-300 text-slate-950'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">{t.title}</h1>
          <p className="text-xl text-slate-300 mb-6">
            {t.subtitle}
          </p>
          <div className="inline-block bg-emerald-400/10 border border-emerald-300/30 rounded-lg px-4 py-2 text-emerald-100 text-sm">
            {t.badge}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Test Input */}
          <div className="md:col-span-1">
            <div className="border border-emerald-300/20 bg-emerald-400/5 rounded-2xl p-8 sticky top-8">
              <h2 className="text-2xl font-bold text-white mb-6">{t.setupLabel}</h2>

              {/* Min Arbiter Count */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-emerald-100 mb-2">
                  {t.minArbiterLabel}
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={minArbiterCount}
                  onChange={(e) => setMinArbiterCount(Number(e.target.value))}
                  className="w-full h-2 bg-emerald-300/20 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-3xl font-bold text-emerald-300 mt-2 text-center">{minArbiterCount}</div>
              </div>

              {/* Actual Arbiter Count */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-amber-100 mb-2">
                  {t.actualArbiterLabel}
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={actualArbiterCount}
                  onChange={(e) => setActualArbiterCount(Number(e.target.value))}
                  className="w-full h-2 bg-amber-300/20 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-3xl font-bold text-amber-300 mt-2 text-center">{actualArbiterCount}</div>
              </div>

              {/* Test Name */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  {t.testNameLabel}
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder={t.testNamePlaceholder}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-500/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-300/50"
                />
              </div>

              {/* Run Test Button */}
              <button
                onClick={handleRunTest}
                disabled={loading}
                className="w-full bg-emerald-300 text-slate-950 px-6 py-3 rounded-lg font-bold hover:bg-emerald-200 disabled:bg-slate-500 disabled:cursor-not-allowed transition"
              >
                {loading ? t.runningBtn : t.runTestBtn}
              </button>

              {/* Quick Templates */}
              <div className="mt-8 pt-8 border-t border-emerald-300/20">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">{t.quickTemplates}</p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setMinArbiterCount(2);
                      setActualArbiterCount(1);
                      setTestName(language === 'th' ? 'ไม่เพียงพอ' : 'Insufficient');
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded border border-emerald-300/30 text-emerald-100 hover:bg-emerald-300/10"
                  >
                    {t.insufficient}
                  </button>
                  <button
                    onClick={() => {
                      setMinArbiterCount(2);
                      setActualArbiterCount(2);
                      setTestName(language === 'th' ? 'พอดี' : 'Perfect');
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded border border-emerald-300/30 text-emerald-100 hover:bg-emerald-300/10"
                  >
                    {t.perfect}
                  </button>
                  <button
                    onClick={() => {
                      setMinArbiterCount(2);
                      setActualArbiterCount(3);
                      setTestName(language === 'th' ? 'เกิน' : 'Exceeded');
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded border border-emerald-300/30 text-emerald-100 hover:bg-emerald-300/10"
                  >
                    {t.exceeded}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="md:col-span-2">
            {error && (
              <div className="border border-red-300/20 bg-red-400/5 rounded-lg p-6 mb-6">
                <p className="text-red-100">⚠️ {error}</p>
              </div>
            )}

            {result ? (
              <div className="space-y-6">
                {/* Decision Result */}
                <div
                  className={`border rounded-lg p-8 ${
                    result.decision === 'ALLOW'
                      ? 'border-emerald-300/30 bg-emerald-400/5'
                      : 'border-red-300/30 bg-red-400/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">{t.result}</p>
                      <p
                        className={`text-5xl font-bold ${
                          result.decision === 'ALLOW' ? 'text-emerald-300' : 'text-red-300'
                        }`}
                      >
                        {result.decision}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">{t.ccvs}</p>
                      <p className="text-3xl font-bold text-blue-300">{result.ccvsLevel}</p>
                    </div>
                  </div>
                  <div className="bg-black/30 rounded p-4 border border-slate-500/20">
                    <p className="text-slate-100 font-mono text-sm">{result.reason}</p>
                  </div>
                </div>

                {/* Test Metadata */}
                <div className="border border-slate-500/20 bg-slate-900/50 rounded-lg p-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.testId}</p>
                      <p className="text-slate-100 font-mono text-sm truncate">{result.testId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.time}</p>
                      <p className="text-slate-100 text-sm">
                        {new Date(result.timestamp).toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.status}</p>
                      <p className="text-emerald-100 text-sm">✓ {t.verified}</p>
                    </div>
                  </div>
                </div>

                {/* Proof Chain Preview */}
                <div className="border border-purple-300/20 bg-purple-400/5 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">{t.proofChain}</h3>
                  <div className="space-y-2">
                    <div className="bg-black/50 rounded p-3 border border-purple-300/20">
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.requestHash}</p>
                      <p className="text-xs text-purple-100 font-mono truncate">
                        {result.proofChain.requestHash}
                      </p>
                    </div>
                    <div className="bg-black/50 rounded p-3 border border-purple-300/20">
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.proofHash}</p>
                      <p className="text-xs text-purple-100 font-mono truncate">
                        {result.proofChain.proofHash}
                      </p>
                    </div>
                    <div className="bg-black/50 rounded p-3 border border-purple-300/20">
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.merkleRoot}</p>
                      <p className="text-xs text-purple-100 font-mono truncate">
                        {result.proofChain.merkleRoot}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                  <Link
                    href={result.auditTrail.shareableLink}
                    className="flex-1 bg-blue-300 text-slate-950 px-6 py-3 rounded-lg font-bold hover:bg-blue-200 transition text-center"
                  >
                    {t.viewDetails}
                  </Link>
                  <button
                    onClick={() => {
                      const jsonStr = JSON.stringify(result, null, 2);
                      const blob = new Blob([jsonStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `test-result-${result.testId}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex-1 border border-blue-300/40 text-blue-100 px-6 py-3 rounded-lg font-bold hover:bg-blue-300/10 transition"
                  >
                    {t.exportJSON}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-slate-500/20 bg-slate-900/50 rounded-lg p-12 text-center">
                <p className="text-slate-400 mb-4">{t.runTestHint}</p>
                <div className="text-5xl mb-2">🧪</div>
                <p className="text-slate-500 text-sm">{t.resultsHere}</p>
              </div>
            )}

            {/* Test History */}
            {testHistory.length > 0 && (
              <div className="mt-8 border border-slate-500/20 bg-slate-900/50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">{t.testHistory}</h3>
                <div className="space-y-2">
                  {testHistory.map((test, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-black/30 rounded border border-slate-500/20"
                    >
                      <div>
                        <p className="text-sm font-mono text-slate-300 truncate">{test.testId}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(test.timestamp).toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US')}
                        </p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded text-sm font-bold ${
                          test.decision === 'ALLOW'
                            ? 'bg-emerald-500/20 text-emerald-100'
                            : 'bg-red-500/20 text-red-100'
                        }`}
                      >
                        {test.decision}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="border border-blue-300/20 bg-blue-400/5 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">{t.tamperProof}</h3>
            <p className="text-slate-300 text-sm">
              {t.tamperProofDesc}
            </p>
          </div>
          <div className="border border-green-300/20 bg-green-400/5 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">{t.compliant}</h3>
            <p className="text-slate-300 text-sm">
              {t.compliantDesc}
            </p>
          </div>
          <div className="border border-purple-300/20 bg-purple-400/5 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-3">{t.verifiable}</h3>
            <p className="text-slate-300 text-sm">
              {t.verifiableDesc}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-slate-500/20">
          <p className="text-slate-400 text-sm mb-4">
            {t.seeCode} <code className="text-emerald-300">/api/public/test/arbiter-validation</code>
          </p>
          <Link href="/" className="text-emerald-300 hover:text-emerald-200 text-sm font-semibold">
            {t.backHome}
          </Link>
        </div>
      </div>
    </main>
  );
}
