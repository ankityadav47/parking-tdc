import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create admin user
  const adminPasswordHash = await argon2.hash('Admin123!');
  void (await prisma.user.upsert({
    where: { email: 'admin@parkspot.app' },
    update: {},
    create: {
      email: 'admin@parkspot.app',
      passwordHash: adminPasswordHash,
      fullName: 'System Admin',
      role: 'admin',
      status: 'active',
      emailVerifiedAt: new Date(),
    },
  }));
  console.log('✅ Admin user created');

  // 2. Create operator
  const opPasswordHash = await argon2.hash('Operator123!');
  const operator = await prisma.user.upsert({
    where: { email: 'operator@example.com' },
    update: {},
    create: {
      email: 'operator@example.com',
      passwordHash: opPasswordHash,
      fullName: 'City Parking Co',
      role: 'operator',
      status: 'active',
      emailVerifiedAt: new Date(),
      operatorProfile: {
        create: {
          companyName: 'City Parking Co',
          payoutStatus: 'enabled',
          verifiedAt: new Date(),
        },
      },
    },
    include: { operatorProfile: true },
  });
  console.log('✅ Operator user created');

  // 3. Create driver
  const driverPasswordHash = await argon2.hash('Driver123!');
  void (await prisma.user.upsert({
    where: { email: 'dana@example.com' },
    update: {},
    create: {
      email: 'dana@example.com',
      passwordHash: driverPasswordHash,
      fullName: 'Dana Driver',
      role: 'driver',
      status: 'active',
      emailVerifiedAt: new Date(),
      vehicles: {
        create: {
          licensePlate: 'ABC-1234',
          state: 'NY',
          make: 'Toyota',
          model: 'Prius',
          isDefault: true,
        },
      },
    },
  }));
  console.log('✅ Driver user created');

  // 4. Create a facility
  if (operator.operatorProfile) {
    const existingFacility = await prisma.facility.findFirst({
      where: { operatorId: operator.operatorProfile.id, name: 'Downtown Main Garage' },
    });

    if (!existingFacility) {
      const facility = await prisma.facility.create({
        data: {
          operatorId: operator.operatorProfile.id,
          name: 'Downtown Main Garage',
          description: 'Secure, covered parking in the heart of downtown.',
          type: 'garage',
          addressLine1: '100 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          timezone: 'America/New_York',
          totalCapacity: 50,
          status: 'active',
          amenities: {
            create: { covered: true, evCharging: true, adaAccessible: true, gated: true },
          },
          rateRules: {
            create: [
              { rateType: 'hourly', priceCents: 500, priority: 1 },
              { rateType: 'daily', priceCents: 3500, priority: 2, minMinutes: 300 },
            ],
          },
        },
      });

      // Create PostGIS extension and update schema
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis`);
      
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "facilities" ADD COLUMN "location" geography(Point, 4326)`);
        await prisma.$executeRawUnsafe(`CREATE INDEX "idx_facilities_location" ON "facilities" USING GIST ("location")`);
      } catch (e) {
        // Ignore if already exists
      }

      // Update location using raw SQL for PostGIS
      await prisma.$executeRaw`
        UPDATE facilities
        SET location = ST_SetSRID(ST_MakePoint(-74.0060, 40.7128), 4326)::geography
        WHERE id = ${facility.id}
      `;
      console.log('✅ Facility created with rate rules and location');
    }
  }

  console.log('🎉 Seeding finished');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
