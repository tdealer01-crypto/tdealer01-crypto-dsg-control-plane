# Stripe Startups Credit — เงื่อนไขการใช้งาน

## 📋 เงื่อนไขหลัก

### ✅ สามารถใช้เครดิตได้กับ

| สิ่งที่ใช้ได้ | รายละเอียด |
|---|---|
| **ค่าธรรมเนียม Stripe ทั้งหมด** | Transaction fees, subscription fees, connect fees, radar fees, identity fees, tax fees, treasury fees, issuing fees |
| **ผลิตภัณฑ์ Stripe ใดๆ** | Payments, Billing, Connect, Radar, Identity, Tax, Treasury, Issuing, Terminal, Customers, Invoices, Disputes |
| **Sub-accounts** | เครดิตใช้ได้กับ connected accounts, resellers, agencies |
| **Test & Live mode** | ใช้ได้ทั้ง live mode (production) และ test mode (sandbox) |
| **ค่า overage** | Usage-based fees, metered billing, scale pricing |
| **ค่าใจdong** | ประเมินค่า, refund processing, chargeback fees (ส่วนหนึ่ง) |

---

### ❌ ห้ามใช้เครดิต

| สิ่งที่ห้าม | เหตุผล |
|---|---|
| **Stripe Apps** | Third-party Stripe marketplace apps (ต้องจ่ายแยก) |
| **Services ของบริษัทอื่น** | Google Cloud, AWS, Twilio (เฉพาะ Stripe fees เท่านั้น) |
| **Conversion/refund** | ห้ามแปลงเป็นเงินสด (cash back) |
| **Transfer ให้คนอื่น** | ห้ามให้คนอื่น ห้ามขาย ห้ามแลก |
| **Stripe balance ในอนาคต** | ไม่สามารถเก็บคืนเป็นเงินไว้ในบัญชี Stripe |

---

## ⏰ ระยะเวลา

### ความสำคัญ
```
📅 Activation date: เมื่อแอคทิเวทในแดชบอร์ด
📅 Expiration date: 24 เดือนหลังจากแอคทิเวท
❌ หลังหมด: เครดิตหายไป ใช้ไม่ได้
```

**ตัวอย่าง:**
- Activate: 29 มิถุนายน 2026
- Expires: 29 มิถุนายน 2028
- ⚠️ ต้องใช้ให้หมดก่อนวันนี้

### วิธีตรวจสอบวันหมดอายุ
```
1. Stripe Dashboard → Billing
2. ดู "Stripe Startups credit" section
3. ดู "Expires on" date
```

---

## 💳 วิธีการหักลด (Auto-apply)

### ทำงานอัตโนมัติ
```
ปกติ: ค่าธรรมเนียม $100 → คุณจ่าย $100

ด้วยเครดิต: ค่าธรรมเนียม $100 → 
  Stripe หักลดจากเครดิต $100 → 
  คุณจ่าย $0 
```

**ไม่ต้อง:**
- ✅ ใส่ promo code
- ✅ ทำ activation ซ้ำๆ
- ✅ ลิงก์กับ payment method ใดๆ
- ✅ ปรับ settings ใดๆ

**แค่:**
- 1️⃣ Activate ครั้งเดียว
- 2️⃣ ใช้ Stripe ตามปกติ
- 3️⃣ เครดิตหักลดโดยอัตโนมัติ

---

## 📊 ตัวอย่างการใช้

### Scenario 1: Transaction fees
```
จำนวน: 1,000 transactions × $50
ค่าธรรมเนียม: 2.9% + $0.30 = $1,750

❌ ไม่มีเครดิต: ต้องจ่าย $1,750
✅ มีเครดิต: หักจากเครดิต $1,750 → จ่าย $0
เครดิตเหลือ: $500,586 - $1,750 = $498,836
```

### Scenario 2: Subscription fees
```
Subscription: 100 users × $99/month
ค่าธรรมเนียม: $9,900/month

❌ ไม่มีเครดิต: ต้องจ่าย $9,900
✅ มีเครดิต: หักจากเครดิต $9,900 → จ่าย $0
เครดิตเหลือ: $500,586 - $9,900 = $490,686
```

### Scenario 3: Multiple products
```
Payments fees:         $2,000
Subscriptions fees:    $5,000
Connect fees:          $1,500
Radar fees:            $500 (ปกติ $1/txn × 500 txn)
---
รวม:                   $9,000

❌ ไม่มีเครดิต: ต้องจ่าย $9,000
✅ มีเครดิต: หักจากเครดิต $9,000 → จ่าย $0
เครดิตเหลือ: $500,586 - $9,000 = $491,586
```

---

## ⚖️ เงื่อนไขกฎหมายและนโยบาย

### Stripe Startups Program Terms

#### 1. **Eligibility Requirements**
```
✅ ต้องมี:
  - Actively operating startup
  - Founded within 7 years
  - First payment processing account (usually)
  - Verified business
  - Good standing with Stripe

❌ ห้ามมี:
  - Previous Startups credit
  - Suspended/restricted account
  - Prohibited business (gambling, adult, etc.)
  - High chargeback rate (>1%)
```

#### 2. **Credit Usage Policy**
```
✅ สามารถ:
  - ใช้กับ live transactions
  - ใช้กับ test transactions (จะมีการรีเซ็ต)
  - ใช้ได้ทุกผลิตภัณฑ์
  - ใช้ได้หลายบัญชี (connected accounts)

❌ ห้าม:
  - ใช้เพื่อเล่น/ทดลอง (gaming)
  - ทำความผิดหรือเอารัดเอาเปรียบ
  - ใช้กับ prohibited use cases
  - Resell/share เครดิต
```

#### 3. **Credit Termination**
```
Stripe อาจเพิกถอนเครดิตได้หากมีการ:
  ❌ ละเมิด Terms of Service
  ❌ ใช้เล่นหรือทดลองโดยตั้งใจ
  ❌ Chargeback rate > 1%
  ❌ Account suspended/closed
  ❌ Fraud detected
  ❌ Prohibited business activity
```

#### 4. **Expiration & Forfeiture**
```
❌ หากไม่ใช้ภายใน 24 เดือน:
  - เครดิตหายไปอัตโนมัติ
  - Stripe ไม่รีฟันด์
  - ไม่มีการขยายหรือต่ออายุ
```

---

## 📞 สิ่งสำคัญที่ต้องทำ

### Checklist ก่อนใช้
- [ ] ยืนยันว่า business eligible (startup, <7 ปี)
- [ ] ยืนยันว่าเป็น Stripe account ที่ถูกต้อง (acct_1Tft0OAZNzhgTUPV)
- [ ] ยืนยันว่า account ในสถานะ good standing
- [ ] ไม่มีการจำกัด (restricted) ใดๆ

### Checklist ระหว่างใช้
- [ ] Monitor credit balance monthly
- [ ] ติดตาม expiration date (จดบันทึก: 29 มิถุนายน 2028)
- [ ] ตรวจสอบ invoices เพื่อดูการหักลด
- [ ] ใช้กับ legitimate business purposes เท่านั้น

### Red flags ⚠️
หากเจอสิ่งต่อไปนี้ ห้ามใช้:
- [ ] Account ถูก restrict / suspend
- [ ] Chargeback rate สูง (>1%)
- [ ] Fraud alert
- [ ] Stripe ติดต่อขอ action
- [ ] Business ใน prohibited list

---

## 🔒 Security & Compliance

### ข้อกำหนด Stripe
```
✅ DSG ต้อง:
  - เก็บ secret keys อย่างปลอดภัย
  - ไม่เปิดเผย API keys
  - Comply กับ PCI DSS
  - ติดตามกฎหมายท้องถิ่น (ประเทศไทย, etc.)

❌ ห้าม:
  - Store card data locally
  - Share keys กับผู้อื่น
  - ใช้เป็น "crack" account
  - ทดลองผิดกฎหมาย
```

### Data Privacy
```
Stripe จะ:
  - ใช้ข้อมูล เพื่อ fraud detection
  - Share กับ payment processors
  - Comply กับ GDPR, ประเทศไทย law
  
Stripe ไม่:
  - Sell personal data
  - Share password/secrets
  - Disclose business model
```

---

## 📝 สิ่งที่ต้องจำ

### เงื่อนไขสำคัญ
1. **24 เดือน**: เครดิตหายถ้าไม่ใช้ในระยะเวลานี้
2. **ไม่รีฟันด์**: ไม่สามารถเปลี่ยนเป็นเงินสด
3. **Auto-apply**: ไม่ต้องทำอะไร หักลดโดยอัตโนมัติ
4. **ทั้ง live และ test**: ใช้ได้กับทั้ง modes
5. **ทั้ง Stripe**: ใช้ได้กับผลิตภัณฑ์ทั้งหมด

### เงื่อนไขเสี่ยง
```
Stripe อาจเพิกถอนหากมี:
  ⚠️ Account suspended
  ⚠️ Chargeback rate สูง
  ⚠️ Fraud activity
  ⚠️ Terms of Service violation
  ⚠️ Prohibited use
```

---

## ❓ FAQ

### Q: ต้องเปิดใช้เครดิตอีกครั้งหรือไม่?
**A:** ไม่ แอคทิเวทครั้งเดียว หักลดตลอด 24 เดือน

### Q: เครดิตใช้ไม่หมดมีคืนได้ไหม?
**A:** ไม่ เครดิตหายทั้งหมดเมื่อหมด 24 เดือน

### Q: สามารถใช้ส่วนหนึ่งแล้วเก็บไว้ได้ไหม?
**A:** ไม่ ใช้ให้หมด หากไม่ใช้จะหายไป

### Q: ต้องจ่าย tax จากเครดิตไหม?
**A:** ไม่ เครดิตเป็นค่าธรรมเนียม ไม่ใช่ income

### Q: Stripe บอกว่าเครดิตหมดแล้ว ต้องทำไร?
**A:** ขอ support จาก Stripe อาจมี extension หรือ promo ใหม่

### Q: ใช้เครดิต + coupon ได้ไหม?
**A:** ได้ เครดิตหักก่อน แล้วค่อยหักจาก coupon

### Q: Sub-account (connected account) ใช้เครดิตได้ไหม?
**A:** ได้ เครดิตหักจากค่าธรรมเนียม connected account ด้วย

---

## 🔗 ที่มา & ข้อมูลเพิ่มเติม

- [Stripe Startups Official](https://stripe.com/en-gb/startups)
- [Stripe Terms of Service](https://stripe.com/en-gb/legal/ssa)
- [Stripe Products Documentation](https://stripe.com/docs)
- [Contact Stripe Support](https://support.stripe.com)

---

**ตรวจสอบครั้งล่าสุด:** 2026-06-29  
**เครดิต:** ฿500,586  
**บัญชี:** DSG Governance Gate (acct_1Tft0OAZNzhgTUPV)  
**วันหมด:** 2028-06-29 (ประมาณ)
