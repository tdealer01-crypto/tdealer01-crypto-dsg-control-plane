'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

type Language = 'th' | 'en';

const translations: Record<Language, Record<string, string>> = {
  th: {
    backToTest: '← กลับไปยังการทดสอบ',
    title: 'ผลการทดสอบ Arbiter Count',
    testIdLabel: 'Test ID:',
    decisionStatus: 'สถานะการตัดสินใจ',
    ccvsLevel: 'CCVS Level',
    testDetails: '🧪 รายละเอียดการทดสอบ',
    testName: 'ชื่อการทดสอบ',
    time: 'เวลา',
    minRequired: 'จำนวนหนึ่งต่ออย่างน้อย',
    actualCount: 'จำนวนที่แท้จริง',
    reason: '📝 เหตุผล',
    proofChain: '🔐 ห่วงโซ่พิสูจน์ SHA-256',
    requestHash: 'Request Hash',
    proofHash: 'Proof Hash',
    bundleHash: 'Bundle Hash',
    merkleRoot: 'Merkle Root',
    evidence: '✓ หลักฐาน',
    deterministic: 'Deterministic',
    replayable: 'Replayable',
    tamperable: 'ไม่สามารถปลอมได้',
    yes: 'ใช่',
    no: 'ไม่ใช่',
    compliance: '⚖️ การปฏิบัติตามกฎ',
    ccvsCompliance: 'CCVS',
    pdpaCompliance: 'PDPA มาตรา 37',
    euAiActCompliance: 'EU AI Act',
    pass: 'ผ่าน',
    fail: 'ไม่ผ่าน',
    exportResults: '📥 ส่งออกผลลัพธ์',
    exportDescription: 'เลือกรูปแบบการส่งออกสำหรับบันทึกการตรวจสอบอย่างเต็มรูปแบบ:',
    exportJSON: '📄 ส่งออก JSON',
    exportCSV: '📊 ส่งออก CSV',
    verification: '🔍 การตรวจสอบ',
    verificationDesc: 'ผลลัพธ์นี้สามารถตรวจสอบได้ด้วยการเรียกใช้ API สาธารณะอีกครั้งด้วยพารามิเตอร์เดียวกัน หากห่วงโซ่พิสูจน์ตรงกัน แสดงว่าผลลัพธ์ไม่ได้ถูกปลอมแปลง',
    apiEndpoint: 'API Endpoint',
    createdAt: 'สร้างเมื่อ',
    loading: 'กำลังโหลดผลการทดสอบ...',
    notFound: 'ไม่พบผลการทดสอบ',
    dbError: 'ไม่สามารถเข้าถึงฐานข้อมูล',
    loadError: 'เกิดข้อผิดพลาดในการโหลดผลการทดสอบ',
  },
  en: {
    backToTest: '← Back to Test',
    title: 'Arbiter Count Test Result',
    testIdLabel: 'Test ID:',
    decisionStatus: 'Decision Status',
    ccvsLevel: 'CCVS Level',
    testDetails: '🧪 Test Details',
    testName: 'Test Name',
    time: 'Time',
    minRequired: 'Minimum Required',
    actualCount: 'Actual Count',
    reason: '📝 Reason',
    proofChain: '🔐 SHA-256 Proof Chain',
    requestHash: 'Request Hash',
    proofHash: 'Proof Hash',
    bundleHash: 'Bundle Hash',
    merkleRoot: 'Merkle Root',
    evidence: '✓ Evidence',
    deterministic: 'Deterministic',
    replayable: 'Replayable',
    tamperable: 'Not Tamperable',
    yes: 'Yes',
    no: 'No',
    compliance: '⚖️ Compliance',
    ccvsCompliance: 'CCVS',
    pdpaCompliance: 'PDPA Section 37',
    euAiActCompliance: 'EU AI Act',
    pass: 'Pass',
    fail: 'Fail',
    exportResults: '📥 Export Results',
    exportDescription: 'Choose an export format to save the full audit record:',
    exportJSON: '📄 Export JSON',
    exportCSV: '📊 Export CSV',
    verification: '🔍 Verification',
    verificationDesc: 'This result can be verified by calling the public API again with the same parameters. If the proof chain matches, the result has not been tampered with.',
    apiEndpoint: 'API Endpoint',
    createdAt: 'Created',
    loading: 'Loading test result...',
    notFound: 'Test result not found',
    dbError: 'Unable to access database',
    loadError: 'Error loading test result',
  },
};

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
  const [language, setLanguage] = useState<Language>('th');
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = translations[language];

  useEffect(() => {
    const fetchResult = async () => {
      try {
        // First, try sessionStorage for same-tab immediate access
        const storedResults = sessionStorage.getItem('public-test-results');
        const results: Record<string, TestResult> = storedResults ? JSON.parse(storedResults) : {};

        if (results[testId]) {
          setResult(results[testId]);
          setLoading(false);
          return;
        }

        // If not in sessionStorage, fetch from Supabase
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !anonKey) {
          setError(language === 'th' ? 'ไม่สามารถเข้าถึงฐานข้อมูล' : 'Unable to access database');
          setLoading(false);
          return;
        }

        const supabase = createClient(url, anonKey);

        // Fetch from public_test_results table (RLS allows public read)
        const { data, error: fetchError } = await supabase
          .from('public_test_results')
          .select('result_json')
          .eq('test_id', testId)
          .single();

        if (fetchError || !data) {
          setError(language === 'th' ? 'ไม่พบผลการทดสอบ' : 'Test result not found');
          setLoading(false);
          return;
        }

        // Parse and display result
        const testResult = data.result_json as TestResult;
        setResult(testResult);

        // Cache in sessionStorage for future same-session access
        const cachedResults = sessionStorage.getItem('public-test-results');
        const updatedResults: Record<string, TestResult> = cachedResults ? JSON.parse(cachedResults) : {};
        updatedResults[testId] = testResult;
        sessionStorage.setItem('public-test-results', JSON.stringify(updatedResults));

        setLoading(false);
      } catch (err) {
        setError(language === 'th' ? 'เกิดข้อผิดพลาดในการโหลดผลการทดสอบ' : 'Error loading test result');
        setLoading(false);
      }
    };

    fetchResult();
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
            <p className="mt-4 text-slate-400">{t.loading}</p>
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
            {t.backToTest}
          </Link>
          <div className="border border-red-300/20 bg-red-400/5 rounded-lg p-6">
            <p className="text-red-100">{error || t.notFound}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07080a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Language Toggle */}
        <div className="mb-8 flex justify-between items-center">
          <Link href="/public/test" className="text-emerald-300 hover:text-emerald-200 text-sm font-semibold">
            {t.backToTest}
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t.title}</h1>
          <p className="text-slate-400">{t.testIdLabel} {result.testId}</p>
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
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">{t.decisionStatus}</p>
              <p className={`text-4xl font-bold ${result.decision === 'ALLOW' ? 'text-emerald-300' : 'text-red-300'}`}>
                {result.decision}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">{t.ccvsLevel}</p>
              <p className="text-3xl font-bold text-blue-300">{result.ccvsLevel}</p>
            </div>
          </div>
        </div>

        {/* Test Case Details */}
        <div className="border border-slate-500/20 bg-slate-900/50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">{t.testDetails}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.testName}</p>
              <p className="text-slate-100">{result.testCase.testName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.time}</p>
              <p className="text-slate-100">{new Date(result.timestamp).toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.minRequired}</p>
              <p className="text-2xl font-bold text-emerald-300">{result.testCase.minRequired}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t.actualCount}</p>
              <p className="text-2xl font-bold text-amber-300">{result.testCase.actualCount}</p>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="border border-slate-500/20 bg-slate-900/50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">{t.reason}</h2>
          <p className="text-slate-100 font-mono">{result.reason}</p>
        </div>

        {/* Proof Chain */}
        <div className="border border-purple-300/20 bg-purple-400/5 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">{t.proofChain}</h2>
          <div className="space-y-4">
            <div className="bg-black/50 rounded p-4 border border-purple-300/20">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">{t.requestHash}</p>
              <p className="text-sm text-purple-100 font-mono break-all">{result.proofChain.requestHash}</p>
            </div>
            <div className="bg-black/50 rounded p-4 border border-purple-300/20">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">{t.proofHash}</p>
              <p className="text-sm text-purple-100 font-mono break-all">{result.proofChain.proofHash}</p>
            </div>
            <div className="bg-black/50 rounded p-4 border border-purple-300/20">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">{t.bundleHash}</p>
              <p className="text-sm text-purple-100 font-mono break-all">{result.proofChain.bundleHash}</p>
            </div>
            <div className="bg-black/50 rounded p-4 border border-purple-300/20">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">{t.merkleRoot}</p>
              <p className="text-sm text-purple-100 font-mono break-all">{result.proofChain.merkleRoot}</p>
            </div>
          </div>
        </div>

        {/* Evidence & Compliance */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Evidence */}
          <div className="border border-blue-300/20 bg-blue-400/5 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">{t.evidence}</h2>
            <ul className="space-y-3">
              <li className="flex items-center text-blue-100">
                <span className={`inline-block w-4 h-4 rounded mr-3 ${result.evidence.deterministic ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                {t.deterministic}: {result.evidence.deterministic ? t.yes : t.no}
              </li>
              <li className="flex items-center text-blue-100">
                <span className={`inline-block w-4 h-4 rounded mr-3 ${result.evidence.replayable ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                {t.replayable}: {result.evidence.replayable ? t.yes : t.no}
              </li>
              <li className="flex items-center text-blue-100">
                <span className={`inline-block w-4 h-4 rounded mr-3 ${!result.evidence.tamperable ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                {t.tamperable}: {!result.evidence.tamperable ? t.yes : t.no}
              </li>
            </ul>
          </div>

          {/* Compliance */}
          <div className="border border-green-300/20 bg-green-400/5 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">{t.compliance}</h2>
            <ul className="space-y-3">
              <li className="flex items-center text-green-100">
                <span className={`inline-block w-4 h-4 rounded mr-3 ${result.compliance.ccvs ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                {t.ccvsCompliance}: {result.compliance.ccvs ? t.pass : t.fail}
              </li>
              <li className="flex items-center text-green-100">
                <span className={`inline-block w-4 h-4 rounded mr-3 ${result.compliance.pdpa ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                {t.pdpaCompliance}: {result.compliance.pdpa ? t.pass : t.fail}
              </li>
              <li className="flex items-center text-green-100">
                <span className={`inline-block w-4 h-4 rounded mr-3 ${result.compliance.euAiAct ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                {t.euAiActCompliance}: {result.compliance.euAiAct ? t.pass : t.fail}
              </li>
            </ul>
          </div>
        </div>

        {/* Export Options */}
        <div className="border border-orange-300/20 bg-orange-400/5 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">{t.exportResults}</h2>
          <p className="text-slate-300 mb-4">{t.exportDescription}</p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExportJSON}
              className="bg-orange-300 text-slate-950 px-6 py-3 rounded-lg font-semibold hover:bg-orange-200 transition"
            >
              {t.exportJSON}
            </button>
            <button
              onClick={handleExportCSV}
              className="border border-orange-300/40 text-orange-100 px-6 py-3 rounded-lg font-semibold hover:bg-orange-300/10 transition"
            >
              {t.exportCSV}
            </button>
          </div>
        </div>

        {/* Verification Info */}
        <div className="border border-slate-500/20 bg-slate-900/50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">{t.verification}</h2>
          <p className="text-slate-300 mb-4">
            {t.verificationDesc}
          </p>
          <div className="bg-black/50 rounded p-4 border border-slate-500/20">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">{t.apiEndpoint}</p>
            <p className="text-sm text-slate-100 font-mono">/api/public/test/arbiter-validation</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-slate-500/20">
          <p className="text-slate-400 text-sm mb-4">{t.createdAt} {new Date(result.timestamp).toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</p>
          <Link
            href="/public/test"
            className="inline-block bg-emerald-300 text-slate-950 px-6 py-3 rounded-lg font-bold hover:bg-emerald-200 transition"
          >
            {t.backToTest}
          </Link>
        </div>
      </div>
    </main>
  );
}
