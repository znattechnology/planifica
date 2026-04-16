/**
 * Script to create an admin user directly in the database.
 *
 * Usage: npx tsx scripts/create-admin.ts
 */
import 'dotenv/config';
import { prisma } from '@/src/infrastructure/database/prisma/client';
import bcrypt from 'bcryptjs';

const ADMIN_EMAIL = 'admin@planifica.ao';
const ADMIN_PASSWORD = 'Admin@2026';
const ADMIN_NAME = 'Administrador';

async function main() {
  // Check if already exists
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`✓ Admin already exists: ${ADMIN_EMAIL} (id: ${existing.id}, role: ${existing.role})`);
    // Ensure it's ADMIN role
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
      console.log('  → Updated role to ADMIN');
    }
    await prisma.$disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: true,
      onboardingCompleted: true,
      school: 'Ministério da Educação',
    },
  });

  console.log('✓ Admin user created successfully');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  ID:       ${admin.id}`);
  console.log(`  Role:     ADMIN`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error creating admin:', err);
  process.exit(1);
});
