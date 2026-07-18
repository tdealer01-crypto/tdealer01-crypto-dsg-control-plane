'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ProofChain {
  requestHash: string;
  proofHash: string;
  bundleHash: string;
  merkleRoot: string;
}

interface TestResult {
  testId: string;
  timestamp: string;
  testCase: {
    minRequired: number;
    actualCount: number;
    testName: string;
  };
  decision: 'ALLOW' | 'BLOCK';
  reason: string;
  proofChain: ProofChain;
  ccvsLevel: 'L1' | 'L2' | 'L3';
  compliance: {
    ccvs: boolean;
    pdpa: boolean;
    euAiAct: boolean;
  };
  evidence: {
    deterministic: boolean;
    replayable: boolean;
    tamperable: false;
  };
  auditTrail: {
    created: string;
    shareableLink: string;
  };
}

export default function TestResultPage() {
  const params = useParams();
  const testId = params.testId as string;
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation, this would fetch from a results database
    // For now, we show the structure with mock data
    const mockResult: TestResult = {
      testId: testId || 'mock-test-id',
      timestamp: new Date().toISOString(),
      testCase: {
        minRequired: 2,
        actualCount: 1,
        testName: 'Insufficient Arbiters Test',
      },
      decision: 'BLOCK',
      reason: 'ARBITER_COUNT_INSUFFICIENT: got 1, need 2',
      proofChain: {
        requestHash: 'sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z',
        proofHash: 'sha256:x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4',
        bundleHash: 'sha256:m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6',
        merkleRoot: 'sha256:z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4',
      },
      ccvsLevel: 'L2',
      compliance: {
        ccvs: true,
        pdpa: true,
        euAiAct: true,
      },
      evidence: {
        deterministic: true,
        replayable: true,
        tamperable: false,
      },
      auditTrail: {
        created: new Date().toISOString(),
        shareableLink: `/public/test-result/${testId}`,
      },
    };

    // Simulate loading
    setResult(mockResult);
    setLoading(false);
  }, [testId]);

  const handleExportJSON = () => {
    if (!result) return;
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test-result-${result.testId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!result) return;
    const headers = ['Test ID', 'Timestamp', 'Decision', 'Reason', 'Min Required', 'Actual Count'];
    const data = [
      result.testId,
      result.timestamp,
      result.decision,
      result.reason,
      result.testCase.minRequired,
      result.testCase.actualCount,
    ];
    const csvContent = [headers, data].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test-result-${result.testId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07080a] text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-300 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-slate-400">กำลังโหลดผลการทดสอบ...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="min-h-screen bg-[#07080a] text-white p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/public/test" className="text-emerald-300 hover:text-emerald-200 text-sm font-semibold mb-4 block">
            ← กลับไปยังการทดสอบ
          </Link>
          <div className="border border-red-300/20 bg-red-400/5 rounded-lg p-6">
            <p className="text-red-100">ไม่พบผลการทดสอบ</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07080a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/public/test" className="text-emerald-300 hover:text-emerald-200 text-sm font-semibold">
            ← กลับไปยังการทดสอบ
          </Link>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">ผลการทดสอบ Arbiter Count</h1>
          <p className="text-slate-400">Test ID: {result.testId}</p>
        </div>

        {/* Decision Box */}
        <div
          className={`border rounded-lg p-6 mb-8 ${
            result.decision === 'ALLOW'
              ? 'border-emerald-300/30 bg-emerald-400/5'
              : 'border-red-300/30 bg-red-400/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">สถานะการตัดสินใจ</p>
              <p className={`text-4xl font-bold ${result.decision === 'ALLOW' ? 'text-emerald-300' : 'text-red-300'}`}>
                {result.decision}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">CCVS Level</p>
              <p className="text-3xl font-bold text-blue-300">{result.ccvsLevel}</p>
            </div>
          </div>
        </div>

        {/* Test Case Details */}
        <div className="border border-slate-500/20 bg-slate-900/50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">🧪 รายละเอียดการทดสอบ</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">ชื่อการทดสอบ</p>
              <p className="text-slate-100">{result.testCase.testName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">เวลา</p>
              <p className="text-slate-100">{new Date(result.timestamp).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">จำนวนหนึ่งต่ออย่างน้อย</p>
              <p className="text-2xl font-bold text-emerald-300">{result.testCase.minRequired}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">จำนวนที่แท้จริง</p>
              <p className="text-2xl font-bold text-amber-300">{result.testCase.actualCount}</p>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="border border-slate-500/20 bg-slate-900/50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">📝 เหตุผล</h2>
          <p className="text-slate-100 font-mono">{result.reason}</p>
        </div>

        {/* Proof Chain */}
        <div className="border border-purple-300/20 bg-purple-400/5 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">🔐 ห่วงโซ่พิสูจน์ SHA-256</h2>
          <div className="space-y-4">
            <div className="bg-black/50 rounded p-4 border border-purple-300/20">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Request Hash</p>
              <p className="text-sm text-purple-100 font-mono break-all">{result.proofChain.requestHash}</p>
            </div>
            <div className="bg-black/50 rounded p-4 border border-purple-300/20">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Proof Hash</p>
              <p className="text-sm text-purple-100 font-mono break-all">{result.proofChain.proofHash}</p>
            </div>
            <div className="bg-black/50 rounded p-4 border border-purple-300/20">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Bundle Hash</p>
              <p className="text-sm text-purple-100 font-mono break-all">{result.proofChain.bundleHash}</p>
            </div>
            <div className="bg-black/50 rounded p-4 border border-purple-300/20">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Merkle Root</p>
              <p className="text-sm text-purple-100 font-mono break-all">{result.proofChain.merkleRoot}</p>
            </div>
          </div>
        </div>

        {/* Evidence & Compliance */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Evidence */}
          <div className="border border-blue-300/20 bg-blue-400/5 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">✓ หลักฐาน</h2>
            <ul className="space-y-3">
              <li className="flex items-center text-blue-100">
                <span className={`inline-block w-4 h-4 rounded mr-3 ${result.evidence.deterministic ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                Deterministic: {result.evidence.deterministic ? 'ใช่' : 'ไม่ใช่'}
              </li>
              <li className="flex items-center text-blue-100">
                <span className={`inline-block w-4 h-4 rounded mr-3 ${result.evidence.replayable ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                Replayable: {result.evidence.replayable ? 'ใช่' : 'ไม่ใช่'}
              </li>
              <li className="flex items-center text-blue-100">
                <span className={`inline-block w-4 h-4 rounded mr-3 ${!result.evidence.tamperable ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                ไม่สามารถปลอมได้: {!result.evidence.tamperable ? 'ใช่' : 'ไม่ใช่'}
              </li>
            </ul>
          </div>

          {/* Compliance */}
          <div className="border border-green-300/20 bg-green-400/5 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">⚖️ การปฏิบัติตามกฎ</h2>
            <ul className="space-y-3">
              <li className="flex items-center text-green-100">
                <span className={`inline-block w-4 h-4 rounded mr-3 ${result.compliance.ccvs ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                CCVS: {result.compliance.ccvs ? 'ผ่าน' : 'ไม่ผ่าน'}
              </li>
              <li className="flex items-center text-green-100">
                <span className={`inline-block w-4 h-4 rounded mr-3 ${result.compliance.pdpa ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                PDPA มาตรา 37: {result.compliance.pdpa ? 'ผ่าน' : 'ไม่ผ่าน'}
              </li>
              <li className="flex items-center text-green-100">
                <span className={`inline-block w-4 h-4 rounded mr-3 ${result.compliance.euAiAct ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                EU AI Act: {result.compliance.euAiAct ? 'ผ่าน' : 'ไม่ผ่าน'}
              </li>
            </ul>
          </div>
        </div>

        {/* Export Options */}
        <div className="border border-orange-300/20 bg-orange-400/5 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">📥 ส่งออกผลลัพธ์</h2>
          <p className="text-slate-300 mb-4">เลือกรูปแบบการส่งออกสำหรับบันทึกการตรวจสอบอย่างเต็มรูปแบบ:</p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExportJSON}
              className="bg-orange-300 text-slate-950 px-6 py-3 rounded-lg font-semibold hover:bg-orange-200 transition"
            >
              📄 ส่งออก JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="border border-orange-300/40 text-orange-100 px-6 py-3 rounded-lg font-semibold hover:bg-orange-300/10 transition"
            >
              📊 ส่งออก CSV
            </button>
          </div>
        </div>

        {/* Verification Info */}
        <div className="border border-slate-500/20 bg-slate-900/50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">🔍 การตรวจสอบ</h2>
          <p className="text-slate-300 mb-4">
            ผลลัพธ์นี้สามารถตรวจสอบได้ด้วยการเรียกใช้ API สาธารณะอีกครั้งด้วยพารามิเตอร์เดียวกัน หากห่วงโซ่พิสูจน์ตรงกัน แสดงว่าผลลัพธ์ไม่ได้ถูกปลอมแปลง
          </p>
          <div className="bg-black/50 rounded p-4 border border-slate-500/20">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">API Endpoint</p>
            <p className="text-sm text-slate-100 font-mono">/api/public/test/arbiter-validation</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-slate-500/20">
          <p className="text-slate-400 text-sm mb-4">สร้างเมื่อ {new Date(result.timestamp).toLocaleString()}</p>
          <Link
            href="/public/test"
            className="inline-block bg-emerald-300 text-slate-950 px-6 py-3 rounded-lg font-bold hover:bg-emerald-200 transition"
          >
            ← กลับไปยังการทดสอบ
          </Link>
        </div>
      </div>
    </main>
  );
}
