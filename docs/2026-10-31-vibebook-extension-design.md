# VibeBook — Design & แผนสร้าง (Chrome extension, minimal)

ร่าง ส. 31 ต.ค. 2026 · แทนที่ส่วน "ตัด scope" ใน `VIBEBOOK_STATUS_PLAN.md`
ที่มา: Handoff PDF (30 ต.ค.), สไลด์ 5 หน้า, transcript ประชุม, docs ของ OpenRouter และ Meta Model API (เช็กวันนี้)

---

## ★ อัปเดตหลังประชุมทีม ส. 31 ต.ค. (ค่ำ) — อ่านส่วนนี้ก่อน

**สิ่งที่ทีมตัดสินใจหรือขอเพิ่ม**

| เรื่อง | เดิม | ใหม่ | ใคร |
|---|---|---|---|
| Hero | Everest → snowboard | เหมือนเดิม (จากสไลด์พี่ชิน) | ทีม |
| ปุ่มบน FB | ชิปบนรูป, ทางสำรอง = mock feed | ลองปุ่มตรง ๆ ก่อน ทางสำรองแรก = กดไอคอน extension บน toolbar ให้มันอ่านโพสต์จากหน้า (ข้อความ + รูป) แล้วส่งให้ AI · ทางสำรองสุดท้าย = หน้า `/app` | ทีม (ทางสำรองจากพี่เบิร์ด) |
| สิ่งที่สร้างได้ | เกมอย่างเดียว | เกม + **แอป/ประสบการณ์** (พี่เบิร์ด: เกมอย่างเดียวดูเฉพาะทางเกินไป แยกเป็น 2 prompt ได้) | พี่เบิร์ด |
| แนวคิด | รูป → เกม | รูป → อะไรก็ได้ ขยายประสบการณ์ของสิ่งที่เห็นในรูป เช่น วิวฟูจิ → นั่งชงชา หรือเล่นสกีจากจุดนั้น | พี่ชิน |
| หน้าเว็บ HTML ไฟล์เดียวแบบ artifact | – | ดูการตีความด้านล่าง | พี่ชิน (ผ่านพี่เบิร์ด) |
| วิดีโอ | อัดวันอังคาร | **อัด v1 พรุ่งนี้ (อา. 1)** เพราะพิวว่างแค่วันอาทิตย์ · ส่งงานวันที่ 4 | ทีม |
| AI | – | OpenRouter ไปก่อน (สมัคร Meta แล้วแต่ยังไม่มีเครดิต) | ทีม |

**การตีความ "หน้าเว็บ HTML ไฟล์เดียวแบบ artifact"** (ยังไม่ได้ยืนยันกับพี่ชิน) อ่านได้ 2 แบบ และทำได้ทั้งคู่:
1. ตัว VibeBook เปิดเป็นหน้าเว็บได้เองโดยไม่ต้องลง extension → ทำหน้า `/app` บนโดเมนเรา (อัปโหลดรูปหรือวางข้อความโพสต์ → flow เดียวกับ panel) ใช้เป็นทางสำรองถ้า FB บล็อก และให้กรรมการลองได้โดยไม่ต้องติดตั้งอะไร
2. ผลลัพธ์ที่ AI สร้างเป็นหน้า HTML ไฟล์เดียว แสดงในพาเนลแบบ artifact → คือ track แอปด้านล่าง

**ออกแบบใหม่: 2 track, 2 prompt**
- **Prompt 1** (`/api/vibe`): ดูรูป + caption → การ์ด 3 ใบ แต่ละใบมี `kind: game | app` และต้องมีทั้งสองแบบ (เช่น Everest Rush 🎮 · Summit Planner 🧭 · Base Camp Tea 🍵)
- **Prompt 2** (สร้างตามการ์ดที่เลือก):
  - `game` → ExperienceSpec → Phaser template (preset เดิม เดโมไม่พัง)
  - `app` → AI เขียน HTML ไฟล์เดียว (CSS/JS inline, ใช้รูปต้นทางได้, ห้ามเรียก network ภายนอก)
    - แสดงใน iframe `srcdoc` + `sandbox="allow-scripts"` (origin แยก จึงแตะ editToken หรือข้อมูลของหน้าเราไม่ได้)
    - รอ `vibebook:ready` ภายใน ~5 วิ ถ้าไม่มาหรือมี error ให้ส่ง error กลับไปให้ AI ซ่อม 1 รอบ
- แยกเป็น 2 prompt จึงไม่ติดกฎ schema ห้าม `oneOf` และการ์ดขึ้นเร็วกว่าเดิม
- record เพิ่มแค่ `kind` กับช่อง `html` ส่วนการแชร์ การ์ด OG และ remix ใช้ร่วมกันได้
- **ความเสี่ยง:**
  - โค้ดยาว 5–10k token ใช้เวลานาน → เช็กเพดานเวลาของ Vercel Hobby ใน S3 ถ้าไม่พอให้ stream
  - ยังไม่รู้ว่า Muse contributor เขียนโค้ดเก่งแค่ไหน → แยกโมเดลของขั้นเขียนโค้ดไว้ใน env (`*_CODE_MODEL`) สลับได้โดยไม่กระทบขั้นอื่น
- **สำหรับวิดีโอพรุ่งนี้:** สร้างเคสแอปไว้ล่วงหน้าด้วย pipeline เดียวกันแล้วเก็บเป็น record ปกติ ในวิดีโอบอกตรง ๆ ว่าสร้างไว้ก่อนด้วยระบบเดียวกัน วิดีโอจะได้ไม่ต้องพึ่งการเขียนโค้ดสด

**ขั้นชวนสร้าง (Discord อา. 1 พ.ย.)** — หลังอ่านโพสต์ให้ Muse เสนอว่าโพสต์นี้ชวนผู้ใช้ไปสร้างอะไรได้บ้าง เหตุผลของพี่: ผู้ใช้ส่วนใหญ่ไม่รู้ว่า GenAI ทำอะไรได้ ตัวเลือกง่าย ๆ ทำให้กดครั้งแรกง่ายขึ้น ขั้นนี้คือ Prompt 1 ที่มีอยู่แล้ว แต่เพิ่มกฎ:
- **ถ้อยคำบนการ์ด:** ประโยคเดียว บอกว่าจะได้อะไร เฉพาะกับโพสต์นั้น และพูดถึงตัวผู้ใช้ ("you and your friend …") ไม่ใช่ชื่อแนวคิดลอย ๆ
- **สัญญาเฉพาะสิ่งที่สร้างได้จริง:** enum ของ `kind` ที่ส่งให้โมเดลมาจากรายการ kind ที่เปิดใช้ในโค้ด วันนี้มี `game | app` ส่วน `image` จะเปิดเมื่อ P1 ข้อ 1 เสร็จ
- **หลายแบบ:** ถ้าเปิดไว้ ≥ 2 kind การ์ด 3 ใบต้องมีมากกว่าหนึ่ง kind (บังคับใน zod)
- **ตัวอย่างใน prompt** (ดัดแปลงจากของพี่ โพสต์เรือ Azimut):
  - 🎮 "Race an Azimut yacht and grab every coin"
  - 🧩 "Plan your dream yacht day: route, crew, packing list"
  - 🖼️ "A selfie of you and your partner outrunning the water police" (ใช้ตอนเปิด `image` แล้ว)
- **วิดีโอไม่ทำ** แม้พี่จะยกตัวอย่างมา
  - Meta API ไม่มีโมเดลวิดีโอ
  - OpenRouter มี (`POST /api/v1/videos` ใช้รูปโพสต์เป็นเฟรมแรกได้) แต่ต้องรอ 30 วิถึงหลายนาที คิดเงินต่อวินาที และไม่ได้คะแนน Meta tools
  - เก็บไว้พูดเป็น future

**เคสแอปที่จะโชว์ (เลือก 1)**
1. รูป Everest รูปเดิม → การ์ดแอป (เช่น expedition planner หรือ packing checklist) โชว์ว่ารูปเดียวได้ทั้งเกมและแอป
2. รูปวิวฟูจิ → ชงชาแบบโต้ตอบ (ไอเดียพี่ชิน)
3. โพสต์ที่คนบ่นเรื่องแอป (หาจาก X ตามที่พี่เบิร์ดแนะ) → mini app ที่แก้ปัญหานั้น (โพสต์ข้อความล้วนก็ได้ ไม่ต้องมีรูป)

**ต้องทำคืนนี้นอกจากโค้ด:** ขอเครดิต Meta $150 (อนุมัติอาจใช้เวลา) · `git init` + สร้าง repo บน GitHub (โอมจะเชิญทีมพรุ่งนี้)

---

## 0. สรุปในย่อหน้าเดียว

ทำ Chrome extension ที่เติมปุ่ม **✦ Vibe** บนรูปในโพสต์ Facebook จริง กดแล้วจะเปิดหน้าต่างทับหน้า FB ที่ AI ดูรูป เสนอเกม 3 แบบ แล้วเล่นได้ทันที พิมพ์สั่งแก้เกมได้ กดแชร์ได้ลิงก์ไปโพสต์ลง FB จริง เพื่อนเปิดลิงก์บนมือถือแล้วเล่นต่อและ remix ได้โดยไม่ต้องลง extension
AI ใช้ OpenRouter (โมเดลถูก) ไปก่อน แล้วค่อยสลับไป Meta Model API ด้วยการเปลี่ยน config ตัวเกมเป็น template ที่เราเขียนเอง AI แค่เลือกค่า (ExperienceSpec) เกมเลยเล่นได้ทุกครั้ง

---

## 1. สิ่งที่ตัดสินใจแล้ว

| เรื่อง | ตัดสินใจ | ใครตัดสิน |
|---|---|---|
| ทางเข้าหลัก | Chrome extension บน facebook.com + หน้า `/app` บนเว็บเรา (ไม่ต้องติดตั้ง) | ผู้ใช้ + ประชุมทีม |
| ขนาดงาน | minimal ที่สุด | ผู้ใช้ |
| AI ช่วงพัฒนา | `meta/muse-spark-1.3-contributor` ผ่าน OpenRouter (ถูกสุดในงานเรา และเป็นโมเดล Meta) แล้วค่อยสลับเป็น Meta Model API ตรง | ผู้ใช้ (31 ต.ค. หลังเทียบราคา) |
| Output | เกม 2D บนเบราว์เซอร์ (downhill runner) + แอป/ประสบการณ์ที่ AI เขียนเป็น HTML ไฟล์เดียว | PDF หน้า 17 + ประชุมทีม |
| วิธีสร้างเกม | AI เขียน spec → template Phaser อ่าน spec (ไม่ให้ AI เขียนโค้ดเกม) | PDF risk register + ผม |
| ฉากหลังเกม | ใช้รูปจากโพสต์เป็นฉากหลังตรง ๆ ("รูปกลายเป็นเกม") | ผม |
| ตัวละคร/สิ่งกีดขวาง | emoji (🏂 🌲 🪨 ⭐) — ใช้ได้กับทุกธีม ไม่ต้องวาด asset | ผม |
| Stack | extension = JS ล้วนไม่มี build step · server = Next.js บน Vercel · ข้อมูล JSON เก็บใน Upstash Redis · รูปเก็บใน Vercel Blob | ผม (เปลี่ยนได้) |
| ภาษา UI + ข้อความที่ AI แต่ง | อังกฤษ (กรรมการเป็นระดับ global) ส่วน caption ต้นทางเป็นภาษาอะไรก็ได้ | ผม (เปลี่ยนได้ แต่ถ้าใช้ไทยต้องฝังฟอนต์ไทยในการ์ด OG) |
| โมเดลในฟุตเทจสุดท้าย | เรียก Meta Model API ตรง (ปลอดภัยสุดสำหรับคะแนน Meta tools) | ผม (รอดูกติกา) |

---

## 2. Flow เดโมที่ต้องได้ (P0)

ตรงกับสคริปต์ 3 นาทีใน PDF หน้า 13

1. **HOOK** — ฟีด FB จริง มีโพสต์รูป Everest ของบัญชีทีมเอง
2. **MAGIC BUTTON** — มุมรูปมีชิป ✦ Vibe → กด → หน้าต่าง VibeBook เลื่อนขึ้นมาทับด้านขวาของหน้า FB
3. **TRANSFORM** — โชว์ขั้นตอนจริงทีละขั้น: "Reading the photo…" → การ์ด 3 ไอเดีย (เช่น Everest Rush / Avalanche Escape / Yeti Chase) → กดเลือก → "Building… ✓ Spec valid ✓ Game loaded"
4. **INTERACT** — เล่นเกม: ซ้าย/ขวา หลบสิ่งกีดขวาง เก็บดาว คะแนนขึ้น
5. **PERSONALIZE** — พิมพ์ "add a rocket boost and make it night" → เกมรีโหลด มีชิปบอกสิ่งที่เปลี่ยน (+ boost · night)
6. **SHARE** — กด Share → ได้ลิงก์ → วางในโพสต์ FB ใหม่ → FB โชว์การ์ดภาพปกเกม "▶ Play Everest Rush"
7. **REMIX** — อีกคนเปิดลิงก์บนมือถือ → เล่น → กด ✦ Remix → พิมพ์ "neon night run" → ได้ลิงก์ใหม่ มีบรรทัด "remixed from Everest Rush by …"

ข้อ 6–7 เป็นเว็บธรรมดา ไม่ต้องใช้ extension

---

## 3. เส้นแบ่ง P0 / P1 / ไม่ทำ

**P0 — ต้องมีถึงจะเดโมได้**
- ชิป ✦ Vibe บนรูปในโพสต์ FB (feed + หน้าดูรูป)
- หน้าต่าง overlay: ไอเดีย 3 แบบ → เล่น → สั่งแก้ → แชร์
- `/api/vibe`: ดูรูปแล้วตอบการ์ด 3 ใบที่มีทั้ง `game` และ `app` · `/api/experiences` สร้างตามการ์ดที่เลือก
- เกม template ที่อ่านทุกช่องใน spec ได้ และเล่นด้วยนิ้วบนมือถือได้
- track แอป: AI เขียน HTML ไฟล์เดียว → sandbox iframe → smoke test → ซ่อม 1 รอบ
- หน้า `/app` เปิด flow เดียวกันได้โดยไม่ต้องลง extension
- สั่งแก้ด้วยภาษาธรรมชาติ → spec ใหม่ → version ใหม่
- Publish → ลิงก์ `/p/:id` ที่มี OG tag (FB โชว์การ์ดสวย)
- หน้า play/remix บนมือถือ พร้อมเครดิตต้นทาง
- Deploy ขึ้น Vercel
- สลับไป Meta API ก่อนอัดวิดีโอจริง (ถ้า key ใช้ได้)

**P1 — ทำถ้ามีเวลา (เรียงตามคุ้มค่า)**
1. **ภาพ "ใส่ตัวคุณเข้าไปในฉาก"** (`kind: image`): รูปโพสต์ + เซลฟี่ (ไม่บังคับ) → แก้ภาพ (Gemini image ผ่าน OpenRouter ~$0.04 หรือ Muse Image บน Meta $0.01) ภาพที่ได้ใช้เป็นการ์ด OG ตอนแชร์ได้เลย ใช้ adapter เดียวกันวาดฉากใหม่ตอน remix ได้ (เช่น neon night) · เดโมใช้เซลฟี่ของคนในทีมที่ยินยอมเท่านั้น
2. ปุ่ม ✦ Vibe ในแถบ Like/Share ให้เหมือนสไลด์ (ตรงนี้คือ hero shot)
3. QR code ในหน้าต่างแชร์ ให้มือถือสแกนตอนเดโม
4. ดึงชื่อเจ้าของโพสต์มาใส่เครดิต
5. รองรับ X (twitter.com) ด้วย extension เดียวกัน
6. SAM 3.1 ตัดสันเขาจากรูปมาเป็นทางสไลด์ (ใช้ได้เฉพาะ Meta API)
7. Progress แบบ streaming, พูดสั่งด้วยเสียง

วิดีโอ v1 (อา. 1) ยังไม่มีขั้นสั่งแก้กับ remix สองขั้นนี้ทำวันจันทร์แล้วอัดเพิ่มวันอังคาร

**ไม่ทำในงานนี้:** Facebook Graph API, เกม hero แบบให้ AI เขียนโค้ดเอง (track แอปให้ AI เขียน HTML ได้ แต่เกมยังใช้ template), วิดีโอ (Meta ไม่มีโมเดลวิดีโอ ดูส่วน ★), REA, ระบบบัญชีผู้ใช้/ล็อกอิน, remix graph เต็มรูปแบบ, ฐานข้อมูลจริง, BD/legal

---

## 4. สถาปัตยกรรม

```
facebook.com ──(content script)── ชิป ✦ Vibe
      │ คลิก
      ▼
<iframe chrome-extension://…/panel.html>   ← overlay ทับหน้า FB (ไม่โดน CSP ของ FB บล็อก)
      │ fetch รูปจาก fbcdn → ย่อเหลือ 1280px → base64
      ▼
Next.js บน Vercel ─ /api/vibe  /api/experiences/*  ─→ lib/ai.ts ─→ OpenRouter | Meta API
      │                                        └→ lib/store.ts ─→ Upstash Redis (JSON) + Vercel Blob (รูป)
      ▼
/play/:id?embed=1  (Phaser)  ← panel ฝังเป็น iframe · หน้า /p/:id ฝังตัวเดียวกัน
/p/:id             (OG tags + ปุ่ม Remix)  ← ลิงก์ที่แชร์ลง FB
```

**โครงโฟลเดอร์**
```
meta-hacks/
  extension/   manifest.json  content.js  content.css  panel.html  panel.js  panel.css  config.js
  web/         Next.js (app/api/*, app/p/[id], app/play/[id], app/api/og/[id], lib/*, game/*)
  docs/
  context/     (ของเดิม)
```

---

## 5. Extension (Manifest V3, ไม่มี build step)

**manifest.json (ส่วนสำคัญ)**
- `content_scripts`: `matches: ["https://*.facebook.com/*"]` (ครอบ `web.facebook.com` ที่คนไทยเจอบ่อย), `js: ["content.js"]`, `css: ["content.css"]`
- `web_accessible_resources`: `panel.html`, `panel.js`, `panel.css`, `config.js` ให้ใช้ได้บน facebook.com
- `host_permissions`: `https://*.fbcdn.net/*` (ใช้ fetch รูป) และโดเมน server ของเรา
- `permissions`: `storage` (จำชื่อผู้สร้าง)
- ไม่ต้องใช้ `sidePanel` · มี service worker เล็ก ๆ เฉพาะทางสำรอง (ปุ่ม toolbar) ซึ่งต้องเพิ่ม `activeTab` + `scripting`

**ทางสำรอง: ปุ่ม toolbar** (ใช้ถ้าชิปบนรูปไม่เวิร์ก)
- กดไอคอน extension → inject script ที่อ่านโพสต์ซึ่งอยู่กลางจอ: ข้อความ (`innerText`) + URL รูป fbcdn ที่ใหญ่ที่สุด → เปิด panel ตัวเดียวกัน
- ดึงข้อมูลฝั่ง browser แล้วส่งเฉพาะข้อความกับรูป ไม่ส่ง HTML ดิบทั้งหน้า (หน้า FB หนักหลาย MB)

**content.js**
- ใช้ `MutationObserver` (throttle ~500ms) หา `img` ภายใต้ `[role="article"]` และ `[role="dialog"]` ที่กว้าง ≥ 300px และ `src` มาจาก fbcdn แล้วติดเครื่องหมายไว้ว่าเคยเจอแล้ว
- เติมชิป ✦ Vibe ที่มุมขวาบนของรูป
- ตอนคลิกจะเก็บ `{imageUrl, caption (innerText ของโพสต์ ตัดเหลือ 500 ตัวอักษร), postUrl (permalink ถ้าหาได้ ไม่งั้นใช้ location.href), platform: "facebook"}`
- สร้าง overlay `position:fixed` ด้านขวา กว้าง ~440px สูงเต็มจอ ใส่ `<iframe src=chrome.runtime.getURL("panel.html")#<payload>>`
- ฟัง `postMessage` จาก panel: `close` ให้ลบ overlay ทิ้ง

**panel.js** (หน้า extension จึง fetch ข้ามโดเมนได้ตาม host_permissions — content script ทำไม่ได้)
- state: `reading → suggestions → building → playing → editing → shared` (+ `error` ที่มีปุ่ม retry)
- fetch รูปจาก fbcdn → `createImageBitmap` → ย่อเหลือ 1280px JPEG → base64
- เรียก API → แสดงการ์ด → ฝัง `https://<app>/play/:id?embed=1`
- รอ `postMessage({type:"vibebook:ready"})` จากเกม แล้วขึ้น "✓ เกมโหลดแล้ว" (เป็น smoke test จริง ไม่ได้แต่งขึ้น)
- ขอชื่อผู้สร้างครั้งแรก แล้วเก็บใน `chrome.storage.local`

**หมายเหตุ:** selector ของ FB ยังไม่ได้ทดสอบ จึงต้องทำ Spike S1 ก่อน (ข้อ 9)

**ที่ทำจริงใน S1 (อา. 1 พ.ย.) — ต่างจากข้างบนตรงนี้**
- ชิปกับ overlay อยู่ใน shadow root ของ element ที่เราแปะไว้นอก React tree ของ FB จึงไม่มี `content.css` และ FB re-render แล้วชิปไม่หาย
- ชิปลอยตามตำแหน่งรูป (`position:fixed`) ไม่ได้แทรกเข้าไปใน DOM ของโพสต์ ขนาดรูปนับเฉพาะส่วนที่มองเห็น (รูปใน grid ถูก crop) ต้อง ≥ 220×160 และซ่อนชิปถ้ามีอะไรนอกโพสต์บังรูปอยู่ (เช่น dialog)
- หาโพสต์ด้วย `[role="article"]`, `[aria-posinset]`, `[role="dialog"]`, `[data-pagelet^="FeedUnit"]` และหา caption จาก `[data-ad-preview="message"]` / `[data-ad-comet-preview="message"]` ถ้าไม่เจอใช้ `innerText` ของโพสต์ · ลบพารามิเตอร์ `__cft__`/`__tn__` ออกจาก postUrl
- `web_accessible_resources` เปิดแค่ `panel.html` · `config.js` จะเพิ่มตอนต่อ `/api/vibe`
- ทดสอบกับหน้า feed จำลอง `extension/dev/mock-feed.html` ผ่านแล้ว ยังไม่ได้ทดสอบบน FB จริง (ขั้นตอนอยู่ใน `extension/README.md`)

---

## 6. Server API (Next.js route handlers)

ทุก `/api/*` ส่ง `Access-Control-Allow-Origin: *` ส่วน `/play/*` ห้ามส่ง `X-Frame-Options` หรือ `frame-ancestors` ที่บล็อกการฝัง
route ที่เรียก AI (`/api/vibe`, `edit`, `remix`) ตั้ง `maxDuration = 60` ไว้เลย (ค่า default ของ Vercel สั้นเกินสำหรับ vision call)

**กันคนนอกยิง API (ทำแบบถูกที่สุด):**
- `POST /api/experiences` ตอบ `editToken` กลับมา panel เก็บไว้ แล้ว `edit`/`publish` ต้องส่ง token นี้มาด้วย คนที่ได้ลิงก์ไปจึงแก้ของคนอื่นไม่ได้ (ทำได้แค่ remix เป็นของใหม่)
- จำกัดจำนวนครั้งต่อ IP บน `/api/vibe` กับ `remix` ด้วย `@upstash/ratelimit` (มี Redis อยู่แล้ว)

| Method | Path | รับ | ตอบ |
|---|---|---|---|
| POST | `/api/vibe` | `{image (base64, ไม่บังคับ), caption, postUrl, platform}` | `{scene:{description, mood}, suggestions:[{kind, title, pitch}×3]}` · `kind` มีให้เลือกเฉพาะที่เปิดใช้ (ดู "ขั้นชวนสร้าง" ในส่วน ★) |
| POST | `/api/experiences` | `{image, source, suggestion, creatorName}` | `{id, kind}` สร้าง spec (game) หรือ html (app) แล้วเก็บเป็น draft |
| GET | `/api/experiences/:id` | – | experience เต็ม |
| POST | `/api/experiences/:id/edit` | `{instruction}` | `{spec, changeSummary[], unsupported?}` แล้วเพิ่ม version |
| POST | `/api/experiences/:id/publish` | – | `{url: /p/:id}` |
| POST | `/api/experiences/:id/remix` | `{instruction, creatorName}` | `{id, url}` (experience ใหม่ที่มี `parentId`) |

**ข้อมูลที่เก็บ** (key `exp:{id}` ใน Upstash Redis — อ่านแล้วได้ค่าล่าสุดทันที ต่างจาก Blob ที่ cache ผ่าน CDN แล้วอาจได้ spec เก่าหลังสั่งแก้)
`{id, parentId, version, versions[], spec, imageUrl, source:{platform, postUrl, captionExcerpt}, creatorName, editTokenHash, published, createdAt, trace:[{step, model, ms, ok}]}`
รูปต้นทางเขียนลง Blob ครั้งเดียวต่อ experience และไม่เขียนทับ
`trace` ใช้โชว์ตอนเดโมว่าโมเดลไหนทำอะไร และใช้ตอบคำถามเรื่อง Meta tools

**ID** ใช้ nanoid 10 ตัว เดาไม่ได้ draft จึงไม่โผล่ไหน ส่วน `/p/:id` แสดงเฉพาะที่ publish แล้ว

**หน้า**
- `/play/:id`: Phaser เต็มจอ เล่นได้ทั้งคีย์บอร์ดและนิ้ว
- `/p/:id`: OG tags (`og:image` = `/api/og/:id` ที่ใช้ `next/og` ทำการ์ดรูปต้นทาง + ชื่อเกม + ▶) + เกม + ปุ่ม ✦ Remix + เครดิต

---

## 7. ExperienceSpec v0.2 (เกมอ่านทุกช่อง)

ทุกช่องเป็น enum หรือช่วงตัวเลขที่ template รองรับจริง → AI เลือกนอกกรอบไม่ได้ → การสั่งแก้ให้ผลแน่นอน
เขียนเป็น JSON Schema แบบ strict ของ Meta ตั้งแต่วันแรก (`additionalProperties:false`, ทุกช่องอยู่ใน `required`, ไม่มี `oneOf`) จะได้สลับ provider แล้วไม่เจอ 400
ใน schema ที่ส่งให้โมเดลใช้แค่ type + enum ไม่ใส่ `minItems`/`maxItems`/`minimum`/`maximum` (บาง provider ใน strict mode ปฏิเสธ) แล้วไปบังคับจำนวนและช่วงตัวเลขใน zod แทน (เช่น obstacles 1–3, powerups 0–3, `goal.target`)

```json
{
  "title": "Everest Rush",
  "tagline": "Outrun the sunrise down the roof of the world",
  "player": "🏂",
  "obstacles": ["🪨", "🌲", "🚩"],
  "collectible": "⭐",
  "timeOfDay": "sunset",
  "speed": "fast",
  "density": "medium",
  "powerups": ["boost"],
  "goal": { "type": "distance", "target": 2000 },
  "scoreLabel": "meters"
}
```

| ช่อง | ค่าที่ใช้ได้ |
|---|---|
| `player` | 🏂 ⛷️ 🛷 🏄 🛹 🚵 |
| `obstacles` | 1–3 ตัวจากรายการ ~20 emoji (🪨 🌲 🚩 ⛄ 🧊 🐧 🌵 🪵 🚧 🐻 …) |
| `collectible` | ⭐ 💎 🪙 ❄️ 🍀 |
| `timeOfDay` | day · sunset · night · neon (template ใส่ tint/filter ทับรูป) |
| `speed` | chill · normal · fast · insane |
| `density` | low · medium · high |
| `powerups` | 0–3 จาก boost · shield · magnet |
| `goal.type` | distance · score · survive |

การ์ดที่เป็น `game` ต้องเป็น "เกมเดียวกัน คนละธีม/กติกา" เพราะเรามี template เดียว
ถ้าเปิดไว้ ≥ 2 kind การ์ด 3 ใบต้องมีมากกว่าหนึ่ง kind (เช็กใน zod ไม่ผ่านให้ซ่อม 1 รอบ)

**ความปลอดภัย:** caption และคอมเมนต์ถือเป็นข้อมูล ไม่ใช่คำสั่ง (ห่อด้วย delimiter + system prompt บอกห้ามทำตาม) และผลลัพธ์ถูกบังคับด้วย schema enum อยู่แล้ว ข้อความที่ AI แต่งเอง (`title`/`tagline`) จำกัดความยาว และ render เป็น text เท่านั้น

---

## 8. AI: ตอนนี้ (OpenRouter) → ทีหลัง (Meta Model API)

| ขั้น | ตอนนี้ — OpenRouter | ทีหลัง — Meta API | สิ่งที่ต้องเปลี่ยน |
|---|---|---|---|
| ดูรูป + เสนอ 3 ไอเดีย + spec | `meta/muse-spark-1.3-contributor` (รับรูปได้, รองรับ structured output) $0.10/$0.20 ต่อ 1M token | `muse-spark-1.3-contributor` ($0.10/$0.20) หรือ `muse-spark-1.3` ($1.25/$4.25) | `AI_PROVIDER=meta` |
| สั่งแก้ spec | ตัวเดียวกัน (text อย่างเดียว) | ตัวเดียวกัน | `AI_PROVIDER=meta` |
| วาดฉากใหม่ (P1) | `google/gemini-3.1-flash-lite-image` ผ่าน `POST /api/v1/images` + `input_references` (~$0.04/ภาพ) | `muse-image-1.0` ผ่าน `POST /v1/images/edits` ($0.01/ภาพ) | `IMAGE_PROVIDER=meta` + adapter 2 แบบ (~30 บรรทัดต่อแบบ) |
| ตัดสันเขา (P1) | ไม่มี | `sam-3.1` ($2.50/1000 ภาพ) | Meta เท่านั้น |

- โมเดลตัวเดียวทำได้ทั้งดูรูปและเขียน spec ไม่ต้องแยกโมเดล vision
- ส่วน chat ทั้งสองเจ้าเป็นแบบ OpenAI ใช้ OpenAI SDK ตัวเดียว ส่วนภาพไม่เหมือนกัน จึงต้องมี adapter
- ใช้ `response_format: {type:"json_schema"}` + ตรวจด้วย zod + ถ้าพังให้ส่งกลับไปซ่อม 1 รอบ (Meta ยืนยันว่ารองรับ `json_schema` แต่ไม่ได้พูดถึง `json_object`)
- บน OpenRouter ต้องส่ง `provider: {require_parameters: true}` ไม่งั้นถ้า provider ปลายทางไม่รองรับ `response_format` มันจะทิ้งไปเงียบ ๆ
- ล็อก model ID แบบเต็ม ห้ามใช้ alias `~…-latest`

**ทำไมเลือก Muse contributor (31 ต.ค.):** เทียบราคาบน OpenRouter แล้ว กด Vibe 1 ครั้ง (~2.5k token เข้า, ~1.5k token ออก) ตกราว $0.00055 ถูกกว่า `deepseek/deepseek-v4.1-flash` ($0.045/$0.50, ราว $0.00086) เพราะงานเรา output เยอะ และ token ที่โมเดลใช้คิดก็นับเป็น output นอกจากนี้ยังได้จูน prompt กับโมเดลที่จะใช้ตอนเดโมจริงตั้งแต่วันแรก และไม่ต้องรอ key ของ Meta

**ข้อแม้:** โหมด contributor ให้ Meta เอา prompt และรูปไปเทรนได้ → ตอนพัฒนาและเดโมให้กด Vibe กับโพสต์ที่ทีมเป็นเจ้าของรูปเท่านั้น ถ้าต้องใช้รูปคนอื่นให้สลับไป `meta/muse-spark-1.3` ตัวเต็ม

**ทางสำรอง:** `deepseek/deepseek-v4.1-flash` เปลี่ยนแค่ `OPENROUTER_CHAT_MODEL`

**env** (ไฟล์จริงอยู่ที่ `web/.env.local` กรอกค่าไว้หมดแล้ว เหลือแค่ key · `web/.env.example` เป็นชุดเดียวกันแบบไม่มี key ไว้ commit ให้ทีม copy ไปใช้ · ตอนสร้างโปรเจกต์ด้วย `create-next-app` ให้ย้ายสองไฟล์นี้ออกจาก `web/` ก่อนแล้วค่อยย้ายกลับ เพราะมันไม่ยอมสร้างใน folder ที่มีไฟล์อยู่แล้ว)

ใส่ key ของทั้งสองเจ้าไว้พร้อมกันได้ สลับด้วย `AI_PROVIDER` ตัวเดียว โค้ดฝั่ง server อ่านค่านี้แล้วเลือก base URL, key, model ของเจ้านั้น ส่วน `IMAGE_PROVIDER` แยกไว้ เพราะ Muse Image มีแค่บน Meta ตรง จึงใช้ chat ผ่าน OpenRouter แต่ทำภาพผ่าน Meta ได้
```
AI_PROVIDER=openrouter          # openrouter | meta
IMAGE_PROVIDER=                 # ว่าง = ตาม AI_PROVIDER

OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_CHAT_MODEL=meta/muse-spark-1.3-contributor
OPENROUTER_CODE_MODEL=          # ว่าง = ใช้ CHAT_MODEL (ขั้นเขียน HTML ของ track แอป)
OPENROUTER_IMAGE_MODEL=google/gemini-3.1-flash-lite-image

META_API_KEY=
META_BASE_URL=https://api.meta.ai/v1
META_CHAT_MODEL=muse-spark-1.3-contributor
META_CODE_MODEL=                # ว่าง = ใช้ CHAT_MODEL
META_IMAGE_MODEL=muse-image-1.0
META_SEGMENT_MODEL=sam-3.1

KV_REST_API_URL=                # Upstash Redis (ต่อผ่าน Vercel Marketplace)
KV_REST_API_TOKEN=
BLOB_READ_WRITE_TOKEN=
APP_URL=http://localhost:3000   # บน Vercel ใส่ production URL
```

**ต้องเช็กตอนสลับ:** รูปแบบการส่งรูปใน chat completions ของ Meta (น่าจะเป็น `image_url` แบบ OpenAI แต่ยังไม่ยืนยัน) และชื่อ field รูปใน response ของ `/v1/images/edits`

**ค่าใช้จ่ายโดยประมาณ:** กด Vibe หนึ่งครั้งใช้ ~4k token ≈ $0.0006 บน Muse contributor ลองพันครั้งราว $0.55 (Muse ตัวเต็มราว $9.50) Vercel ใช้ free tier ได้ เครดิต Meta $150 จึงเหลือเฟือ

---

## 9. Spike ที่ต้องทำก่อน (วันนี้)

| # | เวลา | ทดสอบอะไร | ผ่านเมื่อ | ถ้าไม่ผ่าน |
|---|---|---|---|---|
| S1 | 2 ชม. | extension บน FB: ชิปขึ้นบนรูปใน feed + หน้าดูรูป, overlay เปิด, panel fetch รูป fbcdn ได้ | ทำได้กับโพสต์ทดสอบ 1 โพสต์ | **ตัดสินใจภายในคืนนี้:** ใช้ปุ่ม toolbar ที่อ่านโพสต์จากหน้า (ข้อ 5) ถ้ายังไม่ได้อีกให้ใช้หน้า `/app` เป็นทางเข้าหลัก |
| S2 | 1 ชม. | `meta/muse-spark-1.3-contributor` + รูปของทีม + json_schema → spec ที่ผ่าน zod กับรูป 3 แบบ (Everest, ทะเล, เมือง) | ผ่านทั้ง 3 และไอเดียสนุก | สลับไปใช้ `deepseek/deepseek-v4.1-flash` |
| S3 | 1 ชม. | Deploy Next.js hello world ขึ้น Vercel, `/p/test` มี OG → วางลิงก์ **production URL** ในโพสต์ FB (URL preview ของ Vercel อาจตอบ 401 ให้ crawler ของ FB) → เช็กด้วย FB Sharing Debugger → เปิดบนมือถือ **ผ่านแอป FB** (in-app browser) | การ์ดลิงก์โชว์ภาพ และหน้าเปิดได้ในแอป FB | ปรับ OG / ใช้ภาพ static |
| S4 | 2 ชม. | Phaser template อ่าน spec ที่ hardcode ไว้, เล่นด้วยนิ้วบนมือถือ (ทดสอบใน in-app browser ของ FB ด้วย: ขนาดจอ, การปัดขอบจอ), ส่ง `vibebook:ready` | เล่นได้ลื่นบนมือถือ | ลดเอฟเฟกต์ |
| S5 | 1 ชม. | Muse contributor เขียน HTML ไฟล์เดียวจากการ์ดแอป 1 ใบ (เช่น Everest planner) → ใส่ใน sandbox iframe | ขึ้นจอ ส่ง `vibebook:ready` ใช้บนมือถือได้ ภายใน ~60 วิ | ตั้ง `OPENROUTER_CODE_MODEL` เป็นตัวที่เก่งกว่า (เช่น `meta/muse-spark-1.3` ตัวเต็ม) |

**S3 ต้องเช็กเพิ่ม:** เพดาน `maxDuration` จริงของ Vercel Hobby (เปิด Fluid Compute แล้วน่าจะได้เกิน 60 วิ) พอให้ขั้นเขียน HTML ไหม ถ้าไม่พอให้ stream

---

## 10. แผนรายวัน (ปรับหลังประชุม: อัดวิดีโอ v1 พรุ่งนี้)

| เมื่อ | งาน | จบเมื่อ |
|---|---|---|
| ส. 31 คืนนี้ | ขอเครดิต Meta · `git init` + repo GitHub · S1 (ปุ่มบน FB, ถ้าไม่ได้ทำปุ่ม toolbar) → S2 → S4 → ต่อ panel → `/api/vibe` → เกม บน localhost | กด ✦ บนโพสต์ FB แล้วเล่นเกม Everest ได้บนเครื่อง |
| อา. 1 เช้า | S5 + track แอป + สร้างเคสแอปเก็บไว้ · หน้า `/app` · deploy Vercel + `/p/:id` + OG (S3) · เชิญทีมเข้า repo | ลิงก์ production เปิดบนมือถือผ่านแอป FB ได้ |
| อา. 1 บ่าย | อัดวิดีโอ v1 กับพิว (hook → ปุ่ม → การ์ด → เล่นเกม → เปิดแอป → แชร์ลิงก์) · นัดพี่ชินคุยกับพิว 5–10 นาทีเรื่อง presentation | มีวิดีโอ v1 |
| จ. 2 | สั่งแก้ (personalize) · remix + เครดิต · แก้สิ่งที่เห็นจากวิดีโอ · สลับ Meta API ถ้าได้เครดิต | flow ครบ 7 ขั้นบน production |
| อ. 3 | อัดช็อตที่เปลี่ยน (รันบน Meta API) · ตัดวิดีโอ final · P1 ถ้าเหลือเวลา | วิดีโอ final |
| พ. 4 | README/write-up · ส่ง | ส่งแล้ว |

**ที่เกิดขึ้นจริง:** ถึง จ. 2 ทำเสร็จแค่ S1 · อ. 3 เริ่มสร้างทั้งระบบในวันเดียว (server + เกม + แอป + แชร์ + remix) · ตารางด้านบนเป็นแผนเดิม

**สิ่งที่ต่างจากแผนตอนลงมือ (อ. 3)**
- **UI อยู่ที่เว็บ:** หน้าต่างใน extension เป็นแค่เปลือก มันอ่านรูป (fbcdn) แล้วฝังหน้า `/panel` ของเว็บ ส่วน flow ทั้งหมด (การ์ด → สร้าง → เล่น → สั่งแก้ → แชร์) อยู่ใน `web/components/VibeFlow.tsx` ใช้ร่วมกับหน้า `/app` แก้ UI แล้ว deploy ได้เลย ไม่ต้องโหลด extension ใหม่
- **ไม่ใช้ Vercel Blob:** รูปเก็บใน Upstash Redis (`img:{id}` ~150 KB) แล้วเสิร์ฟที่ `/api/img/:id` ตั้งค่าแค่ Redis ตัวเดียว ถ้ายังไม่ได้กดสร้าง รูปจะหมดอายุใน 1 ชม. · ตอน dev ที่ไม่มี Redis จะเก็บเป็นไฟล์ใน `web/.data/`
- **Smoke test ของแอป:** เราแทรก script ของเราเองเข้าไปใน HTML ที่ AI เขียน ไม่ต้องพึ่งให้ AI ส่ง `vibebook:ready` เอง script นี้รายงาน ready/error ให้หน้าที่ฝังอยู่ ใส่ CSP บล็อก network ทุกอย่างยกเว้นรูปจากโดเมนเรา และทำ localStorage จำลองให้ เพราะ sandbox ไม่มี storage

**กฎ:** ฟุตเทจสุดท้ายต้องรันบนโมเดล Meta (คะแนน Meta tools 25%) และส่วนที่อัดไว้ล่วงหน้าต้องบอกตรง ๆ ว่าเป็น pre-recorded

---

## 11. ความเสี่ยง & ทางสำรอง

| ความเสี่ยง | ทางสำรอง |
|---|---|
| หาโพสต์/รูปใน FB DOM ไม่เจอ | ปุ่ม toolbar อ่านโพสต์จากหน้า → หน้า `/app` (ตัดสินใจคืนนี้) |
| AI เขียน HTML พังหรือช้า | smoke test + ซ่อม 1 รอบ · เปลี่ยน `*_CODE_MODEL` · เคสเดโมสร้างเก็บไว้ล่วงหน้า |
| Muse contributor ดูรูปแย่หรือ JSON พัง | zod + ซ่อม 1 รอบ แล้วลอง `meta/muse-spark-1.3` ตัวเต็ม หรือ `deepseek/deepseek-v4.1-flash` |
| FB cache การ์ดลิงก์เก่า | Sharing Debugger กด re-scrape ก่อนอัด |
| key ของ Meta ใช้จากไทยไม่ได้ | ใช้ Muse ผ่าน OpenRouter (ยังเป็นโมเดล Meta) |
| emoji หน้าตาไม่เหมือนกันในแต่ละ OS | ยอมรับได้ (P2: sprite pack) |
| กรรมการ Meta มองว่าเป็นเครื่องมือดูดข้อมูล | อ่านเฉพาะโพสต์ที่ผู้ใช้กดเอง ไม่เก็บอะไรถ้าไม่กดสร้าง บอกว่าเป็น prototype และใช้รูปของทีม |
| เน็ต/โมเดลช้าตอนเดโมสด | วิดีโออัดล่วงหน้า + ติดป้ายตรง ๆ |

---

## 12. ยังต้องได้จากทีม

1. กติกาส่งงาน + deadline (เวลา + timezone) และ**กรรมการจะลองลิงก์/extension เองไหม หรือดูแค่วิดีโอ** (ถ้าลองเอง ต้องเปิด server ค้างไว้จนตัดสินเสร็จ และแนบ extension พร้อมวิธีติดตั้ง)
2. ใครมี `MODEL_API_KEY` ของ Meta ที่ใช้ได้แล้ว และ key ของ OpenRouter ใช้ของใคร · กติกานับคะแนน Meta tools จากอะไร (เรียกผ่าน OpenRouter นับไหม, ต้องใช้หลายโมเดลไหม) ถ้านับเฉพาะ API ตรง ให้สลับเป็น Meta เร็วขึ้นเป็นวันอาทิตย์
3. ใครถือ lane ไหน (A/B/C/D)
4. บัญชี Vercel และบัญชี FB ที่ใช้เดโม
5. พี่ชินหมายถึงแบบไหนเรื่อง "หน้าเว็บ HTML ไฟล์เดียวแบบ artifact" (ดูส่วน ★)
6. เคสแอปที่จะโชว์ (เลือก 1 จาก 3 ในส่วน ★)

## 13. ปล่อยให้คนสร้างตัดสินใจเอง

หน้าตา/CSS (ยึดสไลด์: พื้นเกือบดำ ม่วง, เรียบ), selector FB ตัวจริง, ค่าฟิสิกส์ในเกม, ถ้อยคำใน prompt, รายละเอียดของ storage adapter (dev ใช้ไฟล์ local ได้)
