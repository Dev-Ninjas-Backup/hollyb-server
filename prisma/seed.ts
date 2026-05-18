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
  try {
    const demoPassword = process.env.DEMO_PASSWORD?.trim() ?? '12345678';
    const hashedPassword = await bcrypt.hash(demoPassword, 10);

    console.log('🔄 Starting demo accounts seed...');

    // ── Demo Employer ──────────────────────────────────────────
    try {
      const employerEmail = 'demo_employer@hollyb.com';
      const existingEmployer = await prisma.user.findUnique({
        where: { email: employerEmail },
      });

      if (existingEmployer) {
        console.log(`✅ Demo employer already exists. Skipping creation.`);
        console.log(`   Email: ${existingEmployer.email}`);
        console.log(`   ID:    ${existingEmployer.id}`);
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
        console.log(`✅ Demo employer created successfully!`);
        console.log(`   Email: ${employer.email}`);
        console.log(`   ID:    ${employer.id}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Error creating demo employer:', error.message);
      } else {
        console.error('❌ Error creating demo employer:', error);
      }
      throw error;
    }

    // ── Demo Employee ──────────────────────────────────────────
    try {
      const employeeEmail = 'demo_employee@hollyb.com';
      const existingEmployee = await prisma.user.findUnique({
        where: { email: employeeEmail },
      });

      if (existingEmployee) {
        console.log(`✅ Demo employee already exists. Skipping creation.`);
        console.log(`   Email: ${existingEmployee.email}`);
        console.log(`   ID:    ${existingEmployee.id}`);
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
        console.log(`✅ Demo employee created successfully!`);
        console.log(`   Email: ${employee.email}`);
        console.log(`   ID:    ${employee.id}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Error creating demo employee:', error.message);
      } else {
        console.error('❌ Error creating demo employee:', error);
      }
      throw error;
    }

    console.log('✅ Demo accounts seed completed!');
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error in seedDemoAccounts:', error.message);
    } else {
      console.error('❌ Error in seedDemoAccounts:', error);
    }
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting database seed...');
  console.log(`📌 Database URL: ${connectionString?.substring(0, 50)}...`);
  console.log(`📌 Node Environment: ${process.env.NODE_ENV || 'not set'}`);

  try {
    await seedAdmin();
  } catch (error) {
    console.error('❌ Admin seed failed. Stopping.');
    throw error;
  }

  try {
    await seedDemoAccounts();
  } catch (error) {
    console.error('❌ Demo accounts seed failed. Stopping.');
    throw error;
  }
}

main()
  .then(async () => {
    console.log('\n✅ Seed completed successfully!');
    console.log('📋 Summary:');
    console.log('   - Admin user (for platform management)');
    console.log('   - Demo employer (for testing employer features)');
    console.log('   - Demo employee (for testing employee features)');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('\n❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
