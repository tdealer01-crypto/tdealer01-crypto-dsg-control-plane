'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Item = { id: string; title: string; completed: boolean; created_at: string };
type Round = { letter: 'A' | 'B' | 'C'; emoji: string; word: string; thai: string; prompt: string };

const APP_ID = '2f3b20b0-824c-4d4a-ae6a-250bd18f3392';
const APP_TITLE = 'เกม ABC เด็ก 3 ขวบ';
const APP_SUMMARY = 'แตะตัวอักษร A B C ให้ตรงกับรูปภาพ เห็นผลทันที และบันทึกคะแนนลงฐานข้อมูล';
const PLAN_HASH = '52c6387fa3b97360756b00046d750bb3e5ff873d0ddcc9e17961d5ffd0a857c2';
const APPROVAL_HASH = '7785c435e5d0bcfdfbd91659468bc243c12cd80f66d787605a6836cd49e54942';

const rounds: Round[] = [
  { letter: 'A', emoji: '🍎', word: 'Apple', thai: 'แอปเปิล', prompt: 'ตัวไหนคือ A?' },
  { letter: 'B', emoji: '⚽', word: 'Ball', thai: 'ลูกบอล', prompt: 'ตัวไหนคือ B?' },
  { letter: 'C', emoji: '🐱', word: 'Cat', thai: 'แมว', prompt: 'ตัวไหนคือ C?' },
  { letter: 'A', emoji: '🐜', word: 'Ant', thai: 'มด', prompt: 'ตัวไหนคือ A?' },
  { letter: 'B', emoji: '🐻', word: 'Bear', thai: 'หมี', prompt: 'ตัวไหนคือ B?' },
  { letter: 'C', emoji: '🚗', word: 'Car', thai: 'รถ', prompt: 'ตัวไหนคือ C?' },
];

const choices: Array<Round['letter']> = ['A', 'B', 'C'];

function toneClass(result: 'idle' | 'correct' | 'wrong') {
  if (result === 'correct') return 'border-emerald-400/50 bg-emerald-400/15 text-emerald-100';
  if (result === 'wrong') return 'border-rose-400/50 bg-rose-400/15 text-rose-100';
  return 'border-indigo-400/30 bg-indigo-500/10 text-indigo-100';
}

export default function GeneratedDsgAbcGamePage() {
  const [savedItems, setSavedItems] = useState<Item[]>([]);
  const [status, setStatus] = useState('กำลังโหลดหลักฐาน backend…');
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);
  const [lastResult, setLastResult] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [message, setMessage] = useState('แตะตัวอักษรให้ตรงกับรูปภาพ');

  const round = rounds[roundIndex % rounds.length];
  const progress = `${roundIndex + 1}/${rounds.length}`;
  const finished = roundIndex >= rounds.length - 1 && tries > 0 && lastResult === 'correct';
  const stars = useMemo(() => '⭐'.repeat(Math.max(0, Math.min(score, 6))), [score]);

  async function loadItems() {
    const response = await fetch(`/api/generated-apps/${APP_ID}/items`, { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok || !json.ok) throw new Error(json.error?.message || 'GENERATED_APP_BACKEND_FAILED');
    setSavedItems(json.data.items);
    setStatus('Backend API + database table reachable');
  }

  async function saveResult(label: string) {
    const response = await fetch(`/api/generated-apps/${APP_ID}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: label }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) throw new Error(json.error?.message || 'GENERATED_APP_CREATE_FAILED');
    await loadItems();
  }

  async function handleChoice(choice: Round['letter']) {
    const nextTries = tries + 1;
    setTries(nextTries);

    if (choice === round.letter) {
      const nextScore = score + 1;
      setScore(nextScore);
      setLastResult('correct');
      setMessage(`ถูกต้อง! ${round.letter} คือ ${round.word} (${round.thai})`);

      if (roundIndex >= rounds.length - 1) {
        await saveResult(`ABC game score ${nextScore}/${rounds.length} tries ${nextTries}`);
        setMessage(`จบเกมแล้ว เก่งมาก! ได้ ${nextScore}/${rounds.length} ดาว`);
      } else {
        window.setTimeout(() => {
          setRoundIndex((value) => value + 1);
          setLastResult('idle');
          setMessage('ข้อต่อไป แตะตัวอักษรให้ตรงกับรูปภาพ');
        }, 650);
      }
      return;
    }

    setLastResult('wrong');
    setMessage(`ยังไม่ใช่ ลองใหม่อีกครั้งนะ คำตอบคือ ${round.letter}`);
  }

  function resetGame() {
    setRoundIndex(0);
    setScore(0);
    setTries(0);
    setLastResult('idle');
    setMessage('แตะตัวอักษรให้ตรงกับรูปภาพ');
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadItems().catch((error) => setStatus(error instanceof Error ? error.message : 'GENERATED_APP_LOAD_FAILED'));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-6 md:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-6 shadow-2xl shadow-indigo-950/30 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-200">DSG Generated Full-Stack Game</p>
          <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">{APP_TITLE}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{APP_SUMMARY}</p>
          <div className="mt-6 grid gap-3 text-xs font-mono text-slate-400 md:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-4">planHash: {PLAN_HASH}</div>
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-4">approvalHash: {APPROVAL_HASH}</div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Live ABC Game</p>
              <h2 className="mt-2 text-2xl font-black text-white">{round.prompt}</h2>
            </div>
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100">
              คะแนน {score}/{rounds.length} · ข้อ {progress}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[2rem] border border-indigo-400/30 bg-slate-950/80 p-6 text-center">
              <div className="text-8xl md:text-9xl" aria-hidden="true">{round.emoji}</div>
              <p className="mt-5 text-4xl font-black text-white">{round.word}</p>
              <p className="mt-2 text-lg font-bold text-slate-400">{round.thai}</p>
              <div className="mt-5 min-h-8 text-2xl">{stars || '☆'}</div>
            </div>

            <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-4 md:p-6">
              <p className={`rounded-2xl border p-4 text-center text-base font-bold ${toneClass(lastResult)}`}>{message}</p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {choices.map((choice) => (
                  <button
                    key={choice}
                    onClick={() => handleChoice(choice).catch((error) => setMessage(error instanceof Error ? error.message : 'SAVE_FAILED'))}
                    className="min-h-28 rounded-3xl border border-indigo-400/30 bg-indigo-600 text-5xl font-black text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-500 active:scale-95 md:min-h-36 md:text-7xl"
                  >
                    {choice}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <button onClick={resetGame} className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 font-bold text-slate-100 hover:bg-slate-800">
                  เล่นใหม่
                </button>
                <button
                  onClick={() => saveResult(`ABC manual save score ${score}/${rounds.length} tries ${tries}`).catch((error) => setMessage(error instanceof Error ? error.message : 'SAVE_FAILED'))}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-500"
                >
                  บันทึกคะแนน
                </button>
              </div>
              {finished ? <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">เกมจบแล้วและบันทึกผลลงฐานข้อมูลแล้ว</p> : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Backend evidence</p>
              <h2 className="mt-2 text-2xl font-black text-white">ผลที่บันทึกไว้</h2>
            </div>
            <p className="text-sm text-slate-400">{status}</p>
          </div>
          <div className="mt-5 space-y-3">
            {savedItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="font-semibold text-slate-100">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            ))}
            {!savedItems.length && <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-500">ยังไม่มีผลคะแนนที่บันทึกไว้</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
