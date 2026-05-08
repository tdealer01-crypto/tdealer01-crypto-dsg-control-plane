'use client';

import { useEffect } from 'react';

type Lang = 'th' | 'en';
type CopyPair = readonly [string, string];

const pairs: readonly CopyPair[] = [
  ['Customer evidence monitor', 'ตัวตรวจหลักฐานลูกค้า'],
  ['Goal', 'เป้าหมาย'],
  ['Success criteria', 'เงื่อนไขความสำเร็จ'],
  ['Constraints', 'ข้อจำกัด'],
  ['PR Evidence', 'หลักฐานคำขอรวมโค้ด'],
  ['PRD summary', 'สรุปเอกสารงาน'],
  ['Plan steps', 'ขั้นตอนแผน'],
  ['Open generated app in this browser', 'เปิดแอปที่สร้างในเบราว์เซอร์นี้'],
  ['Agent services', 'บริการเอเจนต์'],
  ['Evidence', 'หลักฐาน'],
  ['Governance', 'กำกับดูแล'],
  ['Handoff', 'ส่งมอบงาน'],
  ['Build app', 'สร้างแอป'],
  ['Repository', 'คลังโค้ด'],
  ['Branch', 'สาขาโค้ด'],
  ['Files', 'ไฟล์'],
  ['Audit written', 'บันทึกตรวจสอบแล้ว'],
  ['Copy proof JSON', 'คัดลอก proof JSON'],
  ['Open pull request', 'เปิดคำขอรวมโค้ด'],
  ['Create pull request', 'สร้างคำขอรวมโค้ด'],
  ['Send to runtime', 'ส่งเข้าระบบรัน'],
  ['Approve plan', 'อนุมัติแผน'],
];

const enToTh: ReadonlyMap<string, string> = new Map<string, string>(pairs);
const thToEn: ReadonlyMap<string, string> = new Map<string, string>(pairs.map(([en, th]) => [th, en]));

function currentLang(): Lang {
  return typeof window !== 'undefined' && window.localStorage.getItem('dsg:language') === 'en' ? 'en' : 'th';
}

function translateText(value: string, lang: Lang) {
  const trimmed = value.trim();
  const next = lang === 'th' ? enToTh.get(trimmed) : thToEn.get(trimmed);
  if (!next) return value;
  return value.replace(trimmed, next);
}

function applyCopy(lang: Lang) {
  document.documentElement.lang = lang;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) node.nodeValue = translateText(node.nodeValue || '', lang);
  document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((item) => {
    const el = item as HTMLInputElement | HTMLTextAreaElement;
    el.placeholder = translateText(el.placeholder, lang);
  });
}

export function AppLanguageCopyBridge() {
  useEffect(() => {
    let lang = currentLang();
    const applySoon = () => window.setTimeout(() => applyCopy(lang), 30);
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const text = target?.textContent?.trim();
      if (text === 'ไทย') { lang = 'th'; window.localStorage.setItem('dsg:language', 'th'); applySoon(); }
      if (text === 'EN') { lang = 'en'; window.localStorage.setItem('dsg:language', 'en'); applySoon(); }
    };
    const observer = new MutationObserver(applySoon);
    document.addEventListener('click', onClick, true);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    applySoon();
    return () => { document.removeEventListener('click', onClick, true); observer.disconnect(); };
  }, []);
  return null;
}
