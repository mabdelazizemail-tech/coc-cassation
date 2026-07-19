# نظام الأمانة العامة لمجلس القضاء الأعلى بمحكمة النقض
### Court of Cassation — Integrated System for the General Secretariat

نموذج أولي (prototype) قابل للتشغيل يجسّد متطلبات وثيقة الأعمال (BID v1.0) للوحدات الأربع.
A runnable prototype implementing the four modules of the Business Information Document.

Built with **Next.js 14 (App Router) · TypeScript · PostgreSQL · Prisma · Tailwind CSS (RTL)**.

---

## المتطلبات المسبقة | Prerequisites

- Node.js 18.18+ (20+ recommended)
- PostgreSQL 14+ running locally or reachable via a connection string

## التشغيل | Getting started

```bash
# 1. Environment
cp .env.example .env          # then edit DATABASE_URL and AUTH_SECRET

# 2. Install dependencies
npm install

# 3. Create the database schema
npm run db:push               # or: npm run db:migrate

# 4. Seed demo data (judges, users, workflow, movement cycle, assembly)
npm run db:seed

# 5. Run
npm run dev                   # http://localhost:3000
```

> **ملاحظة OneDrive:** هذا المجلد متزامن مع OneDrive. يُنصح باستبعاد مجلد `node_modules`
> من مزامنة OneDrive (أو نقل المشروع خارج OneDrive) لتفادي بطء التثبيت وتعارض الملفات.
> `node_modules` مُستبعد بالفعل في `.gitignore`.

## حسابات الدخول التجريبية | Demo logins

كلمة المرور الموحدة | Shared password: **`Admin@12345`**

| المستخدم | الدور |
| --- | --- |
| `admin` | مسؤول النظام |
| `secretary` | الأمين العام (كامل الصلاحيات) |
| `deputy` | الأمين العام المساعد |
| `member1` … `member7` | أعضاء المجلس السبعة |
| `dataofficer` | موظف إدارة البيانات |
| `courtofficer` | مسؤول المحكمة |
| `judge1` | قاضٍ (اطلاع محدود على ملفه) |
| `viewer` | عرض فقط |

---

## الوحدات | Modules

| # | الوحدة | المسار | أبرز الوظائف المنفّذة |
| --- | --- | --- | --- |
| 1 | السجل الرقمي للقضاة | `/judges` | قائمة وبحث، ملف القاضي عبر 12 فئة، مستندات، إخفاء التشخيص الطبي، إضافة قاضٍ |
| 2 | رول المجلس | `/council` | دورة حياة المستند بـ 7 مراحل، الإسناد، التوصية، المراجعة، التصويت، نموذج التنفيذ |
| 3 | الحركة القضائية | `/movement` | إدخال الرغبات، محرك التوزيع التلقائي القائم على القواعد، التعديل اليدوي المثبّت، الاعتماد |
| 4 | الجمعية العامة | `/assembly` | قائمة المرشحين، توليد السيرة الذاتية تلقائياً من السجل |
| — | التقارير | `/reports` | لوحات إحصائية حسب الدرجة/الحالة/المحكمة |
| — | إدارة المستخدمين | `/users` | إنشاء المستخدمين، الأدوار، تفعيل/إيقاف |
| — | سجل التدقيق | `/audit` | تتبّع كل الإجراءات (Audit Log) |

## النشر على Vercel | Deploying to Vercel

1. Push this folder to a GitHub repo, then **Import** it at vercel.com/new.
2. Create a hosted Postgres DB (Vercel Postgres / Neon — free tier works). Use the **pooled** connection string.
3. In Vercel → Project → Settings → Environment Variables set:
   - `DATABASE_URL` — the pooled Postgres URL
   - `AUTH_SECRET` — a long random string (32+ chars)
4. Deploy. (`postinstall` runs `prisma generate` automatically.)
5. Create tables + demo data once, from your machine against the remote DB:
   ```powershell
   $env:DATABASE_URL="<the-DIRECT-unpooled-url>"; npm run db:push; npm run db:seed
   ```

## نظام التصميم | Design system

The UI follows the `judicium-flow-shield` reference design: **Tajawal** typeface, navy
primary `#24304E`, gold accent `#C7A24B`, dark sidebar `#16203A`, and semantic
success/warning/info/destructive tokens (hex approximations of the reference OKLCH
values — see `tailwind.config.ts`). Shared primitives live in `src/components/ui.tsx`
(PageHeader with breadcrumbs, StatCard with icon/trend, ProgressBar, StatusBadge,
InfoBanner, Avatar) and `src/components/Icon.tsx` (inline SVG icon set). RTL is
preserved throughout; layouts are responsive for desktop/tablet (BID §10.4).

## البنية | Architecture

```
prisma/schema.prisma     32 models across the 4 modules + RBAC + audit + notifications
prisma/seed.ts           demo data (40 judges, 7 council members, workflow, cycle, assembly)
src/lib/
  auth.ts                JWT session (jose) + bcrypt, 8h expiry
  rbac.ts                role → permission matrix + Arabic labels
  allocation.ts          rule-based weighted allocation engine (Module 3)
  audit.ts               central audit-log writer
  prisma.ts, constants.ts
src/app/(app)/...        authenticated app shell + module pages (server components + server actions)
src/app/login/...        login flow
src/components/...        Sidebar, TopBar, UI primitives, judge category viewer
```

Access control is enforced two ways: the `rbac` permission matrix gates UI/actions,
and Prisma `where` scoping restricts data (a judge sees only their file; a council
member sees only assigned files + temporarily-granted files, auto-revoked on execution).

---

## افتراضات مبنية على أسئلة الاستيضاح | Assumptions from the Clarification Questions

قرارات اتُّخذت بإعدادات افتراضية قابلة للتهيئة ريثما تَرِد ردود الجهة المستفيدة (`COC_Clarification Questions.docx`):

- **M1-1** تعارض المسميات: اعتُمد **الأمين العام (`SECRETARY_GENERAL`)** صاحبَ الصلاحية الكاملة.
- **M1-2 / M2-5** الفئات الـ12 وعدد الأعضاء (7): عوملت كقيم قابلة للتهيئة (بيانات لا تصميم صلب).
- **M1-4** التشخيص الطبي: حقل مقيّد يظهر فقط لأصحاب الصلاحية الكاملة، ويُخفى لغيرهم.
- **M2-4** سرية التصويت: تُعرض النتيجة الإجمالية للجميع، وتفصيل الأصوات لأصحاب صلاحية التدقيق فقط.
- **M3-1 / M3-2** قواعد الحركة: نُفّذت كنموذج أوزان شفّاف (أقدمية/صحة/رغبة/قاعدة مجلس) مع احتياج المحكمة كقيد صارم.
- **M2-1 (OCR) · M2-2 (التوقيع الإلكتروني) · INT-1/2/3 (التكاملات) · 2FA:** خارج نطاق النموذج الأولي، ومهيّأة كنقاط امتداد.

## خارج نطاق النموذج الأولي | Not yet implemented (roadmap)

رفع الملفات الفعلي وفحص الفيروسات · الاجتماع المرئي · التكامل مع موفّر الهوية (SSO/OAuth) والسجل
الوطني للقضاة · منشئ التقارير المخصصة والتصدير PDF/Excel والجدولة عبر البريد · الإشعارات الفورية · 2FA.

---

*سري — وزارة العدل المصرية | Confidential — Egyptian Ministry of Justice*
