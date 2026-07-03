/**
 * Example: Integrating ThaiAgentControlPanel into a Dashboard Page
 *
 * This file demonstrates how to use the PageAgent components
 * in an actual dashboard page component.
 *
 * USAGE:
 * Copy this pattern into your actual dashboard pages.
 */

'use client';

import { useState } from 'react';
import { ThaiAgentControlPanel } from './thai-agent-component';

/**
 * Example Dashboard Page with Thai AI Agent Control
 */
export function ExampleDashboardWithAgent() {
  const [lastCommand, setLastCommand] = useState<string>('');
  const [commandResults, setCommandResults] = useState<any[]>([]);

  const handleCommandExecuted = (response: any) => {
    if (response.success) {
      setLastCommand(`✅ ${response.commandType}: บันทึกเวลา ${response.timestamp}`);
      setCommandResults((prev) => [...prev, response].slice(-5)); // Keep last 5
    } else {
      setLastCommand(`❌ ข้อผิดพลาด: ${response.error}`);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard ของฉัน</h1>
        <p className="text-gray-600">ควบคุม dashboard ด้วยคำสั่งภาษาไทย</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Sidebar - Control Panel */}
        <div className="md:col-span-1">
          <ThaiAgentControlPanel
            onCommandExecuted={handleCommandExecuted}
            showHistory={true}
            maxHistorySize={10}
          />
        </div>

        {/* Main Content - Dashboard Stats */}
        <div className="md:col-span-2 space-y-4">
          {/* Status Section */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold">สถานะระบบ</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded bg-green-50 p-4">
                <p className="text-sm text-gray-600">สถานะการเชื่อมต่อ</p>
                <p className="text-2xl font-bold text-green-700">✓ ปกติ</p>
              </div>
              <div className="rounded bg-blue-50 p-4">
                <p className="text-sm text-gray-600">คำสั่งที่รันแล้ว</p>
                <p className="text-2xl font-bold text-blue-700">{commandResults.length}</p>
              </div>
            </div>
          </div>

          {/* Last Command Status */}
          {lastCommand && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-2 text-lg font-semibold">คำสั่งล่าสุด</h3>
              <p className="text-gray-700">{lastCommand}</p>
            </div>
          )}

          {/* Commands Executed */}
          {commandResults.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold">ประวัติการรัน ({commandResults.length})</h3>
              <div className="space-y-2">
                {commandResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`rounded p-3 text-sm ${
                      result.success
                        ? 'bg-green-50 text-green-800'
                        : 'bg-red-50 text-red-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{result.commandType}</span>
                      <span className="text-xs">
                        {new Date(result.timestamp).toLocaleTimeString('th-TH')}
                      </span>
                    </div>
                    {result.result && (
                      <p className="mt-1 truncate opacity-75">
                        {typeof result.result === 'string'
                          ? result.result
                          : JSON.stringify(result.result).substring(0, 100)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documentation Section */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="mb-4 text-lg font-semibold">ตัวอย่างคำสั่ง</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 font-semibold text-gray-700">การนำทาง</p>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• ไปที่หน้า agents</li>
              <li>• เปิด menu ด้านข้าง</li>
              <li>• กลับไปหน้าแรก</li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-semibold text-gray-700">ข้อมูล</p>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• ค้นหา agent ที่ใช้งาน</li>
              <li>• สรุปข้อมูลทั้งหมด</li>
              <li>• ตรวจสอบสถานะระบบ</li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-semibold text-gray-700">ฟอร์ม</p>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• กรอก ชื่อ = Test-1</li>
              <li>• บันทึก</li>
              <li>• ยกเลิก</li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-semibold text-gray-700">สถานะ</p>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• ตรวจสอบสถานะ</li>
              <li>• แสดงเตือน</li>
              <li>• อ่านข้อมูลล่าสุด</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Alternative: Minimal Control Panel Without Stats
 */
export function MinimalDashboardWithAgent() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>
      <ThaiAgentControlPanel showHistory={true} maxHistorySize={5} />
    </div>
  );
}

/**
 * Alternative: Agent Control Panel in a Modal
 */
export function DashboardWithAgentModal() {
  const [showAgent, setShowAgent] = useState(false);

  return (
    <div>
      {/* Main Dashboard Content */}
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>
        <button
          onClick={() => setShowAgent(true)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          🎤 เปิดควบคุม AI
        </button>
      </div>

      {/* Modal */}
      {showAgent && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">ควบคุม Dashboard</h2>
              <button
                onClick={() => setShowAgent(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <ThaiAgentControlPanel
              onCommandExecuted={() => {
                // Could auto-close modal on success if desired
              }}
              showHistory={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
