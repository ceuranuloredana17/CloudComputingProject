# CSV Dashboard cu AI Agent

Aplicație web pentru analiza datelor din fișiere CSV, cu vizualizări interactive și un agent AI care răspunde la întrebări despre date.

---

## 1. Introducere

Această aplicație web permite utilizatorilor autentificați să încarce fișiere CSV și să le analizeze vizual printr-un dashboard interactiv. Pe lângă grafice și statistici automate, aplicația integrează un agent AI (powered by OpenAI) care poate răspunde în limbaj natural la întrebări despre datele încărcate.

Proiectul utilizează **două servicii cloud**:

- **MongoDB Atlas** — bază de date cloud pentru stocarea fișierelor CSV și a datelor utilizatorilor
- **OpenAI API** — model AI în cloud pentru analiza inteligentă a datelor

**Stack tehnologic:**

- Next.js 16 (App Router)
- Clerk — autentificare utilizatori
- MongoDB Atlas — stocare date în cloud
- OpenAI (gpt-4o-mini) API — agent AI în cloud
- Recharts — vizualizări grafice
- Tailwind CSS — stilizare

---

## 2. Descriere problemă

Analiza manuală a fișierelor CSV este consumatoare de timp și necesită cunoștințe tehnice (Excel, Python etc.). Utilizatorii fără experiență tehnică nu pot extrage rapid informații utile din date brute.

**Soluția propusă:** o aplicație web accesibilă care:

1. Permite încărcarea oricărui fișier CSV
2. Generează automat statistici și grafice (bare, linie, pie chart)
3. Oferă un agent AI cu care utilizatorul poate conversa în limbaj natural pentru a obține răspunsuri despre date (ex: _„Care este media coloanei Salary?"_, _„Câte rânduri are dataset-ul?"_)

Astfel, analiza datelor devine accesibilă oricui, fără a necesita cunoștințe de programare sau statistică.

---

## 3. Descriere API

Aplicația expune 3 endpoint-uri REST proprii și consumă 2 API-uri externe în cloud.

### 3.1 API-uri proprii (Next.js Route Handlers)

| Endpoint    | Metodă | Descriere                                                        |
| ----------- | ------ | ---------------------------------------------------------------- |
| `/api/csv`  | `GET`  | Returnează cel mai recent CSV al utilizatorului autentificat     |
| `/api/csv`  | `POST` | Salvează un fișier CSV nou în MongoDB Atlas                      |
| `/api/chat` | `POST` | Trimite o întrebare la agentul AI OpenAI și returnează răspunsul |

### 3.2 API-uri externe utilizate

#### MongoDB Atlas

- Driver oficial Node.js (`mongodb`)
- Conexiune securizată TLS/SSL la un cluster Atlas în cloud
- Autentificare prin connection string cu credențiale

#### OpenAI API

- **SDK oficial:** `openai`
- **Model:** `gpt-4o-mini`
- **Autentificare:** API Key prin variabila de mediu `OPENAI_KEY`

---

## 4. Flux de date

### 4.1 Flux — Încărcare CSV

```
Browser (parseCSV client-side)
    ↓
POST /api/csv  ← { fileName, headers, rows }
    ↓
Verificare autentificare Clerk (userId)
    ↓
MongoDB Atlas → salvare document { userId, fileName, headers, rows, uploadedAt }
    ↓
Răspuns JSON → Browser afișează Dashboard cu grafice
```

### 4.2 Flux — Chat cu agentul AI

```
Browser → POST /api/chat ← { question, history }
    ↓
Verificare autentificare Clerk (userId)
    ↓
MongoDB Atlas → fetch CSV al utilizatorului
    ↓
Construire context AI (statistici numerice + primele 300 rânduri CSV)
    ↓
POST OpenAI API ← { model, messages: [system_prompt, history, question] }
    ↓
Răspuns AI → POST /api/chat → { answer }
    ↓
Browser afișează răspunsul în interfața de chat
```

---

### 4.3 Exemple Request / Response

#### `GET /api/csv` — Obține CSV-ul curent al utilizatorului

**Request:**
```http
GET /api/csv HTTP/1.1
Host: localhost:3000
Cookie: __session=<clerk_session_token>
```

**Response 200 OK:**
```json
{
  "_id": "664a1f2e3c8b4a001f2e3c8b",
  "userId": "user_2abc123",
  "fileName": "employees.csv",
  "headers": ["Education", "JoiningYear", "City", "PaymentTier", "Age", "Gender"],
  "rows": [
    { "Education": "Bachelors", "JoiningYear": "2017", "City": "Bangalore", "PaymentTier": "3", "Age": "34", "Gender": "Male" }
  ],
  "uploadedAt": "2024-05-10T10:23:00.000Z"
}
```

**Response 404** (niciun CSV încărcat):
```json
{ "error": "No CSV found" }
```

---

#### `POST /api/csv` — Salvează un CSV nou

**Request:**
```http
POST /api/csv HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Cookie: __session=<clerk_session_token>

{
  "fileName": "employees.csv",
  "headers": ["Education", "JoiningYear", "City", "PaymentTier", "Age", "Gender"],
  "rows": [
    { "Education": "Bachelors", "JoiningYear": "2017", "City": "Bangalore", "PaymentTier": "3", "Age": "34", "Gender": "Male" }
  ]
}
```

**Response 200 OK:**
```json
{
  "_id": "664a1f2e3c8b4a001f2e3c8b",
  "userId": "user_2abc123",
  "fileName": "employees.csv",
  "headers": ["Education", "JoiningYear", "City", "PaymentTier", "Age", "Gender"],
  "rows": [...],
  "uploadedAt": "2024-05-10T10:23:00.000Z"
}
```

---

#### `POST /api/chat` — Întrebare către agentul AI

**Request:**
```http
POST /api/chat HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Cookie: __session=<clerk_session_token>

{
  "question": "What percentage of employees with a Masters degree are Female?",
  "history": [
    { "role": "user", "content": "How many rows are in this dataset?" },
    { "role": "assistant", "content": "The dataset contains 4653 rows." }
  ]
}
```

**Response 200 OK:**
```json
{
  "answer": "Out of all employees with a Masters degree, approximately 38.5% are Female."
}
```

**Response 401** (utilizator neautentificat):
```json
{ "error": "Unauthorized" }
```

**Response 404** (niciun CSV încărcat):
```json
{ "error": "No CSV data found. Please upload a file first." }
```

---

### 4.4 Autentificare și autorizare servicii utilizate

#### Clerk — autentificare utilizatori

- Utilizatorii se înregistrează și autentifică prin **Clerk**, serviciu cloud de identity management
- Sesiunea este gestionată prin cookie-uri securizate (`__session`)
- La fiecare request către `/api/csv` și `/api/chat`, serverul verifică sesiunea:

```js
const { userId } = await auth();
if (!userId)
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

- Fiecare utilizator vede **doar propriile date** — filtrare în MongoDB după `userId`
- Rutele publice (sign-in, sign-up) sunt excluse din protecție prin `middleware.ts`

#### OpenAI API — autentificare serviciu cloud

- Autentificare prin **API Key** stocat în variabila de mediu `OPENAI_KEY`
- Cheia este transmisă prin SDK-ul oficial `openai` la inițializarea clientului
- Cheia **nu este expusă niciodată** în client — folosită exclusiv pe server (Next.js Route Handler)

#### MongoDB Atlas — autentificare serviciu cloud

- Conexiune prin **connection string** cu username și parolă (`NEXT_ATLAS_URI`)
- Comunicare criptată TLS/SSL
- Atlas permite conexiuni doar de la IP-uri autorizate (Network Access whitelist)
- Credențialele sunt stocate în variabile de mediu, **nu în cod sursă**

---

## Rulare locală

```bash
# 1. Instalare dependențe
npm install

# 2. Creare fișier .env cu variabilele necesare
NEXT_ATLAS_URI=<mongodb_connection_string>
NEXT_ATLAS_DATABASE=CloudComputing
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk_publishable_key>
CLERK_SECRET_KEY=<clerk_secret_key>
OPENAI_KEY=<openai_api_key>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# 3. Pornire server de dezvoltare
npm run dev
```

Aplicația rulează la `http://localhost:3000`.
