# VibeBook — สถานะ & แผน 4 วันสุดท้าย

ร่าง ณ ส. 31 ต.ค. 2026 · ช่วงแฮก 26 ต.ค. – 4 พ.ย. · เดโม 3 นาที
เกณฑ์ตัดสิน: Impact 30% · Meta tools 25% · Technical depth 20% · Demo 25%

---

## มีอะไรแล้ว

- **ไอเดียล็อกแล้ว:** VibeBook (โหวตชนะ Farm Sim) — "Don't just like it. Vibe it."
- **Handoff PDF 19 หน้า** (30 ต.ค.): vision, user journey 6 ขั้น, FR-01..15, architecture, ExperienceSpec v0.1, risk register, สคริปต์เดโม 3 นาที
- **สไลด์ cinematic 5 หน้า** (PNG): เป็น concept mockup ไม่ใช่ screenshot ของจริง
- **Hero use case:** รูป Everest → เกม snowboard → แชร์ → เพื่อน remix
- **Transcript ประชุม:** หัวใจคือ "ง่าย + แชร์ได้" และเน้นเดโม/ความรู้สึกมากกว่า engineering เต็มระบบ

## ยังไม่มี

- **โค้ด:** โฟลเดอร์นี้ยังไม่มีอะไรรันได้เลย
- **Meta API key ที่ยืนยันแล้วว่าใช้ได้:** เครดิต $150/คน กดขอแล้วหรือยัง และเรียกจากไทยได้ไหม
- **กติกาการส่งงาน:** ต้องส่งอะไรบ้าง และ deadline กี่โมง timezone ไหน (รูป "what to submit" ใน Discord ไม่ได้แนบมา และหน้า Cerebral Valley โหลดไม่ขึ้น)
- **วิดีโอเดโม 3 นาที, README/write-up, URL ที่ deploy แล้ว**

---

## ข้อค้นพบใหม่: Meta Model API มีอะไรให้ใช้ (เช็กจาก docs วันนี้)

Base URL `https://api.meta.ai/v1`, Bearer `MODEL_API_KEY`, ใช้ OpenAI SDK ได้

| Model | ทำอะไรได้ | ใช้ใน VibeBook ตรงไหน |
|---|---|---|
| `muse-spark-1.3` | เข้าใจภาพ/วิดีโอ, structured output, tool calling | วิเคราะห์โพสต์ → เสนอ 3 Vibe → เขียน ExperienceSpec JSON → แก้เกมด้วยภาษาธรรมชาติ |
| `muse-image-1.0` | สร้างภาพ + แก้ภาพ (`/v1/images/edits`) | แปลงรูป Everest เป็น game art, ทำภาพเวอร์ชัน remix (Night Run สีนีออน) |
| `sam-3.1` | segment ภาพ → mask | ตัดสันเขาจากรูปจริงมาเป็นเส้นทางสไลด์ในเกม ("รูปกลายเป็นด่าน") — stretch |
| `muse-voice-transcribe-1.0` | เสียง → ข้อความ | (optional) พูดสั่งแก้เกม |

**ข้อควรระวัง:** Meta API **ไม่มีโมเดลสร้างวิดีโอ** ดังนั้น Video track ใน PDF (Muse Video) ตัดออกจากตัวแอปไปเลย

ใช้โมเดล Meta 3–4 ตัวในขั้นตอนเดียวกัน และโชว์ให้เห็นในเดโมช่วง "behind the scenes" (0:35–1:15) เพื่อเก็บคะแนน Meta tools 25%

---

## ตัด scope ให้ทันใน 4 วัน

**ทำแค่ Roadmap Stage 1 + 2 ใน PDF:**
mock feed → ✦ Vibe → suggestion cards → เล่นเกม snowboard ได้จริง → สั่งแก้ 1 อย่าง → แชร์ URL → เพื่อนเปิดลิงก์แล้ว remix (มีเครดิตต้นทาง)

**อัปเดต 31 ต.ค.:** เปลี่ยนเป็นใช้ Chrome extension บน facebook.com เป็นทางเข้าหลัก — ดูแผนเต็มที่ `docs/2026-10-31-vibebook-extension-design.md`

**ตัดออก:** Facebook Graph API, video generation, BD interviews/legal/unit economics, remix graph เต็มระบบ, REA ในเส้นทางหลัก (REA ใช้แกะแอป ไม่จำเป็นสำหรับ Everest → เกม; เก็บไว้พูดเป็น future)

**หลักการสร้างเกม:** AI ไม่ได้เขียนโค้ดเกมเอง แต่เขียน ExperienceSpec แล้วให้ template เกม Phaser ที่เราเขียนไว้แล้วอ่าน spec ไปเล่น วิธีนี้ทำให้เกมเล่นได้ทุกครั้ง (ตรงกับ risk register ใน PDF: "templates + strict specs + smoke tests") ส่วนให้ AI เขียนโค้ดเองแบบอิสระเก็บเป็น stretch

**ค่าเริ่มต้นที่ใช้ (ตาม PDF หน้า 17):** output แรก = เกม snowboard 2D บนเบราว์เซอร์ · input = รูปที่ผู้ใช้อัปโหลดเองในฟีดจำลอง · runtime = Phaser · ฟีดต้องติดป้ายว่าเป็น simulation

**Stack (ข้อเสนอของผม):** Next.js + TypeScript + Phaser 3, เรียก Meta API ฝั่ง server เท่านั้น (key ไม่หลุดไปฝั่ง browser), ที่เก็บข้อมูลแบบง่ายสำหรับ share/remix (ตัดสินใจตอน deploy)

---

## ตารางวัน (เก่า — แผนใหม่หลังประชุมทีมอยู่ที่ `docs/2026-10-31-vibebook-extension-design.md` §10)

| วัน | งาน | จบเมื่อ |
|---|---|---|
| ส. 31 | ยืนยัน API key (`GET /v1/models`) และกติกาส่งงาน · ตั้งโปรเจกต์ · mock feed + ปุ่ม Vibe | เปิดเว็บเห็นฟีด กด Vibe แล้วมี suggestion |
| อา. 1 | Muse Spark → suggestions + ExperienceSpec · เกม Phaser snowboard อ่าน spec · Muse Image ทำพื้นหลัง | อัปรูป Everest แล้วเล่นเกมได้ |
| จ. 2 | สั่งแก้ด้วยภาษาธรรมชาติ · share URL · remix fork + เครดิตต้นทาง · deploy | เพื่อนเปิดลิงก์จากอีกเครื่องแล้ว remix ได้ |
| อ. 3 | SAM 3.1 terrain (stretch) · polish · อัดฟุตเทจ · ตัดวิดีโอ 3 นาที | มีวิดีโอ draft |
| พ. 4 | buffer · README/write-up · ส่งงาน | ส่งแล้ว |

---

## ต้องการจากทีม

1. กติกาส่งงาน + deadline (แปะรูปหรือข้อความ "what to submit")
2. ใครมี `MODEL_API_KEY` ที่ใช้ได้แล้วบ้าง
3. Bird / โอม เริ่มเขียนโค้ดหรือลอง REA ไปถึงไหนแล้ว จะได้ไม่ทำซ้ำกัน
4. จะ deploy ที่ไหน (Vercel หรืออื่น ๆ)
