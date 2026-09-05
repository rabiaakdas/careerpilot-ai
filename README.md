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
Cors__AllowedOrigins__0=<frontend-origin>
```

Production ortaminda `Jwt__Key` bos veya kisa olmamalidir. CORS originleri acik liste olarak verilmelidir; wildcard origin kullanilmaz. Development icin secret degerleri User Secrets ile saklanabilir.

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
