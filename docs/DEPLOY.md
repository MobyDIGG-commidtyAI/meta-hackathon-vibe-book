# Deploy VibeBook ด้วย Docker Compose

คู่มือนี้พาขึ้น VibeBook ครบทุกฟีเจอร์ด้วยคำสั่งไม่กี่บรรทัด มีสองแบบ:
- **บนเครื่องตัวเอง:** ใช้ลองหรือเดโม่
- **บน server ที่มีโดเมนและ HTTPS:** ให้คนอื่นใช้จริงและแชร์ลิงก์ลง Facebook ได้

## ในกล่องมีอะไร

`compose.yaml` ที่ root ของ repo มี 4 service:

| Service | หน้าที่ |
|---|---|
| `web` | แอป Next.js (build จาก `web/Dockerfile`): หน้า create flow, `/app`, `/panel` ของ extension, ลิงก์แชร์ `/p/:id`, ตัวเล่นเกม/แอป และ API ที่คุยกับโมเดล |
| `redis` | เก็บงานที่สร้าง (experience) รูปของโพสต์ และตัวนับ rate limit ข้อมูลอยู่ใน volume `redis-data` |
| `redis-http` | แปลง Redis ให้พูด REST API แบบ Upstash ได้ โค้ดเดิมที่ใช้ Upstash เลยใช้กับ Redis ในเครื่องได้โดยไม่ต้องแก้ |
| `caddy` | เปิดเฉพาะ profile `https`: reverse proxy ที่ขอและต่ออายุใบรับรอง Let's Encrypt ให้อัตโนมัติ |

```
Chrome + extension ──► https://โดเมน ──► caddy ──► web ──► redis-http ──► redis
คนเปิดลิงก์แชร์ ─────┘                              └──► OpenRouter / Meta API
```

ฟีเจอร์ที่ใช้ได้ครบใน Docker:
- อ่านรูปและแคปชันแล้วเสนอ 3 ไอเดีย ปรับตาม Learning level ได้
- สร้างเกม 4 แนว และแอป
- สั่งแก้ด้วยประโยคเดียว
- แชร์ลิงก์ `/p/:id` พร้อมการ์ดพรีวิว และ remix พร้อมเครดิต
- extension บน facebook.com
- rate limit 30 ครั้งต่อ IP ต่อ 10 นาทีบน route ที่เรียกโมเดล

## สิ่งที่ต้องมี

- **Docker Engine กับ Docker Compose v2:** เช็กด้วย `docker compose version` บน Mac/Windows ใช้ Docker Desktop
- **AI key อย่างน้อยหนึ่งเจ้า:**
  - [OpenRouter](https://openrouter.ai/keys) (ค่าเริ่มต้น ใช้ `meta/muse-spark-1.3`)
  - หรือ Meta Model API (ตั้ง `AI_PROVIDER=meta`)
- **ถ้าจะขึ้น server จริง:**
  - VPS Linux สเปก 1 vCPU / 1–2 GB RAM ก็พอ เพราะงานหนักอยู่ที่โมเดลภายนอก
  - โดเมนหนึ่งชื่อ
  - เปิดพอร์ต 80 และ 443

## แบบที่ 1: บนเครื่องตัวเอง (ประมาณ 5 นาที)

```bash
git clone https://github.com/MobyDIGG-commidtyAI/meta-hackathon-vibe-book.git vibebook
cd vibebook
cp .env.example .env
```

เปิด `.env` แล้วใส่ `OPENROUTER_API_KEY=` จากนั้นสั่ง:

```bash
docker compose up -d --build
```

build ครั้งแรกใช้เวลาราว 2 นาที เสร็จแล้วเปิด http://localhost:3000

ใช้ extension กับเครื่องนี้:

```bash
extension/package.sh http://localhost:3000
```

จากนั้นที่ `chrome://extensions`:
1. เปิด **Developer mode**
2. กด **Load unpacked** แล้วเลือกโฟลเดอร์ `dist/vibebook-extension`
3. เปิด facebook.com แล้วจะเห็นปุ่ม ✦ Vibe บนรูปโพสต์

## แบบที่ 2: server จริงพร้อม HTTPS

1. **ชี้โดเมนมาที่ server:** ตั้ง A record (และ AAAA ถ้ามี IPv6) ของ `vibebook.example.com` ให้ชี้ IP ของ server แล้วเปิด firewall พอร์ต 80 กับ 443
2. **ติดตั้ง Docker บน server:** ตาม https://docs.docker.com/engine/install/
3. **โคลนแล้วตั้งค่า:**
   ```bash
   git clone https://github.com/MobyDIGG-commidtyAI/meta-hackathon-vibe-book.git vibebook
   cd vibebook
   cp .env.example .env
   openssl rand -hex 24      # เอาค่านี้ไปใส่ REDIS_HTTP_TOKEN
   ```
   แก้ `.env` อย่างน้อย 4 ค่านี้:
   ```
   OPENROUTER_API_KEY=sk-or-...
   DOMAIN=vibebook.example.com
   APP_URL=https://vibebook.example.com
   REDIS_HTTP_TOKEN=<ค่าที่สุ่มได้>
   ```
4. **เปิดระบบ:**
   ```bash
   docker compose --profile https up -d --build
   ```
   Caddy ขอใบรับรองให้เองภายในราวหนึ่งนาที ดูความคืบหน้าได้ด้วย `docker compose logs -f caddy` จากนั้นเปิด `https://vibebook.example.com`
5. **ทำ extension ให้ชี้ server นี้:**
   ```bash
   extension/package.sh https://vibebook.example.com
   ```
   ได้ทั้งโฟลเดอร์ `dist/vibebook-extension` (ใช้ Load unpacked) และไฟล์ `dist/vibebook-extension.zip` (ส่งให้คนอื่น แตก zip แล้ว Load unpacked) ถ้าเครื่องไม่มีคำสั่ง `zip` จะได้แค่โฟลเดอร์ รันสคริปต์นี้บนเครื่องไหนก็ได้ที่มี repo ไม่จำเป็นต้องเป็น server

### ทำไมต้อง HTTPS

- **พาเนลของ extension:** พาเนลเปิดอยู่ใน facebook.com ซึ่งเป็น https Chrome จึงบล็อกเว็บ `http://` ที่ฝังอยู่ข้างใน ยกเว้น `localhost` ถ้าใช้ http กับ server จริง พาเนลจะค้างที่ "Can't reach VibeBook"
- **การ์ดพรีวิวลิงก์:** Facebook ดึงการ์ดจาก `APP_URL` ที่เข้าถึงได้จากอินเทอร์เน็ตเท่านั้น
- **ปุ่ม Copy link:** ใช้คลิปบอร์ดได้เฉพาะบนหน้า https หรือ localhost

### ไม่มีโดเมน

ใช้บริการ tunnel ที่ให้ URL แบบ https ได้ เช่น Cloudflare Tunnel โดยชี้ไปที่ `http://localhost:3000`:
1. ตั้ง `APP_URL` เป็น URL ที่ได้มา
2. สั่ง `docker compose up -d` อีกครั้ง
3. ทำ extension ด้วย URL นั้น

วิธีนี้ยังไม่ได้ทดสอบใน repo นี้

## เช็กว่าใช้ได้ทุกฟีเจอร์

เช็กแบบรวดเร็วด้วยมือ:
1. เปิดหน้าแรกแล้วไปที่ `/app`
2. อัปรูปแล้วกด Find ideas ต้องได้ 3 ไอเดีย
3. เลือกเกม แล้วสั่ง `make it night and faster`
4. Share แล้วเปิดลิงก์ `/p/…` ในอีกแท็บ
5. กด Remix

เช็กอัตโนมัติด้วยเทสที่เรียกโมเดลจริง ต้องมี Node 20+ และ Google Chrome บนเครื่องที่รันเทส:

```bash
cd web
npm ci
VIBEBOOK_LIVE=1 VIBEBOOK_BASE_URL=https://vibebook.example.com npx playwright test live
```

เทสนี้ครอบคลุม:
- อ่านรูป สร้างเกม สั่งแก้ และแชร์
- หน้าลิงก์ เล่นเกมได้ รูป และการ์ดพรีวิว
- remix
- สร้างแอป

ใช้ AI ราว 6–7 call และใช้เวลา 2–3 นาที ส่วน `npm test` ที่ไม่ใส่ `VIBEBOOK_LIVE` จะ mock โมเดลทั้งหมด จึงรันได้ฟรี

## ค่าใน `.env`

| ค่า | ใช้ทำอะไร |
|---|---|
| `AI_PROVIDER` | `openrouter` (ค่าเริ่มต้น) หรือ `meta` |
| `OPENROUTER_API_KEY`, `OPENROUTER_CHAT_MODEL`, `OPENROUTER_CODE_MODEL` | key และรุ่นโมเดลของ OpenRouter `CODE_MODEL` ใช้ตอนเขียน HTML ของแอป ถ้าว่างจะใช้ `CHAT_MODEL` |
| `META_API_KEY`, `META_CHAT_MODEL`, `META_CODE_MODEL` | ใช้เมื่อ `AI_PROVIDER=meta` |
| `APP_URL` | URL ที่คนอื่นเปิดได้ ใช้ทำลิงก์แชร์และการ์ดพรีวิว ห้ามมี `/` ปิดท้าย |
| `DOMAIN` | โดเมนสำหรับ profile `https` ถ้าเว้นว่างจะเป็น `localhost` และใช้ใบรับรองจาก CA ในเครื่องของ Caddy (เบราว์เซอร์จะเตือน) |
| `WEB_PORT`, `WEB_BIND` | พอร์ตของ `web` บนเครื่อง host ค่าเริ่มต้น `127.0.0.1:3000` คือเปิดให้เฉพาะเครื่องนี้ |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | ปล่อยว่างเพื่อใช้ Redis ที่มากับ compose หรือใส่ของ [Upstash](https://upstash.com) เพื่อเก็บข้อมูลบนคลาวด์ |
| `REDIS_HTTP_TOKEN` | รหัสระหว่าง `web` กับ `redis-http` ไม่ได้เปิดออกนอก Docker แต่ควรตั้งเป็นค่าสุ่มบน server จริง |

แก้ `.env` แล้วต้องสั่ง `docker compose up -d` อีกรอบ ถ้าใช้ HTTPS ให้ใส่ `--profile https` ด้วย ไม่ต้อง build ใหม่

## ดูแลระบบ

```bash
docker compose ps                                  # สถานะ (web มี healthcheck)
docker compose logs -f web                         # log ของแอป ดู error จากโมเดลได้ที่นี่
git pull && docker compose --profile https up -d --build   # อัปเดตเป็นเวอร์ชันล่าสุด
docker compose --profile https down                # หยุด (ข้อมูลยังอยู่ใน volume)
```

สำรองข้อมูล (งานที่สร้างและรูปทั้งหมดอยู่ใน Redis):

```bash
docker compose exec redis redis-cli save
docker run --rm -v vibebook_redis-data:/data -v "$PWD":/backup alpine tar czf /backup/redis-backup.tgz -C /data .
```

> `docker compose down -v` จะลบ volume ทิ้ง งานที่สร้างและลิงก์แชร์ทั้งหมดจะหายถาวร

## Rate limit และความปลอดภัย

- **Rate limit:** route ที่เรียกโมเดล (`/api/vibe`, สร้าง, สั่งแก้, remix) จำกัดไว้ 30 ครั้งต่อ IP ต่อ 10 นาที เกินแล้วจะได้ 429 "Too many requests"
- **IP ที่ใช้นับ:** เมื่อมี Caddy อยู่ข้างหน้า Caddy จะเขียน `X-Forwarded-For` ใหม่เป็น IP จริง จึงปลอมไม่ได้ แต่ถ้าเปิดพอร์ต `web` ตรง ๆ ออกอินเทอร์เน็ต คนอื่นจะปลอม header นี้ได้ บน server จริงจึงควรใช้ profile `https` และคง `WEB_BIND=127.0.0.1` ไว้
- **ไฟล์ `.env`:** มี API key อยู่ จึงอยู่ใน `.gitignore` และไม่ถูก copy เข้า image (`web/.dockerignore`) key จะถูกอ่านตอน container รันเท่านั้น
- **แอปที่โมเดลเขียน:** รันใน iframe sandbox ที่ปิดการเรียก network ทุกอย่าง

## แก้ปัญหาที่เจอบ่อย

| อาการ | สาเหตุและวิธีแก้ |
|---|---|
| พาเนลขึ้น "Can't reach VibeBook at …" | URL ใน extension ไม่ตรงกับ server หรือ server ไม่ได้รัน ให้รัน `extension/package.sh <URL ที่ถูก>` ใหม่ แล้วกด ↻ ที่การ์ด extension ใน `chrome://extensions` |
| พาเนลว่างหรือค้างบน server ที่เป็น http | Chrome บล็อก http ใน facebook.com ต้องใช้ HTTPS (ดูแบบที่ 2) |
| Caddy ขอใบรับรองไม่ได้ | DNS ยังไม่ชี้มาที่ server หรือพอร์ต 80/443 ถูกปิดหรือมีโปรแกรมอื่นใช้อยู่ ดูรายละเอียดด้วย `docker compose logs caddy` |
| ได้ error 502 ตอนอ่านโพสต์หรือสร้าง | โมเดลตอบไม่ได้ เช่น key ผิด เครดิตหมด หรือชื่อรุ่นผิด ดู `docker compose logs web` |
| ลิงก์แชร์หรือการ์ดพรีวิวชี้ไป `localhost` | ยังไม่ได้ตั้ง `APP_URL` เป็น URL จริง แก้แล้วสั่ง `docker compose up -d` |
| `port is already allocated` | เปลี่ยน `WEB_PORT` ใน `.env` หรือปิดโปรแกรมที่ใช้พอร์ต 80/443 อยู่ |

## ทางเลือกอื่น: Vercel

ขึ้นบน Vercel ได้เหมือนเดิม:
1. import repo แล้วตั้ง Root Directory เป็น `web`
2. ต่อ Upstash Redis จากหน้า Storage ของ Vercel ระบบจะใส่ `KV_REST_API_URL` กับ `KV_REST_API_TOKEN` ให้เอง
3. ใส่ค่า AI กับ `APP_URL` ใน Environment Variables

`compose.yaml` และ Dockerfile ไม่เกี่ยวกับการ deploy บน Vercel
