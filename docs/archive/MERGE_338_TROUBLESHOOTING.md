# Merge PR #338 ไม่ได้ — แนวทางแก้แบบเร็ว

เอกสารนี้สรุปขั้นตอนตรวจสอบเวลาที่ merge PR `#338` ไม่ผ่าน โดยเฉพาะกรณี conflict ระหว่าง branch ทำงานกับ branch ปลายทาง

## 1) ตรวจสถานะ repo ก่อน

```bash
git status
```

ต้องได้ working tree สะอาดก่อน (`nothing to commit, working tree clean`) เพื่อกัน conflict ซ้อนจากไฟล์ค้าง

## 2) ตรวจว่าเชื่อม remote แล้ว

```bash
git remote -v
```

ถ้าไม่มี `origin` ให้ผูก remote ก่อน:

```bash
git remote add origin git@github.com:tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
```

> ถ้าใช้ HTTPS ให้เปลี่ยนเป็น `https://github.com/...` ตามสิทธิ์ของเครื่อง

## 3) ดึง branch ล่าสุดทั้งหมด

```bash
git fetch origin --prune
```

## 4) สร้าง branch สำหรับแก้ conflict

```bash
git checkout -b merge-pr-338 origin/work
```

## 5) merge PR branch (ตัวอย่างชื่อ branch `feature/338`)

```bash
git merge --no-ff origin/feature/338
```

ถ้า conflict ให้แก้ไฟล์ที่ติด conflict และเช็คด้วย:

```bash
git status
```

## 6) รัน test ที่จำเป็นก่อน push

```bash
npm run test
```

ถ้า E2E ติดตั้ง browser ไม่ได้ (เช่น Playwright 403) ให้ถือเป็น infra issue แยกจาก code regression

## 7) commit และ push

```bash
git add -A
git commit -m "Resolve merge conflicts for PR #338"
git push -u origin merge-pr-338
```

## 8) กรณีต้องการ merge โดยไม่สร้าง commit merge

```bash
git merge --squash origin/feature/338
git commit -m "Squash merge PR #338"
```

ใช้เฉพาะเมื่อทีมตกลง policy ว่าอนุญาต squash

---

## ปัญหาที่พบบ่อย

- **`fatal: 'origin' does not appear to be a git repository`**
  - สาเหตุ: ยังไม่ตั้ง remote
  - แก้: ทำตามขั้นตอนข้อ 2

- **`refusing to merge unrelated histories`**
  - สาเหตุ: branch มาจากคนละประวัติ
  - แก้: ตรวจ branch ให้ถูกก่อน ถ้าจำเป็นจริงค่อยใช้ `--allow-unrelated-histories`

- **`non-fast-forward` ตอน push**
  - สาเหตุ: upstream เดินไปแล้ว
  - แก้: `git fetch origin` แล้ว `git rebase origin/work` หรือเปิด PR ใหม่จาก branch ที่แก้ conflict
