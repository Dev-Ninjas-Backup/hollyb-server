import 'dotenv/config';
import { PrismaClient, UserRole, AccountStatus } from './generated/client';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment variables.');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!adminEmail || !adminPassword) {
    console.warn(
      '⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not set in .env file. Skipping admin seed.',
    );
    return;
  }

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log(
        `✅ Admin user already exists with email: ${adminEmail}. Skipping creation.`,
      );
      return;
    }

    // Hash the admin password using bcryptjs
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        full_name: 'Admin User',
        email: adminEmail,
        role: UserRole.admin,
        password_hash: hashedPassword,
        account_status: AccountStatus.active,
        is_active: true,
        is_verified: true,
        isNotify: true,
        is_deleted: false,
      },
    });

    console.log(`✅ Admin user created successfully!`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Status: ${admin.account_status}`);
    console.log(`   ID: ${admin.id}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error creating admin user:', error.message);
    } else {
      console.error('❌ Error creating admin user:', error);
    }
  }
}

main()
  .then(async () => {
    console.log('✅ Seed completed successfully!');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
