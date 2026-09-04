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
dotnet user-secrets set "ConnectionStrings:CareerPilotDb" "Host=localhost;Port=5432;Database=careerpilot_ai;Username=your_username;Password=your_password"
```

AI job analysis icin OpenAI API key de User Secrets ile verilmelidir:

```powershell
cd backend
dotnet user-secrets set "AI:ApiKey" "your_openai_api_key"
```

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
