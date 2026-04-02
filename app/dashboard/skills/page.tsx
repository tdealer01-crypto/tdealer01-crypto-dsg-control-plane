"use client";

import { useState } from "react";

const FIELD_DESCRIPTIONS = [
  {
    name: "files",
    type: "array of string or string",
    description:
      "Skill files to upload (directory upload) or a single zip file.",
  },
];

const RESPONSE_FIELDS = [
  ["id", "string", "Unique identifier for the skill."],
  ["created_at", "number", "Unix timestamp (seconds) for when the skill was created."],
  ["default_version", "string", "Default version for the skill."],
  ["description", "string", "Description of the skill."],
  ["latest_version", "string", "Latest version for the skill."],
  ["name", "string", "Name of the skill."],
  ["object", '"skill"', 'The object type, which is "skill".'],
] as const;

export default function SkillsPage() {
  const [open, setOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-400">Skills</p>
          <h1 className="mt-3 text-4xl font-bold">Skill API Menu</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            เพิ่มเมนูสำหรับทีมงานให้เปิดดูรายละเอียดการสร้าง Skill ได้ทันทีผ่าน popup โดยอิงสเปก
            <code className="ml-2 rounded bg-slate-800 px-2 py-1 text-emerald-300">POST /skills</code>
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black"
            >
              Open Create Skill Popup
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Create a new skill"
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Create a new skill</p>
                <h2 className="mt-2 text-2xl font-semibold">POST /skills</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200"
              >
                Close
              </button>
            </div>

            <section className="mt-6">
              <h3 className="text-lg font-semibold">Body Parameters</h3>
              <div className="mt-3 space-y-3 text-sm text-slate-200">
                {FIELD_DESCRIPTIONS.map((item) => (
                  <div key={item.name} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p>
                      <span className="font-semibold text-emerald-300">{item.name}</span>: {item.type}
                    </p>
                    <p className="mt-1 text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6">
              <h3 className="text-lg font-semibold">Example</h3>
              <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-emerald-200">{`curl https://api.openai.com/v1/skills \\
  -H 'Content-Type: application/json' \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -F files='["Example data"]'`}</pre>
            </section>

            <section className="mt-6">
              <h3 className="text-lg font-semibold">Response: Skill object</h3>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/80 text-slate-200">
                    <tr>
                      <th className="px-4 py-2">Field</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RESPONSE_FIELDS.map(([field, type, description]) => (
                      <tr key={field} className="border-t border-slate-800 text-slate-300">
                        <td className="px-4 py-2 font-mono text-emerald-300">{field}</td>
                        <td className="px-4 py-2">{type}</td>
                        <td className="px-4 py-2">{description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </main>
  );
}
