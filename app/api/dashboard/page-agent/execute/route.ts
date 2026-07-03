/**
 * PageAgent Thai Command Execution Route
 * Handles Thai language commands for dashboard control
 */

import { NextRequest, NextResponse } from 'next/server';
import { ThaiDashboardAgent, PageAgentConfig } from '@/lib/page-agent/thai-agent';

export const dynamic = 'force-dynamic';

interface ExecuteRequest {
  command: string;
  commandType?: 'navigate' | 'click' | 'fill' | 'search' | 'extract' | 'status' | 'custom';
  payload?: Record<string, any>;
}

interface ExecuteResponse {
  success: boolean;
  result?: any;
  error?: string;
  timestamp: string;
  commandType?: string;
}

// Initialize agent with configuration from environment
let agent: ThaiDashboardAgent | null = null;

async function getOrInitializeAgent(): Promise<ThaiDashboardAgent> {
  if (agent) {
    return agent;
  }

  const config: PageAgentConfig = {
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '',
    baseURL: process.env.PAGEAGENT_BASE_URL,
    model: process.env.PAGEAGENT_MODEL || 'claude-3-5-sonnet-20241022',
    modelProvider: (process.env.PAGEAGENT_PROVIDER as 'openai' | 'anthropic' | 'custom') || 'anthropic',
  };

  if (!config.apiKey) {
    throw new Error('ไม่พบ API Key สำหรับ PageAgent');
  }

  agent = new ThaiDashboardAgent(config);
  await agent.initialize();
  return agent;
}

export async function POST(request: NextRequest): Promise<NextResponse<ExecuteResponse>> {
  try {
    // Parse request body
    let body: ExecuteRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<ExecuteResponse>(
        {
          success: false,
          error: 'ไม่สามารถแยกวิเคราะห์ข้อมูล JSON ได้',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const { command, commandType, payload } = body;

    // Validate command
    if (!command || typeof command !== 'string') {
      return NextResponse.json<ExecuteResponse>(
        {
          success: false,
          error: 'จำเป็นต้องระบุคำสั่งเป็นข้อความ',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Initialize agent
    const pageAgent = await getOrInitializeAgent();

    // Execute command based on type
    let result: any;

    switch (commandType) {
      case 'navigate':
        if (!payload?.pageName) {
          return NextResponse.json<ExecuteResponse>(
            {
              success: false,
              error: 'pageName จำเป็นสำหรับคำสั่ง navigate',
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          );
        }
        result = await pageAgent.navigateToPage(payload.pageName);
        break;

      case 'click':
        if (!payload?.buttonLabel) {
          return NextResponse.json<ExecuteResponse>(
            {
              success: false,
              error: 'buttonLabel จำเป็นสำหรับคำสั่ง click',
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          );
        }
        result = await pageAgent.clickButton(payload.buttonLabel);
        break;

      case 'fill':
        if (!payload?.inputs || typeof payload.inputs !== 'object') {
          return NextResponse.json<ExecuteResponse>(
            {
              success: false,
              error: 'inputs จำเป็นสำหรับคำสั่ง fill',
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          );
        }
        result = await pageAgent.fillForm(payload.inputs);
        break;

      case 'search':
        if (!payload?.query) {
          return NextResponse.json<ExecuteResponse>(
            {
              success: false,
              error: 'query จำเป็นสำหรับคำสั่ง search',
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          );
        }
        result = await pageAgent.searchData(payload.query);
        break;

      case 'extract':
        if (!payload?.dataType) {
          return NextResponse.json<ExecuteResponse>(
            {
              success: false,
              error: 'dataType จำเป็นสำหรับคำสั่ง extract',
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          );
        }
        result = await pageAgent.extractData(payload.dataType);
        break;

      case 'status':
        result = await pageAgent.checkSystemStatus();
        break;

      case 'custom':
      default:
        // Execute custom Thai command
        result = await pageAgent.executeThaiCommand(command);
        break;
    }

    return NextResponse.json<ExecuteResponse>(
      {
        success: true,
        result,
        timestamp: new Date().toISOString(),
        commandType: commandType || 'custom',
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';

    console.error('[PageAgent] Execution error:', errorMessage);

    return NextResponse.json<ExecuteResponse>(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      message: 'PageAgent Thai Command Execution Endpoint',
      endpoint: '/api/dashboard/page-agent/execute',
      method: 'POST',
      description: 'Execute Thai language commands to control the dashboard',
      examples: {
        navigate: {
          commandType: 'navigate',
          payload: { pageName: 'agents' },
        },
        click: {
          commandType: 'click',
          payload: { buttonLabel: 'บันทึก' },
        },
        fillForm: {
          commandType: 'fill',
          payload: { inputs: { 'ชื่อตัวแทน': 'Agent-1', 'สถานะ': 'ใช้งาน' } },
        },
        search: {
          commandType: 'search',
          payload: { query: 'ข้อมูลล่าสุด' },
        },
        extract: {
          commandType: 'extract',
          payload: { dataType: 'สรุประบบ' },
        },
        status: {
          commandType: 'status',
        },
        custom: {
          command: 'อ่านหน้าปัจจุบันและสรุปข้อมูล',
        },
      },
    },
    { status: 200 }
  );
}
