# Release Gate - User Guide

## 🎯 ผู้ใช้จำเป็นต้องใช้งานอะไร?

### **1️⃣ เข้าใช้งาน Release Gate**

#### วิธีที่ 1: Free Tier (ไม่ต้องเสียเงิน)
```
https://your-app.com/release-gate

1. ใส่ URL ของแอปที่ต้องการตรวจสอบ
   เช่น: https://myapp.com

2. คลิก "Check"

3. ได้ผลลัพธ์ทันที
   - ✅ GO / ⚠️ NO-GO
   - ✅ Health checks (ต่อ request ไม่ไป)
   - ✅ Response time (ช้าไหม)
```

#### วิธีที่ 2: Pro Tier (บันทึกรายงาน + ตั้งเวลาตรวจสอบอัตโนมัติ)
```
1. คลิก "Upgrade to Pro" ($29/month)
2. กรอกอีเมล
3. ชำระเงินผ่าน Stripe
4. รับ session ID
5. ใช้งาน Pro features
```

---

## 📊 ผลลัพธ์ที่ได้ (API Response)

### **ตัวอย่าง: Free Tier User**
```bash
GET /api/release-gate/check?url=https://myapp.com

Response:
{
  "verdict": "GO",                    # ✅ แอปพร้อมใช้
  "tier": "free",                     # 🆓 Free tier
  "message": "Free tier active - basic checks only",
  
  "features": {
    "reports": "ℹ️ Not available - Upgrade to Pro",
    "history": "ℹ️ Not available - Upgrade to Pro",
    "scheduling": "ℹ️ Not available - Upgrade to Pro",
    "notifications": "ℹ️ Not available - Upgrade to Pro",
    "teamAccess": "ℹ️ Not available - Upgrade to Pro"
  },
  
  "upgrade": {
    "message": "Want to save reports and automate checks?",
    "proPlan": {
      "name": "Pro",
      "price": "$29/month",
      "ctaLink": "/release-gate/checkout?plan=pro"
    }
  }
}
```

### **ตัวอย่าง: Pro Tier User**
```bash
GET /api/release-gate/check?url=https://myapp.com&session_id=cs_test_...

Response:
{
  "verdict": "GO",
  "tier": "pro",                      # ⭐ Pro tier
  "message": "Pro access enabled - full checks available",
  
  "features": {
    "reports": "Available - Save unlimited reports",
    "history": "Available - View check history",
    "scheduling": "Available - Daily automated checks",
    "notifications": "Available - Email alerts",
    "teamAccess": "Available - Share with team"
  },
  
  "sessionInfo": {
    "sessionId": "cs_test_...",
    "email": "user@example.com",
    "hint": "Use this session_id for faster future checks"
  }
}
```

---

## 🎁 Features ที่ได้รับตามแต่ละ Tier

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| **Basic Checks** | ✅ | ✅ | ✅ |
| **Trust Pages** | ✅ | ✅ | ✅ |
| **Health Endpoint** | ✅ | ✅ | ✅ |
| **GO/NO-GO Verdict** | ✅ | ✅ | ✅ |
| **Save Reports** | ❌ | ✅ | ✅ |
| **View History** | ❌ | ✅ | ✅ |
| **Daily Auto-Check** | ❌ | ✅ | ✅ |
| **Email Alerts** | ❌ | ✅ | ✅ |
| **Team Access** | ❌ | ✅ | ✅ |
| **Custom Workflows** | ❌ | ❌ | ✅ |
| **Audit Validation** | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ |

---

## 💡 How to Use (ขั้นตอนละเอียด)

### **Step 1: เข้าหน้า Release Gate**
```
ไปที่: https://your-app.com/release-gate
```

### **Step 2: ใส่ URL ของแอป**
```
กรอกในช่อง "Your App URL"
เช่น: https://myapp.example.com
```

### **Step 3: คลิก "Check"**
```
ระบบจะทำการตรวจสอบอัตโนมัติ
⏳ เวลา: 5-10 วินาที
```

### **Step 4: ดูผลลัพธ์**
```
✅ GO           = แอปพร้อมใช้
⚠️ NO-GO        = มีปัญหา ต้องแก้ไข

รายละเอียด:
- Trust pages (มีหน้า /trust ไหม)
- Health check (API ตอบกลับไหม)
- Response time (ไม่เกิน X วินาที)
```

### **Step 5: อัพเกรดเป็น Pro (ถ้าต้องการ)**
```
คลิก "Upgrade to Pro"
↓
เลือก Pro Plan ($29/month)
↓
กรอกอีเมล
↓
ชำระเงินผ่าน Stripe
↓
รับ session ID
↓
เก็บ session ID ไว้สำหรับครั้งต่อไป
```

---

## 🔒 Security & Privacy

### **ข้อมูลที่เราเก็บ**
✅ URL ของแอปที่ตรวจสอบ
✅ ผลลัพธ์ของการตรวจสอบ
✅ Email (สำหรับ Pro users)

### **ข้อมูลที่เราไม่เก็บ**
❌ Source code ของแอป
❌ Database credentials
❌ API keys
❌ User data จากแอปของคุณ

### **ความเป็นส่วนตัว**
- ข้อมูล encrypted ในการส่งส่ง (HTTPS)
- Subscription info จัดการโดย Stripe (PCI compliant)
- ผลลัพธ์บันทึกเฉพาะ Pro users

---

## 🎯 Use Cases (สถานการณ์การใช้งาน)

### **Use Case 1: Quick Verification (ตรวจสอบเร็ว)**
```
👤 ผู้ใช้: Developer
⏰ เวลา: 1 นาที
📱 Device: Desktop

1. เข้า Release Gate
2. ใส่ URL
3. ดูผลลัพธ์
4. แก้ไขปัญหา (ถ้ามี)
5. เสร็จ!
```

### **Use Case 2: Automated Daily Checks (ตรวจสอบอัตโนมัติทุกวัน)**
```
👤 ผู้ใช้: DevOps Engineer
📅 ความถี่: ทุกวัน 8 AM
📧 Notification: Email

ข้อมูล:
1. อัพเกรด Pro
2. ตั้งเวลา Daily Checks
3. เลือก Email notification
4. ระบบส่งรายงานอัตโนมัติทุกวัน
5. ดูประวัติผลลัพธ์
```

### **Use Case 3: Team Collaboration (ทำงานเป็นทีม)**
```
👤 ผู้ใช้: Tech Lead
👥 ทีม: 5 คน
📊 Reports: Shared

1. สมาชิกทีมเสริมเข้า
2. แบ่งปันรายงาน
3. Comment on issues
4. Assign tasks
5. Track progress
```

### **Use Case 4: Enterprise Monitoring (Monitoring ขั้นองค์กร)**
```
👤 ผู้ใช้: Infrastructure Lead
🏢 องค์กร: 100+ services
🎯 SLA: 99.9% uptime

1. Enterprise plan
2. Custom audit gates
3. Advanced monitoring
4. 24/7 support
5. Compliance reporting
```

---

## ❓ FAQ (คำถามที่พบบ่อย)

### **Q: ฟรีแลงบ้านไหม?
**A:** ใช่! Free tier ใหม่ทำให้ผู้ใช้ทั้งหมดสามารถตรวจสอบแอปได้โดยไม่ต้องจ่ายเงิน

### **Q: ถ้า Stripe down ล่ะ?
**A:** ไม่เป็นไร! ระบบจะ fallback เป็น Free tier อัตโนมัติ ผู้ใช้ยังสามารถตรวจสอบแอปได้

### **Q: ข้อมูลของฉันปลอดภัยไหม?
**A:** ปลอดภัย 100%:
- HTTPS encryption
- Stripe PCI compliant
- ไม่บันทึก sensitive data
- Row-level security ใน database

### **Q: ต้องใช้ session_id ไหม?
**A:** ไม่บังคับ แต่ถ้าเคยอัพเกรดไว้ ให้เก็บ session_id ไว้ เพื่อให้ระบบจำได้ว่าคุณเป็น Pro user

### **Q: Pro plan ยาวเท่าไหร่?
**A:** 1 เดือน ($29/month) สามารถยกเลิกได้ตลอดเวลา

### **Q: ได้ refund ไหม?
**A:** ได้ ถ้ายกเลิกภายใน 14 วัน โปรดติดต่อ support@dsg.one

---

## 🚀 Best Practices

### **1. ตรวจสอบก่อนปล่อยแอป (Pre-Launch)**
```
✅ ล็อคอินใช้งานได้ไหม
✅ Database เชื่อมต่อได้ไหม
✅ API responses เร็วไหม
✅ Health endpoints ตอบได้ไหม
✅ Trust pages มีไหม
```

### **2. ตรวจสอบอัตโนมัติทุกวัน (Daily Monitoring)**
```
1. อัพเกรด Pro
2. ตั้ง Daily Check
3. เลือก Email notification
4. ตั้งเวลา เช่น 8 AM
5. ทีมจะได้รับรายงานอัตโนมัติ
```

### **3. ใช้ Session ID (Save Time)**
```
1. ครั้งแรกอัพเกรด → ได้ session_id
2. บันทึก session_id
3. ครั้งต่อไปใช้ session_id
4. ตรวจสอบได้เร็วขึ้น
```

### **4. Share Reports (ทำงานเป็นทีม)**
```
1. Pro user ก็สามารถแชร์รายงาน
2. Team members ดูได้
3. Comment & assign tasks
4. Track ความก้าวหน้า
```

---

## 📞 Support

หากมีปัญหา:
1. ไปที่ https://your-app.com/support
2. หรือ Email: support@dsg.one
3. Response time: ภายใน 24 ชั่วโมง

---

## 🎓 Tutorial Videos

- 📺 [Quick Start (2 min)](https://youtube.com/watch?v=...)
- 📺 [Upgrade to Pro (3 min)](https://youtube.com/watch?v=...)
- 📺 [Team Collaboration (5 min)](https://youtube.com/watch?v=...)
- 📺 [Enterprise Setup (10 min)](https://youtube.com/watch?v=...)

---

**Last Updated**: May 7, 2026
**Version**: 1.0
