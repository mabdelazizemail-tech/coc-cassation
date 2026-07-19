import { PrismaClient, Role, JudicialGrade } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pw = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  const hash = await bcrypt.hash(pw, 10);

  console.log("Seeding courts...");
  const courtNames = [
    "الدائرة الجنائية الأولى",
    "الدائرة الجنائية الثانية",
    "الدائرة المدنية الأولى",
    "الدائرة المدنية الثانية",
    "الدائرة التجارية",
    "دائرة الأحوال الشخصية",
    "الدائرة العمالية",
  ];
  const courts = [];
  for (const name of courtNames) {
    courts.push(
      await prisma.court.create({
        data: { name, type: "circuit", governorate: "القاهرة" },
      })
    );
  }

  console.log("Seeding judges...");
  const firstNames = ["أحمد", "محمد", "محمود", "مصطفى", "خالد", "عمرو", "طارق", "هشام", "سامي", "وليد", "ياسر", "عادل"];
  const lastNames = ["عبد الله", "السيد", "إبراهيم", "حسن", "علي", "منصور", "الشناوي", "عبد الرحمن", "زكي", "فؤاد", "الجندي", "شعبان"];
  const grades: JudicialGrade[] = [
    JudicialGrade.COUNSELOR,
    JudicialGrade.COUNSELOR,
    JudicialGrade.VICE_PRESIDENT,
    JudicialGrade.ASSISTANT_COUNSELOR,
    JudicialGrade.JUDGE,
  ];

  const judges = [];
  for (let i = 0; i < 40; i++) {
    const name = `${firstNames[i % firstNames.length]} ${lastNames[(i + 3) % lastNames.length]} ${lastNames[(i + 6) % lastNames.length]}`;
    const grade = grades[i % grades.length];
    const appointmentYear = 1990 + (i % 25);
    const judge = await prisma.judge.create({
      data: {
        fileNumber: `NC-${1000 + i}`,
        nationalId: `2${String(600000000000 + i * 137).padStart(13, "0")}`.slice(0, 14),
        fullNameAr: name,
        fullNameEn: `Judge ${i + 1}`,
        birthDate: new Date(1960 + (i % 20), i % 12, (i % 27) + 1),
        maritalStatus: i % 3 === 0 ? "أعزب" : "متزوج",
        childrenCount: i % 4,
        grade,
        appointmentDate: new Date(appointmentYear, 8, 1),
        currentCourtId: courts[i % courts.length].id,
        qualifications: {
          create: [
            { degree: "ليسانس الحقوق", institution: "جامعة القاهرة", faculty: "كلية الحقوق", year: appointmentYear - 3, grade: "جيد جداً" },
            ...(i % 3 === 0 ? [{ degree: "دكتوراه في القانون", institution: "جامعة عين شمس", year: appointmentYear + 6, subject: "القانون الجنائي" }] : []),
          ],
        },
        languages: {
          create: [
            { language: "العربية", level: "fluent" },
            { language: "الإنجليزية", level: i % 2 === 0 ? "advanced" : "intermediate" },
            ...(i % 4 === 0 ? [{ language: "الفرنسية", level: "intermediate" }] : []),
          ],
        },
        inspectionReports: {
          create: [
            { reportNumber: `INS-${2023}-${i}`, judicialYear: "2023/2024", rating: i % 5 === 0 ? "good" : i % 3 === 0 ? "very_good" : "excellent", inspectorName: "إدارة التفتيش القضائي" },
          ],
        },
        careerHistory: {
          create: [
            { position: "قاضٍ", grade: JudicialGrade.JUDGE, startDate: new Date(appointmentYear, 8, 1), order: 1 },
            { position: "مستشار مساعد", grade: JudicialGrade.ASSISTANT_COUNSELOR, startDate: new Date(appointmentYear + 8, 8, 1), order: 2 },
          ],
        },
        contacts: {
          create: [
            { type: "mobile", value: `010${String(10000000 + i * 173).slice(0, 8)}`, isPrimary: true },
            { type: "email", value: `judge${i + 1}@coc.gov.eg` },
          ],
        },
        ...(i % 6 === 0
          ? { medicalExcuses: { create: [{ type: "إجازة مرضية", days: 30, isVerified: true, diagnosis: "بيانات مقيّدة", startDate: new Date(2025, 1, 1), endDate: new Date(2025, 2, 1) }] } }
          : {}),
        ...(i % 9 === 0
          ? { sanctions: { create: [{ type: "warning", reason: "تأخر في إنجاز الأحكام", status: "expired", issuedAt: new Date(2022, 4, 1) }] } }
          : {}),
      },
    });
    judges.push(judge);
  }

  console.log("Seeding users...");
  const users: { username: string; fullName: string; role: Role; judgeIdx?: number }[] = [
    { username: "admin", fullName: "مسؤول النظام", role: Role.SYSTEM_ADMIN },
    { username: "secretary", fullName: "المستشار / الأمين العام", role: Role.SECRETARY_GENERAL },
    { username: "deputy", fullName: "المستشار / الأمين العام المساعد", role: Role.DEPUTY_SECRETARY },
    { username: "dataofficer", fullName: "موظف إدارة البيانات", role: Role.DATA_OFFICER },
    { username: "courtofficer", fullName: "مسؤول المحكمة", role: Role.COURT_OFFICER },
    { username: "viewer", fullName: "مستخدم عرض", role: Role.VIEWER },
  ];
  // 7 council members mapped to the 7 most senior judges.
  for (let m = 0; m < 7; m++) {
    users.push({ username: `member${m + 1}`, fullName: `عضو المجلس ${m + 1}`, role: Role.COUNCIL_MEMBER, judgeIdx: m });
  }
  // A sample judge login.
  users.push({ username: "judge1", fullName: judges[10].fullNameAr, role: Role.JUDGE, judgeIdx: 10 });

  for (const u of users) {
    await prisma.user.create({
      data: {
        username: u.username,
        fullName: u.fullName,
        email: `${u.username}@coc.gov.eg`,
        role: u.role,
        passwordHash: hash,
        twoFactorEnabled: u.role === Role.SECRETARY_GENERAL || u.role === Role.SYSTEM_ADMIN,
        judgeId: u.judgeIdx !== undefined ? judges[u.judgeIdx].id : undefined,
      },
    });
  }

  console.log("Seeding council documents & workflow...");
  const secretary = await prisma.user.findUniqueOrThrow({ where: { username: "secretary" } });
  const member1 = await prisma.user.findUniqueOrThrow({ where: { username: "member1" } });

  const doc = await prisma.councilDocument.create({
    data: {
      reference: "DOC-2026-001",
      title: "طلب ندب السيد المستشار إلى وزارة العدل",
      summary: "عرض طلب ندب أحد المستشارين للعمل بديوان عام وزارة العدل لمدة عام.",
      type: "ندب",
      status: "UNDER_STUDY",
      judgeId: judges[2].id,
      assignedToId: member1.id,
      dueDate: new Date(Date.now() + 7 * 864e5),
      history: {
        create: [
          { toStatus: "RECEIVED", actorId: secretary.id, note: "استلام المستند" },
          { fromStatus: "RECEIVED", toStatus: "DISTRIBUTED", actorId: secretary.id, note: "إسناد للعضو الأول" },
          { fromStatus: "DISTRIBUTED", toStatus: "UNDER_STUDY", actorId: member1.id },
        ],
      },
    },
  });

  await prisma.councilDocument.create({
    data: {
      reference: "DOC-2026-002",
      title: "مذكرة بشأن ترقية عدد من القضاة",
      summary: "دراسة ترقية مجموعة من القضاة إلى درجة مستشار.",
      type: "ترقية",
      status: "RECEIVED",
      judgeId: judges[4].id,
    },
  });

  console.log("Seeding movement cycle...");
  const cycle = await prisma.movementCycle.create({
    data: {
      judicialYear: "2026/2027",
      status: "wishes_open",
      wishesOpenAt: new Date(),
      wishesCloseAt: new Date(Date.now() + 14 * 864e5),
      maxWishes: 5,
      rules: {
        create: [
          { key: "seniority", weight: 40, description: "الأقدمية (سنوات الخبرة)" },
          { key: "health", weight: 25, description: "الحالة الصحية (أعذار طبية موثقة)" },
          { key: "wish", weight: 25, description: "رغبة القاضي" },
          { key: "council_rule", weight: 10, description: "قواعد مجلس القضاء" },
          { key: "court_need", weight: 0, isHardConstraint: true, description: "احتياج المحكمة (قيد صارم)" },
        ],
      },
      needs: {
        create: courts.flatMap((c) => [
          { courtId: c.id, grade: JudicialGrade.COUNSELOR, required: 2, approved: true },
          { courtId: c.id, grade: JudicialGrade.JUDGE, required: 3, approved: true },
        ]),
      },
    },
  });

  // Sample wishes for the first 15 judges.
  for (let i = 0; i < 15; i++) {
    const prefs = [0, 1, 2, 3, 4].map((k) => courts[(i + k) % courts.length].id);
    for (let r = 0; r < prefs.length; r++) {
      await prisma.movementWish.create({
        data: { cycleId: cycle.id, judgeId: judges[i].id, courtId: prefs[r], rank: r + 1 },
      });
    }
  }

  console.log("Seeding general assembly...");
  const assembly = await prisma.assemblyCycle.create({
    data: {
      judicialYear: "2026/2027",
      opensAt: new Date(),
      closesAt: new Date(Date.now() + 30 * 864e5),
      candidates: {
        create: judges.slice(0, 25).map((j) => ({ judgeId: j.id })),
      },
    },
  });

  console.log("Done.");
  console.log(`\nLogin with any of: admin / secretary / deputy / member1..member7 / judge1 / dataofficer / courtofficer / viewer`);
  console.log(`Password for all: ${pw}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
