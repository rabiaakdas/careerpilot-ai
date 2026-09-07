# CareerPilot AI

CareerPilot AI, kariyer planlama ve iş başvurusu süreçlerini desteklemek için geliştirilecek bir full-stack SaaS projesidir.

Bu aşamada proje yalnızca temel frontend ve backend kurulumunu içerir. PostgreSQL, authentication, AI entegrasyonu, Docker, test ve deployment adımları sonraki görevlerde eklenecektir.

## Teknolojiler

- Frontend: React, TypeScript, Vite
- Backend: C#, ASP.NET Core Web API
- Database: PostgreSQL (sonraki aşamada eklenecek)
- ORM: Entity Framework Core (sonraki aşamada eklenecek)

## Proje Yapısı

```text
careerpilot-ai/
├── frontend/
├── backend/
├── docs/
├── .gitignore
└── README.md
```

## Development Configuration

PostgreSQL connection string gibi secret bilgiler repository'ye yazilmaz. Development ortaminda connection string'i User Secrets ile saglayabilirsin:

```powershell
cd backend
dotnet user-secrets set "ConnectionStrings:CareerPilotDb" "Host=<host>;Port=<port>;Database=<database>;Username=<username>;Password=<password>"
```

AI job analysis icin OpenAI API key de User Secrets ile verilmelidir:

```powershell
cd backend
dotnet user-secrets set "AI:ApiKey" "<openai-api-key>"
```

## Production Configuration / Security

Gercek secret ve credential degerleri source code'a yazilmaz. Production ortaminda gerekli configuration environment variable olarak verilmelidir:

```text
ConnectionStrings__CareerPilotDb=<postgres-connection-string>
Jwt__Key=<strong-secret>
Jwt__Issuer=<issuer>
Jwt__Audience=<audience>
AI__ApiKey=<openai-api-key>
AI__Model=<openai-model>
AI__BaseUrl=<openai-responses-api-url>
AI__TimeoutSeconds=<timeout-seconds>
Cors__AllowedOrigins__0=<frontend-origin>
```

Production ortaminda `Jwt__Key` bos veya kisa olmamalidir. `AI__TimeoutSeconds` icin makul aralik 10-300 saniyedir; Interview Prep gibi uzun structured output ureten AI istekleri icin 120 saniye onerilir. CORS originleri acik liste olarak verilmelidir; wildcard origin kullanilmaz. Development icin secret degerleri User Secrets ile saklanabilir.

## Resume Text Extraction

Backend, yuklenen PDF ve DOCX CV dosyalarindan metin cikarabilir.
Giris yapmis kullanici kendi CV metnini su endpoint ile okuyabilir:

```http
GET /api/resumes/me/text
```

## AI Resume Job Match

Backend, yuklenen CV metni ile kullaniciya ait bir is ilanini AI ile karsilastirabilir.

```http
POST /api/jobs/{id}/match
```

## AI Skill Gap Analysis

Backend, yuklenen CV ile kullaniciya ait bir is ilanini karsilastirarak oncelikli beceri aciklarini analiz edebilir.

```http
POST /api/jobs/{id}/skill-gap
```

## AI Learning Roadmap

Backend, yuklenen CV ve kullaniciya ait is ilanina gore sirali ve kisisellestirilmis ogrenme yol haritasi olusturabilir.

```http
POST /api/jobs/{id}/learning-roadmap
```

## AI Interview Preparation

Backend, yuklenen CV ve kullaniciya ait is ilanina gore kisisellestirilmis mulakat hazirligi olusturabilir.

```http
POST /api/jobs/{id}/interview-prep
```

Yanitta teknik sorular, davranissal sorular, CV bazli sorular, cevap rehberligi ve isverene sorulabilecek sorular bulunur.

## Application Kanban

Giris yapmis kullanici, basvurularini Kanban kolonlarina gore listeleyebilir ve basvuru durumunu guncelleyebilir.

```http
GET /api/applications/kanban
PATCH /api/applications/{id}/status
```

Kanban kolonlari:

- Applied
- Interview
- Offer
- Rejected
- Withdrawn

## Dashboard

Giris yapmis kullanici, kariyer ve basvuru durumunu tek endpoint uzerinden ozetleyebilir.

```http
GET /api/dashboard
```

Dashboard ozeti:

- Total jobs
- Total applications
- Application status distribution
- Application rate
- Recent applications

## Docker / Deployment

Docker deployment dort servisle calisir:

- `postgres`: PostgreSQL 18 veritabani
- `migrations`: EF Core migration'larini uygulayan one-shot .NET SDK container'i
- `backend`: ASP.NET Core Web API
- `frontend`: nginx uzerinden Vite build ciktilari ve `/api` reverse proxy

Prerequisites:

- Docker Desktop

Setup:

1. `.env.example` dosyasini `.env` olarak kopyala.
2. Placeholder degerleri gercek deployment secret'lariyla doldur. `.env` dosyasini Git'e commit etme.
3. `docker compose --env-file .env build`
4. `docker compose --env-file .env up -d`

Fresh start sirasinda Compose once PostgreSQL'i hazir hale getirir, sonra `migrations` servisi mevcut EF Core migration'larini uygular. Migration container'i basariyla tamamlaninca exit `0` ile kapanir; backend yalnizca bu adim basarili olduktan sonra baslar. Host makineden PostgreSQL'e manuel baglanmak gerekmez.

Uygulama varsayilan olarak su adresten acilir:

```text
http://localhost:8080
```

Frontend production build'de `VITE_API_BASE_URL` bos birakilir. Browser `/api/...` isteklerini frontend nginx'e gonderir; nginx bu istekleri Compose network icindeki `backend:8080` adresine proxy eder. Browser tarafinda `backend` container DNS adina dogrudan istek yapilmaz.

`/health` istegi de nginx tarafindan backend'in `/health` endpoint'ine proxy edilir. Backend kullanilamaz durumdaysa frontend container healthcheck'i de basarili gorunmez.

AI endpoint'leri uzun surebilir. `/api` nginx proxy timeout degerleri Interview Prep gibi istekler icin 180 saniye olacak sekilde ayarlanmistir. Backend AI HTTP timeout'u `AI__TimeoutSeconds` ile verilebilir.

Logs:

```powershell
docker compose --env-file .env logs -f
```

Stop:

```powershell
docker compose --env-file .env down
```

Stop + delete volumes:

```powershell
docker compose --env-file .env down -v
```

`docker compose down -v`, PostgreSQL verisini ve yuklenen CV dosyalarini tutan persistent volume'leri siler. Gercek kullanici verisi olan ortamlarda dikkatli kullan.

### Docker Migrations

Runtime backend image'ina SDK veya `dotnet-ef` eklenmez. Migration'lar ayri `migrations` servisi tarafindan, .NET SDK image'i ve sabit `dotnet-ef` surumu ile calistirilir:

```text
dotnet ef database update --project backend.csproj --no-build
```

`migrations` servisi `postgres` healthy olduktan sonra baslar. Migration basarisiz olursa backend baslamaz. Bu yaklasim tek-instance Compose deployment icin basit ve kontrolludur; coklu instance production ortamlarda migration adimi CI/CD pipeline tarafindan tekil bir deployment adimi olarak yurutulmelidir.

### Docker Persistence

Compose `postgres_data` named volume'u ile veritabani datasi container restart/recreate sonrasi korunur. PostgreSQL 18 image yapisiyla uyumlu olmasi icin bu volume container icinde `/var/lib/postgresql` yoluna baglanir; image major-version-specific data subdirectory'lerini bu alanin altinda yonetir. Yuklenen CV dosyalari `resume_uploads` named volume'u ile backend icindeki `/app/uploads/resumes` yoluna baglanir.

Docker Compose lokal PostgreSQL portu `5432` ile cakismamak icin PostgreSQL servisini host'a publish etmez. Backend Compose network icinde `postgres:5432` adresini kullanir.

Lokal development akisi degismez:

```powershell
cd backend
dotnet run

cd frontend
npm run dev
```
