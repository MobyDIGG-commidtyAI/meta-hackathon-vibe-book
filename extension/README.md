# VibeBook extension

Chrome MV3, plain JS, no build step.

## ชี้ไปที่ server
`config.js` บอกว่าเว็บ VibeBook อยู่ที่ไหน ค่าเริ่มต้นคือ `http://localhost:3000` (`npm run dev` ใน `web/`) ก่อนอัดวิดีโอหรือส่งให้คนอื่น ให้เปลี่ยนเป็น production URL แล้วกด ↻ ที่การ์ด extension

## ติดตั้ง
1. เปิด `chrome://extensions` → เปิด **Developer mode** (มุมขวาบน)
2. **Load unpacked** → เลือกโฟลเดอร์ `extension/` นี้
3. แก้โค้ดแล้วกด ↻ ที่การ์ด VibeBook จากนั้น refresh แท็บ FB

## ทดสอบครบ flow บน FB จริง
ต้องรันเว็บก่อน: `npm run dev --prefix web` (ต้องมี `OPENROUTER_API_KEY` ใน `web/.env.local`)

| ขั้น | ทำอะไร | ผ่านเมื่อ |
|---|---|---|
| 1. ชิป | เลื่อน feed หาโพสต์ที่มีรูป | ชิป ✦ Vibe ขึ้นมุมขวาบนของรูปโพสต์ ไม่ขึ้นบนรูปโปรไฟล์/สตอรี่ |
| 2. การ์ด | กดชิป | พาเนลเลื่อนออกทางขวา ภายใน ~15 วิ ได้การ์ด 3 ใบ (มีทั้ง GAME และ APP) ที่พูดถึงโพสต์นั้นจริง |
| 3. สร้างเกม | กดการ์ด GAME | ~15–20 วิ เกมโหลด ใช้ฉากหลังเป็นรูปโพสต์ "Tap to start" แล้วบังคับด้วย ←/→ หรือ A/D หรือแตะ/ลาก |
| 4. สั่งแก้ | พิมพ์ในช่องใต้เกม เช่น `make it night and faster` → Change | ~15 วิ เกมโหลดใหม่ตามที่สั่ง มีชิปสรุปสิ่งที่เปลี่ยน |
| 5. แชร์ | ใส่ชื่อ → Share | ขึ้น "Your link is ready" พร้อมลิงก์ `/p/…` และปุ่ม Copy link / Open |
| 6. เปิดลิงก์ | กด Open | เล่นได้ทันที ขึ้นเครดิต "Made by …" และกล่อง "Remix it your way" |
| 7. Remix | ใส่ไอเดีย + ชื่ออีกคน → Create my remix | ได้ลิงก์ใหม่ เครดิตขึ้น "remixed from … by …" |
| 8. แอป | กด "← Other ideas" → เลือกการ์ด APP | ~60 วิ แอปโหลด มีรูปโพสต์ กดปุ่มในแอปแล้วตอบสนองจริง |
| ✕ หรือ Esc | | พาเนลปิด |
| ทางสำรอง | เลื่อนให้โพสต์อยู่กลางจอ → กดไอคอน VibeBook บน toolbar | พาเนลเปิดกับโพสต์นั้น |

ถ้าพาเนลค้างที่ "Opening VibeBook…" แล้วขึ้น "Can't reach VibeBook" แปลว่าเว็บไม่ได้รันอยู่ ให้รัน `npm run dev --prefix web` ใหม่
ถ้าไม่ผ่านข้ออื่น ให้เปิด DevTools ดู Console: ฝั่งชิปดูบนแท็บ FB ฝั่งพาเนลให้คลิกขวาในพาเนล → Inspect แล้วจดว่าขั้นไหนพัง
"Behind the scenes" ใต้พาเนลบอกว่าแต่ละขั้นใช้โมเดลไหน กี่วินาที

## ทดสอบโดยไม่ต้องเข้า FB
`dev/mock-feed.html` เป็นหน้า feed จำลอง (มีโพสต์รูปเดี่ยว โพสต์ข้อความล้วน โพสต์ 2 รูป และ dialog ที่บังรูป)

```bash
python3 -m http.server 8766 --directory extension
```
แล้วเปิด http://localhost:8766/dev/mock-feed.html (content.js รันเป็น script ธรรมดา และนับทุกรูปเป็นรูปจาก fbcdn)
