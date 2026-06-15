const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const facilities = await prisma.facility.findMany({
    where: { name: 'CDS2' },
    select: { id: true, name: true, totalCapacity: true }
  });
  console.log('Facilities:', facilities);
  
  for (const f of facilities) {
    const reservations = await prisma.reservation.findMany({
      where: { facilityId: f.id }
    });
    console.log(`Reservations for ${f.name}:`, reservations.map(r => ({
      id: r.id, status: r.status, start: r.startAt, end: r.endAt
    })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
