import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

type FrameworkConfig = {
  name: string;
  logo: string;
  lang: 'python' | 'typescript' | 'both';
  tagline: string;
  description: string;
  installCmd: string;
  codeExample: string;
  useCases: string[];
  faqs: Array<{ q: string; a: string }>;
};

const FRAMEWORKS: Record<string, FrameworkConfig> = {
  langchain: {
    name: 'LangChain',
    logo: '🦜',
    lang: 'python',
    tagline: 'AI governance for LangChain agents — gate every tool call before it runs',
    description:
      'LangChain is the most popular framework for building LLM-powered applications. DSG ONE wraps your LangChain tools so every action is inspected, logged, and governed before execution.',
    installCmd: 'pip install langchain dsg-one',
    codeExample: `from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_openai import ChatOpenAI
from dsg_one import DSGGate

# 1. Initialize the gate
gate = DSGGate(api_key="dsg_live_xxxx")

# 2. Declare what your agent is allowed to do
session = gate.create_session(
    agent_id="my-langchain-agent",
    declared_actions=["read_database", "send_email", "fetch_weather"],
)

# 3. Wrap your LangChain tools
tools = session.wrap_tools([read_db_tool, send_email_tool, weather_tool])

# 4. Run — every tool call is gated automatically
agent = create_openai_tools_agent(ChatOpenAI(), tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools)
result = executor.invoke({"input": "Send the weekly report"})
`,
    useCases: [
      'Prevent agents from calling undeclared tools',
      'Audit every LangChain tool invocation with evidence',
      'Route sensitive actions (payments, deletions) to human REVIEW',
      'Policy enforcement for multi-step agent chains',
    ],
    faqs: [
      {
        q: 'Does DSG support LangChain Expression Language (LCEL)?',
        a: 'Yes. DSG wraps individual tools, so it works with both legacy AgentExecutor and LCEL-based chains.',
      },
      {
        q: 'How much latency does DSG add?',
        a: 'P99 gate decisions take under 50 ms. Audit log writes are fire-and-forget.',
      },
      {
        q: 'Does it work with LangGraph?',
        a: 'Yes — wrap tools before passing them to LangGraph nodes. The gate fires on each tool call regardless of graph topology.',
      },
    ],
  },

  'langchain-js': {
    name: 'LangChain.js',
    logo: '🦜',
    lang: 'typescript',
    tagline: 'AI governance for LangChain.js agents — audit-ready action control in TypeScript',
    description:
      'LangChain.js brings the full LangChain ecosystem to Node.js and edge runtimes. DSG ONE integrates natively so every tool call is governed before it executes.',
    installCmd: 'npm install langchain @dsg-one/sdk',
    codeExample: `import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { DSGGate } from "@dsg-one/sdk";

// 1. Initialize
const gate = new DSGGate({ apiKey: process.env.DSG_API_KEY! });

// 2. Declare actions
const session = await gate.createSession({
  agentId: "my-langchain-js-agent",
  declaredActions: ["read_database", "send_email"],
});

// 3. Wrap tools
const tools = session.wrapTools([readDbTool, sendEmailTool]);

// 4. Run — gated automatically
const agent = await createOpenAIToolsAgent({ llm: new ChatOpenAI(), tools, prompt });
const executor = AgentExecutor.fromAgentAndTools({ agent, tools });
const result = await executor.invoke({ input: "Send the weekly report" });
`,
    useCases: [
      'Gate tool calls in Next.js API routes and edge functions',
      'Audit LangChain.js agents in serverless environments',
      'Block undeclared tool use before it reaches your backend',
      'Compliance logging for AI-assisted workflows',
    ],
    faqs: [
      {
        q: 'Does it work in Vercel Edge Runtime?',
        a: 'Yes. The DSG SDK uses the fetch API and has no Node.js-only dependencies.',
      },
      {
        q: 'How is session state managed in serverless?',
        a: 'Sessions are stored server-side. Pass the session_id between requests to maintain state across invocations.',
      },
    ],
  },

  autogen: {
    name: 'AutoGen',
    logo: '🤖',
    lang: 'python',
    tagline: 'AI governance for AutoGen multi-agent systems — ALLOW / BLOCK / REVIEW every action',
    description:
      'AutoGen enables multi-agent conversations where agents collaborate to complete tasks. DSG ONE adds a governance layer so every inter-agent action is inspected and logged.',
    installCmd: 'pip install pyautogen dsg-one',
    codeExample: `import autogen
from dsg_one import DSGGate

gate = DSGGate(api_key="dsg_live_xxxx")

# Create a DSG-governed function executor
def governed_executor(code, lang):
    with gate.session(agent_id="autogen-executor",
                      declared_actions=["execute_python"]) as session:
        result = session.inspect("execute_python", {"code": code})
        if result.decision == "BLOCK":
            return f"Blocked: {result.reason}"
        # proceed with actual execution
        return autogen.execute_code(code, lang)

config_list = [{"model": "gpt-4", "api_key": "..."}]
assistant = autogen.AssistantAgent("assistant", llm_config={"config_list": config_list})
user_proxy = autogen.UserProxyAgent("user_proxy", code_execution_config={
    "executor": governed_executor
})

user_proxy.initiate_chat(assistant, message="Analyze the sales data")
`,
    useCases: [
      'Control what AutoGen executor agents can run',
      'Audit all inter-agent messages and tool calls',
      'Block dangerous code execution before it runs',
      'Compliance logging for autonomous AutoGen pipelines',
    ],
    faqs: [
      {
        q: 'Does DSG work with AutoGen 0.4 (the new async API)?',
        a: 'Yes. The async DSG SDK works natively with AutoGen 0.4 async agents.',
      },
      {
        q: 'Can I gate group chat messages?',
        a: 'Yes — use DSG inspect on the GroupChatManager action to approve messages before they are broadcast.',
      },
    ],
  },

  crewai: {
    name: 'CrewAI',
    logo: '🚢',
    lang: 'python',
    tagline: 'AI governance for CrewAI — control what your crew can actually do',
    description:
      'CrewAI makes it easy to build multi-agent crews that collaborate on complex tasks. DSG ONE wraps CrewAI tools so every action is gated, logged, and auditable.',
    installCmd: 'pip install crewai dsg-one',
    codeExample: `from crewai import Agent, Task, Crew
from crewai.tools import tool
from dsg_one import DSGGate

gate = DSGGate(api_key="dsg_live_xxxx")
session = gate.create_session(
    agent_id="my-crew",
    declared_actions=["web_search", "write_file", "send_email"],
)

@tool("Web Search")
def web_search(query: str) -> str:
    """Search the web for information."""
    result = session.inspect("web_search", {"query": query})
    if result.decision == "BLOCK":
        return f"Action blocked by DSG: {result.reason}"
    return actual_search(query)

researcher = Agent(
    role="Researcher",
    goal="Research the topic thoroughly",
    tools=[web_search],
    llm="gpt-4o",
)
task = Task(description="Research AI governance trends", agent=researcher)
crew = Crew(agents=[researcher], tasks=[task])
crew.kickoff()
`,
    useCases: [
      'Gate file write, delete, and network actions in CrewAI',
      'Audit every tool call across all crew members',
      'Route high-risk actions to human REVIEW before execution',
      'Enforce per-agent action policies in mixed crews',
    ],
    faqs: [
      {
        q: 'Does DSG work with CrewAI flows?',
        a: 'Yes — DSG wraps individual tools, so it works with both sequential crews and CrewAI flows.',
      },
      {
        q: 'Can different agents in a crew have different policies?',
        a: 'Yes — create separate DSG sessions with different declared_actions for each agent role.',
      },
    ],
  },

  'openai-agents': {
    name: 'OpenAI Agents SDK',
    logo: '⚡',
    lang: 'python',
    tagline: 'AI governance for OpenAI Agents SDK — intercept tool calls before they execute',
    description:
      "OpenAI's official Agents SDK provides a lightweight framework for building agentic applications. DSG ONE adds enterprise-grade governance without changing how you define tools.",
    installCmd: 'pip install openai-agents dsg-one',
    codeExample: `from agents import Agent, Runner, function_tool
from dsg_one import DSGGate

gate = DSGGate(api_key="dsg_live_xxxx")
session = gate.create_session(
    agent_id="openai-agent-prod",
    declared_actions=["get_weather", "send_slack_message"],
)

@function_tool
def get_weather(city: str) -> str:
    """Get current weather for a city."""
    check = session.inspect("get_weather", {"city": city})
    if check.decision == "BLOCK":
        return f"DSG blocked: {check.reason}"
    return fetch_weather_api(city)

@function_tool
def send_slack_message(channel: str, message: str) -> str:
    """Send a message to a Slack channel."""
    check = session.inspect("send_slack_message", {"channel": channel})
    if check.decision == "BLOCK":
        return f"DSG blocked: {check.reason}"
    return slack_client.send(channel, message)

agent = Agent(
    name="Assistant",
    instructions="Help users with weather and Slack.",
    tools=[get_weather, send_slack_message],
)
result = Runner.run_sync(agent, "What's the weather in Bangkok?")
`,
    useCases: [
      'Add audit trails to OpenAI Agents SDK tool calls',
      'Block undeclared tools before the LLM executes them',
      'Compliance logging for production OpenAI agents',
      'REVIEW flow for sensitive operations (payments, emails)',
    ],
    faqs: [
      {
        q: 'Does DSG work with the async Runner?',
        a: 'Yes — use the async DSGGate.inspect() method with await inside your async tool functions.',
      },
      {
        q: 'Can I use DSG with OpenAI Assistants API (not Agents SDK)?',
        a: 'Yes — call gate.inspect() before executing any function tool response.',
      },
    ],
  },

  'openai-agents-js': {
    name: 'OpenAI Agents JS',
    logo: '⚡',
    lang: 'typescript',
    tagline: 'AI governance for OpenAI Agents JS — audit-ready governance in TypeScript',
    description:
      "OpenAI's official JavaScript Agents SDK brings agentic capabilities to Node.js. DSG ONE adds a governance layer so every tool call is inspected and logged.",
    installCmd: 'npm install @openai/agents @dsg-one/sdk',
    codeExample: `import { Agent, run } from "@openai/agents";
import { DSGGate } from "@dsg-one/sdk";
import { z } from "zod";

const gate = new DSGGate({ apiKey: process.env.DSG_API_KEY! });
const session = await gate.createSession({
  agentId: "openai-agents-js",
  declaredActions: ["get_weather", "send_email"],
});

const agent = new Agent({
  name: "Assistant",
  tools: [
    {
      name: "get_weather",
      description: "Get weather for a city",
      parameters: z.object({ city: z.string() }),
      execute: async ({ city }) => {
        const check = await session.inspect("get_weather", { city });
        if (check.decision === "BLOCK") return \`Blocked: \${check.reason}\`;
        return fetchWeather(city);
      },
    },
  ],
});

const result = await run(agent, "What's the weather in Tokyo?");
`,
    useCases: [
      'Gate tool calls in Next.js App Router with OpenAI Agents JS',
      'Audit AI actions in TypeScript/Node.js applications',
      'Enforce policies for production AI assistants',
      'REVIEW workflow for sensitive operations',
    ],
    faqs: [
      {
        q: 'Does this work in Next.js API routes?',
        a: 'Yes. Create the DSGGate instance once per request inside the route handler.',
      },
    ],
  },

  'pydantic-ai': {
    name: 'PydanticAI',
    logo: '🔷',
    lang: 'python',
    tagline: 'AI governance for PydanticAI — type-safe governance with structured gates',
    description:
      'PydanticAI brings type safety and validation to LLM applications. DSG ONE integrates naturally with PydanticAI tools, adding governance without sacrificing type safety.',
    installCmd: 'pip install pydantic-ai dsg-one',
    codeExample: `from pydantic_ai import Agent
from pydantic_ai.tools import ToolDefinition
from pydantic import BaseModel
from dsg_one import DSGGate

gate = DSGGate(api_key="dsg_live_xxxx")
session = gate.create_session(
    agent_id="pydantic-ai-agent",
    declared_actions=["search_database", "update_record"],
)

class SearchInput(BaseModel):
    query: str
    table: str

async def search_database(ctx, search: SearchInput) -> str:
    check = await session.inspect_async("search_database", search.model_dump())
    if check.decision == "BLOCK":
        return f"DSG blocked: {check.reason}"
    return await db.search(search.query, search.table)

agent = Agent(
    "openai:gpt-4o",
    system_prompt="You are a helpful database assistant.",
    tools=[search_database],
)
result = await agent.run("Find all orders from last week")
`,
    useCases: [
      'Type-safe governance for PydanticAI tool calls',
      'Structured audit logs with Pydantic model validation',
      'Block undeclared database and API operations',
      'Compliance logging for validated AI workflows',
    ],
    faqs: [
      {
        q: 'Does DSG validate input types like Pydantic does?',
        a: 'DSG governance operates at the semantic level (action names and metadata). Pydantic handles type validation; DSG handles policy enforcement.',
      },
      {
        q: 'Can I use DSG with PydanticAI streaming responses?',
        a: 'Yes — gate the tool call before the stream starts. The stream itself is not inspected.',
      },
    ],
  },
};

type Props = {
  params: Promise<{ framework: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { framework } = await params;
  const fw = FRAMEWORKS[framework];
  if (!fw) return { title: 'Integration Not Found' };
  return {
    title: `DSG ONE + ${fw.name} — ${fw.tagline}`,
    description: fw.description,
  };
}

export function generateStaticParams() {
  return Object.keys(FRAMEWORKS).map((framework) => ({ framework }));
}

export default async function FrameworkPage({ params }: Props) {
  const { framework } = await params;
  const fw = FRAMEWORKS[framework];
  if (!fw) notFound();

  const langLabel = fw.lang === 'both' ? 'Python & TypeScript' : fw.lang === 'python' ? 'Python' : 'TypeScript';

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Breadcrumb */}
      <div className="px-6 pt-8 max-w-4xl mx-auto">
        <nav className="text-sm text-gray-500">
          <Link href="/integrations" className="hover:text-white transition">Integrations</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-300">{fw.name}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="px-6 py-14 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-5xl">{fw.logo}</span>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              DSG ONE + {fw.name}
            </h1>
            <span className="text-sm text-gray-400 mt-1 block">{langLabel}</span>
          </div>
        </div>
        <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl">{fw.tagline}</p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/request-access"
            className="bg-emerald-500 text-black px-8 py-3 rounded-lg font-bold hover:bg-emerald-400 transition"
          >
            Start Free Trial →
          </Link>
          <Link
            href="/try"
            className="border border-white/20 text-white px-8 py-3 rounded-lg hover:border-white/50 transition"
          >
            Live Demo
          </Link>
        </div>
      </section>

      {/* About */}
      <section className="px-6 pb-12 max-w-4xl mx-auto">
        <p className="text-gray-400 text-lg leading-relaxed">{fw.description}</p>
      </section>

      {/* Install */}
      <section className="px-6 py-10 bg-white/3 border-t border-b border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Install</h2>
          <div className="bg-gray-900 border border-white/10 rounded-lg px-6 py-4 font-mono text-sm text-emerald-400">
            $ {fw.installCmd}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="px-6 py-12 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-6">Integration Example</h2>
        <div className="bg-gray-950 border border-white/10 rounded-xl overflow-auto">
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
            <span className="text-xs text-gray-500 ml-2">
              {fw.lang === 'typescript' ? 'agent.ts' : 'agent.py'}
            </span>
          </div>
          <pre className="p-6 text-sm text-gray-300 leading-relaxed overflow-x-auto">
            <code>{fw.codeExample.trim()}</code>
          </pre>
        </div>
      </section>

      {/* Use Cases */}
      <section className="px-6 py-12 bg-white/3 border-t border-b border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-6">What teams use this for</h2>
          <ul className="space-y-3">
            {fw.useCases.map((uc) => (
              <li key={uc} className="flex items-start gap-3 text-gray-300">
                <span className="text-emerald-500 mt-1 flex-shrink-0">✓</span>
                {uc}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQs */}
      <section className="px-6 py-12 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-6">FAQ</h2>
        <div className="space-y-6">
          {fw.faqs.map((faq) => (
            <div key={faq.q} className="border-b border-white/10 pb-6">
              <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center bg-emerald-950/30 border-t border-emerald-500/20">
        <h2 className="text-3xl font-bold mb-4">
          Add governance to your {fw.name} agents today
        </h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Free trial. No credit card. Full audit trail from day one.
          <br />
          Setup takes under 5 minutes.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/request-access"
            className="bg-emerald-500 text-black px-10 py-4 rounded-lg font-bold text-lg hover:bg-emerald-400 transition"
          >
            Start Free Trial →
          </Link>
          <Link
            href="/integrations"
            className="border border-white/20 text-white px-10 py-4 rounded-lg hover:border-white/50 transition"
          >
            ← All Integrations
          </Link>
        </div>
      </section>
    </main>
  );
}
