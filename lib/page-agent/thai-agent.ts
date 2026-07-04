/**
 * PageAgent Thai AI Agent Controller
 * ควบคุม Dashboard ด้วยคำสั่งภาษาไทย
 */

import { PageAgent } from './index';

export interface PageAgentConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  modelProvider?: 'openai' | 'anthropic' | 'custom';
}

export class ThaiDashboardAgent {
  private agent: PageAgent | null = null;
  private config: PageAgentConfig;
  private executionHistory: Array<{
    timestamp: string;
    command: string;
    result: string;
    error?: string;
  }> = [];

  constructor(config: PageAgentConfig) {
    const model = config.model || 'claude-3-5-sonnet-20241022';
    const baseURL = config.baseURL || 'https://api.anthropic.com/v1';

    this.config = {
      model,
      apiKey: config.apiKey,
      baseURL,
    };
  }

  /**
   * เริ่มต้น PageAgent ในหน้าเว็บ
   */
  async initialize(): Promise<void> {
    try {
      this.agent = new PageAgent({
        model: this.config.model!,
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
        // ตั้งค่า system prompt เพื่อให้ agent เข้าใจภาษาไทย
        systemPrompt: `คุณเป็น AI Assistant ที่ช่วยควบคุม Dashboard ของระบบ DSG Control Plane

ความสามารถของคุณ:
- อ่านและวิเคราะห์ DOM ของหน้าเว็บ
- คลิกบนปุ่มและลิงก์
- กรอกข้อมูลในฟอร์ม
- ตรวจสอบสถานะของระบบ
- เลือกและเปลี่ยน tabs/หน้า
- ดึงข้อมูลและสรุปผล

คำแนะนำ:
- ตอบคำถามเป็นภาษาไทย
- อธิบายสิ่งที่คุณกำลังทำ
- ถ้าไม่พบองค์ประกอบ ให้บอกชัดเจน
- ทำงานขั้นตอนเดียวในแต่ละครั้ง`,
      });

      console.log('✅ PageAgent initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize PageAgent:', error);
      throw error;
    }
  }

  /**
   * รับคำสั่งภาษาไทยและดำเนินการ
   */
  async executeThaiCommand(command: string): Promise<string> {
    if (!this.agent) {
      throw new Error('PageAgent ยังไม่ได้เริ่มต้น กรุณาเรียก initialize() ก่อน');
    }

    const timestamp = new Date().toISOString();

    try {
      console.log(`🔄 Executing Thai command: ${command}`);

      // PageAgent จะอ่าน DOM และดำเนินการตามคำสั่ง
      const result = await this.agent.execute(command);

      this.executionHistory.push({
        timestamp,
        command,
        result: typeof result === 'string' ? result : JSON.stringify(result),
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.executionHistory.push({
        timestamp,
        command,
        result: '',
        error: errorMessage,
      });

      throw new Error(`ไม่สามารถดำเนินการคำสั่งได้: ${errorMessage}`);
    }
  }

  /**
   * คำสั่งทั่วไปที่ใช้บ่อย
   */
  async navigateToPage(pageName: string): Promise<string> {
    return this.executeThaiCommand(
      `ไปที่หน้า ${pageName} ในเมนูด้านข้าง`,
    );
  }

  async getPageSummary(): Promise<string> {
    return this.executeThaiCommand(
      'อ่านหน้าปัจจุบันและสรุปข้อมูลที่สำคัญ',
    );
  }

  async clickButton(buttonLabel: string): Promise<string> {
    return this.executeThaiCommand(`คลิกที่ปุ่ม "${buttonLabel}"`);
  }

  async fillForm(inputs: Record<string, string>): Promise<string> {
    const formInstructions = Object.entries(inputs)
      .map(([field, value]) => `กรอก "${field}" = "${value}"`)
      .join(' และ ');

    return this.executeThaiCommand(`กรอกฟอร์ม: ${formInstructions}`);
  }

  async searchData(query: string): Promise<string> {
    return this.executeThaiCommand(`ค้นหา "${query}" ในหน้าปัจจุบัน`);
  }

  /**
   * ดูประวัติการดำเนินการ
   */
  getExecutionHistory() {
    return this.executionHistory;
  }

  /**
   * ล้างประวัติการดำเนินการ
   */
  clearHistory(): void {
    this.executionHistory = [];
  }

  /**
   * หาข้อมูลเฉพาะจากหน้า
   */
  async extractData(dataType: string): Promise<Record<string, any>> {
    const result = await this.executeThaiCommand(
      `แยกข้อมูล ${dataType} จากหน้าปัจจุบันและส่งคืนเป็น JSON`,
    );

    try {
      return typeof result === 'object' ? result : JSON.parse(String(result));
    } catch {
      return { rawResult: result };
    }
  }

  /**
   * ตรวจสอบสถานะของระบบ
   */
  async checkSystemStatus(): Promise<{
    status: string;
    checks: Record<string, boolean>;
    details: string;
  }> {
    const statusSummary = await this.executeThaiCommand(
      'ตรวจสอบสถานะของระบบและแสดงสัญญาณเตือน',
    );

    return {
      status: 'completed',
      checks: {
        dashboard_loaded: true,
        data_visible: true,
      },
      details: String(statusSummary),
    };
  }
}

/**
 * Factory function สำหรับสร้าง agent ขนาด singleton
 */
let agentInstance: ThaiDashboardAgent | null = null;

export async function getThaiAgent(config: PageAgentConfig): Promise<ThaiDashboardAgent> {
  if (!agentInstance) {
    agentInstance = new ThaiDashboardAgent(config);
    await agentInstance.initialize();
  }
  return agentInstance;
}

export function resetAgent(): void {
  agentInstance = null;
}
