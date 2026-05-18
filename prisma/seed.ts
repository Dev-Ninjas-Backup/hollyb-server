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

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!adminEmail || !adminPassword) {
    console.warn(
      '⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not set in .env file. Skipping admin seed.',
    );
    return;
  }

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log(
        `✅ Admin user already exists with email: ${adminEmail}. Skipping creation.`,
      );

      const existingSettings = await prisma.setting.findFirst();
      if (!existingSettings) {
        const setting = await prisma.setting.create({
          data: {
            workspaceName: 'Hollyb',
            Timezone: 'UTC',
            two_factor_authentication_enabled: false,
            system_alerts_enabled: true,
            email_notifications_enabled: false,
            updated_by: existingAdmin.id,
          },
        });
        console.log(`✅ System settings created for existing admin!`);
        console.log(`   Workspace: ${setting.workspaceName}`);
      } else {
        console.log(`✅ Settings already exist. Skipping creation.`);
      }

      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

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

    const setting = await prisma.setting.create({
      data: {
        workspaceName: 'Hollyb',
        Timezone: 'UTC',
        two_factor_authentication_enabled: false,
        system_alerts_enabled: true,
        email_notifications_enabled: false,
        updated_by: admin.id,
      },
    });

    console.log(`✅ System settings created successfully!`);
    console.log(`   Workspace: ${setting.workspaceName}`);
    console.log(`   Updated by: ${admin.full_name}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error creating admin user:', error.message);
    } else {
      console.error('❌ Error creating admin user:', error);
    }
    throw error;
  }
}

async function seedDemoAccounts() {
  const demoPassword = process.env.DEMO_PASSWORD?.trim() ?? '12345678';
  const hashedPassword = await bcrypt.hash(demoPassword, 10);

  // ── Demo Employer ──────────────────────────────────────────
  const employerEmail = 'demo_employer@hollyb.com';
  const existingEmployer = await prisma.user.findUnique({
    where: { email: employerEmail },
  });

  if (existingEmployer) {
    console.log(`✅ Demo employer already exists. Skipping creation.`);
  } else {
    const employer = await prisma.user.create({
      data: {
        full_name: 'Demo Employer',
        email: employerEmail,
        role: UserRole.employer,
        password_hash: hashedPassword,
        account_status: AccountStatus.active,
        is_active: true,
        is_verified: true,
        isNotify: false,
        is_deleted: false,
        is_demo: true,
      },
    });
    console.log(`✅ Demo employer created!`);
    console.log(`   Email: ${employer.email}`);
    console.log(`   ID:    ${employer.id}`);
  }

  // ── Demo Employee ──────────────────────────────────────────
  const employeeEmail = 'demo_employee@hollyb.com';
  const existingEmployee = await prisma.user.findUnique({
    where: { email: employeeEmail },
  });

  if (existingEmployee) {
    console.log(`✅ Demo employee already exists. Skipping creation.`);
  } else {
    const employee = await prisma.user.create({
      data: {
        full_name: 'Demo Employee',
        email: employeeEmail,
        role: UserRole.employee,
        password_hash: hashedPassword,
        account_status: AccountStatus.active,
        is_active: true,
        is_verified: true,
        isNotify: false,
        is_deleted: false,
        is_demo: true,
      },
    });
    console.log(`✅ Demo employee created!`);
    console.log(`   Email: ${employee.email}`);
    console.log(`   ID:    ${employee.id}`);
  }
}

async function main() {
  await seedAdmin();
  await seedDemoAccounts();
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
