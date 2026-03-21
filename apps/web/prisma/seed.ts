const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // ─── Users ──────────────────────────────────────────────────────────────────

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nau.edu' },
    update: {},
    create: {
      email: 'admin@nau.edu',
      name: 'Admin User',
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  const instructor1 = await prisma.user.upsert({
    where: { email: 'instructor1@nau.edu' },
    update: {},
    create: {
      email: 'instructor1@nau.edu',
      name: 'Dr. Smith',
      password: passwordHash,
      role: 'INSTRUCTOR',
    },
  });

  const instructor2 = await prisma.user.upsert({
    where: { email: 'instructor2@nau.edu' },
    update: {},
    create: {
      email: 'instructor2@nau.edu',
      name: 'Dr. Jones',
      password: passwordHash,
      role: 'INSTRUCTOR',
    },
  });

  const ta1 = await prisma.user.upsert({
    where: { email: 'ta1@nau.edu' },
    update: {},
    create: {
      email: 'ta1@nau.edu',
      name: 'TA One',
      password: passwordHash,
      role: 'TA',
    },
  });

  const ta2 = await prisma.user.upsert({
    where: { email: 'ta2@nau.edu' },
    update: {},
    create: {
      email: 'ta2@nau.edu',
      name: 'TA Two',
      password: passwordHash,
      role: 'TA',
    },
  });

  const ta3 = await prisma.user.upsert({
    where: { email: 'ta3@nau.edu' },
    update: {},
    create: {
      email: 'ta3@nau.edu',
      name: 'TA Three',
      password: passwordHash,
      role: 'TA',
    },
  });

  const ta4 = await prisma.user.upsert({
    where: { email: 'ta4@nau.edu' },
    update: {},
    create: {
      email: 'ta4@nau.edu',
      name: 'TA Four',
      password: passwordHash,
      role: 'TA',
    },
  });

  // ─── Courses ────────────────────────────────────────────────────────────────

  const cs249 = await prisma.course.create({
    data: {
      prefix: 'CS',
      number: '249',
      title: 'Data Structures',
      semester: 'SPRING',
      year: 2026,
    },
  });

  const cs345 = await prisma.course.create({
    data: {
      prefix: 'CS',
      number: '345',
      title: 'Databases',
      semester: 'SPRING',
      year: 2026,
    },
  });

  // ─── Course Assignments ─────────────────────────────────────────────────────

  await prisma.courseAssignment.createMany({
    data: [
      {
        userId: instructor1.id,
        courseId: cs249.id,
        role: 'INSTRUCTOR',
        maxHoursPerWeek: 0,
        hourlyRate: 0,
        totalBudget: 0,
      },
      {
        userId: instructor2.id,
        courseId: cs345.id,
        role: 'INSTRUCTOR',
        maxHoursPerWeek: 0,
        hourlyRate: 0,
        totalBudget: 0,
      },
      {
        userId: ta1.id,
        courseId: cs249.id,
        role: 'TA',
        maxHoursPerWeek: 20,
        hourlyRate: 15.0,
        totalBudget: 4800.0,
      },
      {
        userId: ta2.id,
        courseId: cs249.id,
        role: 'TA',
        maxHoursPerWeek: 20,
        hourlyRate: 15.0,
        totalBudget: 4800.0,
      },
      {
        userId: ta3.id,
        courseId: cs345.id,
        role: 'TA',
        maxHoursPerWeek: 20,
        hourlyRate: 15.0,
        totalBudget: 4800.0,
      },
      {
        userId: ta4.id,
        courseId: cs345.id,
        role: 'TA',
        maxHoursPerWeek: 20,
        hourlyRate: 15.0,
        totalBudget: 4800.0,
      },
    ],
  });

  // ─── System Settings ───────────────────────────────────────────────────────

  await prisma.systemSettings.create({
    data: {
      idleTimeoutMinutes: 15,
      screenshotIntervalMin: 5,
      maxSessionHours: 8,
      retentionDays: 2555,
    },
  });

  console.log('Seed data created successfully');
  console.log({
    users: { admin: admin.id, instructor1: instructor1.id, instructor2: instructor2.id },
    courses: { cs249: cs249.id, cs345: cs345.id },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
