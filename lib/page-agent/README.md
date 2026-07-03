# Thai PageAgent Integration

Thai language AI agent controller for the DSG Dashboard. This integration allows controlling the dashboard using natural Thai language commands.

## Features

- **Thai Language Commands**: Issue dashboard commands in Thai
- **Multiple LLM Providers**: Support for OpenAI, Anthropic, and custom providers
- **Command Types**: Navigate, click, fill forms, search, extract data, and check system status
- **React Integration**: Easy-to-use hooks and components for dashboard UI
- **API Route**: Dedicated API endpoint for command execution
- **Execution History**: Track all executed commands with timestamps
- **Error Handling**: Comprehensive Thai language error messages

## Architecture

```
┌─────────────────────────────────────┐
│   Dashboard UI / React Components    │
│  (useThaiAgent hook, Control Panel)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  API Route Handler                   │
│  /api/dashboard/page-agent/execute   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  ThaiDashboardAgent Class            │
│  (Core orchestration logic)          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  PageAgent (Stub/Library)            │
│  (DOM analysis & command execution)  │
└─────────────────────────────────────┘
```

## Setup

### 1. Environment Variables

Add the following to your `.env.local`:

```bash
# LLM Provider Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key  # or OPENAI_API_KEY
PAGEAGENT_MODEL=claude-3-5-sonnet-20241022
PAGEAGENT_PROVIDER=anthropic  # or 'openai', 'custom'
PAGEAGENT_BASE_URL=https://api.anthropic.com/v1  # optional
```

### 2. Install PageAgent Library

Once the Alibaba PageAgent library is available, install it:

```bash
npm install page-agent
```

Then update `lib/page-agent/index.ts` to import the actual library instead of the stub.

## Usage

### Server-Side (Node.js)

```typescript
import { getThaiAgent } from '@/lib/page-agent/thai-agent';

async function controlDashboard() {
  const agent = await getThaiAgent({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
  });

  // Execute Thai command
  const result = await agent.executeThaiCommand('ไปที่หน้า Agents');
  console.log(result);

  // Or use convenience methods
  await agent.navigateToPage('agents');
  await agent.clickButton('บันทึก');
  await agent.fillForm({ 'ชื่อ': 'Agent-1', 'สถานะ': 'ใช้งาน' });
  const data = await agent.extractData('สรุปข้อมูล');
}
```

### Client-Side (React)

```typescript
'use client';

import { useThaiAgent } from '@/lib/page-agent/thai-agent-component';

export function MyDashboard() {
  const { execute, loading, error, result } = useThaiAgent();

  const handleCommand = async () => {
    await execute({
      command: 'ค้นหา agent ที่มีชื่อขึ้นต้นด้วย test',
      commandType: 'custom',
    });
  };

  return (
    <div>
      <button onClick={handleCommand} disabled={loading}>
        {loading ? 'รอสักครู่...' : 'ค้นหา'}
      </button>
      {error && <p className="error">{error}</p>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

### Control Panel Component

```typescript
'use client';

import { ThaiAgentControlPanel } from '@/lib/page-agent/thai-agent-component';

export function DashboardWithAgent() {
  return (
    <ThaiAgentControlPanel
      onCommandExecuted={(response) => {
        console.log('Command executed:', response);
      }}
      showHistory={true}
      maxHistorySize={10}
    />
  );
}
```

## API Route

### POST `/api/dashboard/page-agent/execute`

Execute Thai commands through the REST API.

#### Request

```json
{
  "command": "ไปที่หน้า agents",
  "commandType": "navigate",
  "payload": {
    "pageName": "agents"
  }
}
```

#### Command Types

- **custom**: Execute a custom Thai command (default)
- **navigate**: Navigate to a dashboard page
- **click**: Click a button or element
- **fill**: Fill form fields
- **search**: Search within the page
- **extract**: Extract specific data
- **status**: Check system status

#### Response

```json
{
  "success": true,
  "result": { ... },
  "timestamp": "2026-07-03T10:30:00.000Z",
  "commandType": "navigate"
}
```

#### Examples

Navigate to page:
```bash
curl -X POST http://localhost:3000/api/dashboard/page-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "commandType": "navigate",
    "payload": { "pageName": "agents" }
  }'
```

Click button:
```bash
curl -X POST http://localhost:3000/api/dashboard/page-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "commandType": "click",
    "payload": { "buttonLabel": "บันทึก" }
  }'
```

Fill form:
```bash
curl -X POST http://localhost:3000/api/dashboard/page-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "commandType": "fill",
    "payload": {
      "inputs": {
        "ชื่อตัวแทน": "Agent-1",
        "สถานะ": "ใช้งาน"
      }
    }
  }'
```

Extract data:
```bash
curl -X POST http://localhost:3000/api/dashboard/page-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "commandType": "extract",
    "payload": { "dataType": "สรุปข้อมูล" }
  }'
```

Custom Thai command:
```bash
curl -X POST http://localhost:3000/api/dashboard/page-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "command": "อ่านข้อมูล agents ทั้งหมดและสรุปผล"
  }'
```

## System Prompt

The agent is configured with a Thai language system prompt that includes:

- Dashboard control capabilities (reading, clicking, filling forms, etc.)
- Thai language responses
- Clear communication of actions and limitations
- Step-by-step execution approach

## Common Thai Commands

### Navigation
- `ไปที่หน้า [page-name]` - Navigate to a page
- `กลับไปหน้าแรก` - Go to home
- `เปิด menu ด้านข้าง` - Open sidebar menu

### Data
- `ค้นหา [query]` - Search for data
- `แสดง [item-type] ทั้งหมด` - Show all items
- `สรุปข้อมูล` - Summarize data
- `ส่วนข้อมูลของ [item]` - Extract item details

### Forms
- `กรอก [field] = [value]` - Fill a form field
- `บันทึก` - Save/submit
- `ยกเลิก` - Cancel

### Status
- `ตรวจสอบสถานะ` - Check system status
- `แสดงเตือน` - Show alerts/warnings

## Execution History

The agent maintains an execution history of all commands:

```typescript
const agent = await getThaiAgent(config);

// Get history
const history = agent.getExecutionHistory();
console.log(history);

// Clear history
agent.clearHistory();
```

## Error Handling

All errors are reported in Thai:

- `ไม่พบ API Key` - Missing API key
- `PageAgent ยังไม่ได้เริ่มต้น` - Agent not initialized
- `ไม่สามารถดำเนินการคำสั่งได้` - Command execution failed
- `ไม่พบองค์ประกอบ` - Element not found

## Development

### Current Status

- ✅ ThaiDashboardAgent class implemented
- ✅ API route handler implemented
- ✅ React hooks and components implemented
- ⏳ PageAgent library integration (stub implementation)
- ⏳ Authentication/authorization middleware
- ⏳ Unit tests
- ⏳ Integration tests
- ⏳ E2E tests with actual dashboard

### Next Steps

1. **Install Real PageAgent Library**: Replace stub with actual Alibaba PageAgent
2. **Add Authentication**: Implement auth checks in API route
3. **Create Tests**: Write unit and integration tests
4. **Dashboard Integration**: Integrate ThaiAgentControlPanel into dashboard pages
5. **Monitoring**: Add logging and performance monitoring

## Security Considerations

- API key is server-side only
- Commands are logged with timestamps for audit trail
- Thai text is properly UTF-8 encoded
- Input validation on command parameters
- Rate limiting should be configured on the API route

## Troubleshooting

### "Cannot find module 'page-agent'"

The Alibaba PageAgent library is not installed. This is currently using a stub implementation. Once the library is available, install it and update the import in `lib/page-agent/index.ts`.

### "API Key not found"

Ensure `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is set in environment variables.

### Thai text not displaying correctly

Ensure the file encoding is UTF-8 and the environment supports UTF-8 text.

## References

- [Alibaba PageAgent Documentation](https://github.com/alibaba/page-agent)
- [DSG Dashboard Architecture](../docs/DASHBOARD.md)
- [Thai Language Support Guide](../docs/THAI_LANGUAGE.md)
