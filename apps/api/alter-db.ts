import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding lat and lng columns to facilities...');
  try {
    await prisma.$executeRaw`ALTER TABLE facilities ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 7);`;
    await prisma.$executeRaw`ALTER TABLE facilities ADD COLUMN IF NOT EXISTS lng DECIMAL(10, 7);`;
    console.log('Columns added successfully.');

    console.log('Backfilling coordinates from PostGIS location...');
    const result = await prisma.$executeRaw`
      UPDATE facilities 
      SET lat = ST_Y(location::geometry), 
          lng = ST_X(location::geometry)
      WHERE location IS NOT NULL AND lat IS NULL;
    `;
    console.log(`Backfilled successfully.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
