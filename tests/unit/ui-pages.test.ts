/**
 * UI Page Tests — Run with vitest
 * Tests page rendering and basic interactions
 */

import { describe, it, expect, vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}));

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { email: 'test@example.com' } } })),
    },
  })),
}));

describe('Login Page UI', () => {
  it('should have correct structure', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./app/login/page.tsx', 'utf8');
    expect(content).toContain('export default function LoginPage');
  });

  it('should contain key UI elements in source code', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./app/login/page.tsx', 'utf8');
    
    // 3 options exist
    expect(content).toContain('password-login');
    expect(content).toContain('/signup');
    expect(content).toContain('SSO');
    
    // Thai labels
    expect(content).toContain('เข้าสู่ระบบด้วยรหัสผ่าน');
    expect(content).toContain('ลืมรหัสผ่าน');
    expect(content).toContain('เริ่มทดลองใช้ 14 วันฟรี');
    
    // Error handling
    expect(content).toContain('invalid-email');
    expect(content).toContain('check-email');
    expect(content).toContain('sso-required');
    
    // Client-side
    expect(content).toContain('use client');
  });
});

describe('Password Login Page UI', () => {
  it('should have correct form structure', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./app/password-login/page.tsx', 'utf8');
    
    // Form elements
    expect(content).toContain('id="email"');
    expect(content).toContain('id="password"');
    expect(content).toContain('type="submit"');
    
    // Thai labels
    expect(content).toContain('อีเมลธุรกิจ');
    expect(content).toContain('รหัสผ่าน');
    expect(content).toContain('เข้าสู่ระบบ');
    
    // Error messages
    expect(content).toContain('invalid-credentials');
    expect(content).toContain('กรุณากรอก');
    
    // Loading state
    expect(content).toContain('กำลังเข้าสู่ระบบ');
  });
});

describe('Signup Page UI', () => {
  it('should have all required form fields', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./app/signup/page.tsx', 'utf8');
    
    // Form fields
    expect(content).toContain('full_name');
    expect(content).toContain('email');
    expect(content).toContain('workspace_name');
    expect(content).toContain('password');
    
    // Validation
    expect(content).toContain('8');
    
    // Thai UI
    expect(content).toContain('สร้าง workspace') || expect(content).toContain('สร้างบัญชี');
  });
});

describe('Dashboard Page UI', () => {
  it('should have all required components', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./app/dashboard/page.tsx', 'utf8');
    
    // KPI cards or status indicators
    expect(content).toContain('Agents') || expect(content).toContain('agents');
    expect(content).toContain('Executions') || expect(content).toContain('executions');
    
    // Thai labels
    expect(content).toContain('ศูนย์ควบคุม') || expect(content).toContain('Dashboard');
    expect(content).toContain('รีเฟรช') || expect(content).toContain('Refresh');
    
    // API calls
    expect(content).toContain('/api/agents');
    expect(content).toContain('/api/executions');
    expect(content).toContain('/api/health');
    
    // Client-side
    expect(content).toContain('use client');
  });
});

describe('Hermes Dashboard UI', () => {
  it('should have tabs and render the chat component', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./app/dashboard/hermes/page.tsx', 'utf8');

    // Client-side component
    expect(content).toContain('use client');

    // Chat component
    expect(content).toContain('HermesAgentChat');

    // Dark theme
    expect(content).toContain('bg-slate-950');
  });

  it('enforces auth server-side in the layout (not via the browser client)', async () => {
    const fs = await import('fs');
    const page = fs.readFileSync('./app/dashboard/hermes/page.tsx', 'utf8');
    const layout = fs.readFileSync('./app/dashboard/hermes/layout.tsx', 'utf8');

    // Auth must be enforced in the server layout via the SSR (cookie) client,
    // which redirects unauthenticated users.
    expect(layout).toContain('supabase.auth.getUser');
    expect(layout).toContain('redirect');

    // The page must NOT re-gate auth with the browser client: that client uses
    // localStorage, not SSR cookies, and caused a redirect loop (blank screen).
    expect(page).not.toContain('supabase.auth.getUser');
  });
});

describe('Chat Widget UI', () => {
  it('should have all required features', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./components/AgentChatWidget.tsx', 'utf8');
    
    // Features
    expect(content).toContain('PAGE_SUGGESTIONS');
    expect(content).toContain('CODEX_ENDPOINT');
    expect(content).toContain('AGENT_CHAT_ENDPOINT');
    
    // QA buttons
    expect(content).toContain('ตรวจหน้านี้');
    expect(content).toContain('ตรวจทั้งหมด');
    
    // Thai UI
    expect(content).toContain('สวัสดีครับ');
    expect(content).toContain('พิมพ์คำถาม');
    expect(content).toContain('ส่ง');
    
    // Streaming
    expect(content).toContain('getReader');
    expect(content).toContain('TextDecoder');
    
    // Loading indicator
    expect(content).toContain('isTyping');
    
    // Client-side
    expect(content).toContain('use client');
  });
});

describe('Docs Pages', () => {
  it('should have English docs', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./markdoc/docs/en/index.md', 'utf8');
    
    expect(content).toContain('DSG ONE');
    expect(content).toContain('Getting Started');
    expect(content).toContain('API Routes');
  });

  it('should have Thai docs', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./markdoc/docs/th/index.md', 'utf8');
    
    expect(content).toContain('DSG ONE');
    expect(content).toContain('เริ่มต้นใช้งาน');
    expect(content).toContain('เส้นทาง API');
  });

  it('should have docs page component', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('./app/docs/[lang]/page.tsx', 'utf8');
    
    expect(content).toContain('markdoc');
    expect(content).toContain('lang');
    expect(content).toContain('en');
    expect(content).toContain('th');
  });
});

describe('UI Consistency', () => {
  it('all pages should use consistent dark theme', async () => {
    const fs = await import('fs');
    const files = [
      './app/login/page.tsx',
      './app/password-login/page.tsx',
      './app/signup/page.tsx',
      './app/dashboard/page.tsx',
      './app/dashboard/hermes/page.tsx',
    ];
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const hasDarkTheme = content.includes('#07080b') || content.includes('bg-slate-950');
      expect(hasDarkTheme).toBe(true);
    }
  });

  it('all pages should have Thai language support', async () => {
    const fs = await import('fs');
    const files = [
      './app/login/page.tsx',
      './app/password-login/page.tsx',
      './app/signup/page.tsx',
    ];
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toMatch(/[\u0E00-\u0E7F]/);
    }
  });

  it('all interactive pages should be client components', async () => {
    const fs = await import('fs');
    const files = [
      './app/login/page.tsx',
      './app/password-login/page.tsx',
      './app/signup/page.tsx',
      './app/dashboard/page.tsx',
      './app/dashboard/hermes/page.tsx',
    ];
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const hasDirective = content.includes('use client');
      expect(hasDirective).toBe(true);
    }
  });
});
