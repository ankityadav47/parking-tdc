const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCDS2() {
  const facility = await prisma.facility.findFirst({ 
    where: { name: 'CDS2' },
    select: { id: true, name: true, totalCapacity: true }
  });
  if (!facility) return console.log('CDS2 not found');

  console.log('Facility:', facility);

  const reservations = await prisma.reservation.findMany({
    where: { facilityId: facility.id },
    select: { id: true, status: true, startAt: true, endAt: true },
    orderBy: { startAt: 'asc' }
  });

  console.log('\nAll reservations for CDS2:');
  reservations.forEach(r => {
    const start = r.startAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    const end = r.endAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    console.log(`  ${r.id.slice(0,8)} | ${r.status} | ${start} → ${end}`);
  });

  // Now simulate: user searches 3:00 PM (IST) = 09:30 UTC
  const searchStart = new Date('2026-06-15T09:30:00Z'); // 3:00 PM IST
  const searchEnd = new Date('2026-06-15T12:30:00Z');   // 6:00 PM IST

  console.log(`\nSimulating search: ${searchStart.toLocaleString('en-IN', {timeZone:'Asia/Kolkata', hour12:false})} → ${searchEnd.toLocaleString('en-IN', {timeZone:'Asia/Kolkata', hour12:false})}`);

  const active = reservations.filter(r =>
    r.status !== 'cancelled' && r.status !== 'expired' &&
    r.startAt < searchEnd && r.endAt > searchStart
  );

  console.log('\nBookings overlapping this search window:');
  active.forEach(r => {
    const start = r.startAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    const end = r.endAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    console.log(`  ${r.id.slice(0,8)} | ${r.status} | ${start} → ${end}`);
  });

  // Compute max concurrent
  const events = [];
  for (const r of active) {
    const s = Math.max(r.startAt.getTime(), searchStart.getTime());
    const e = Math.min(r.endAt.getTime(), searchEnd.getTime());
    if (s < e) {
      events.push({ time: s, type: 1, label: '+1 at ' + new Date(s).toLocaleString('en-IN', {timeZone:'Asia/Kolkata', hour12:false}) });
      events.push({ time: e, type: -1, label: '-1 at ' + new Date(e).toLocaleString('en-IN', {timeZone:'Asia/Kolkata', hour12:false}) });
    }
  }
  events.sort((a, b) => a.time - b.time);
  let current = 0, maxConcurrent = 0;
  for (const ev of events) {
    current += ev.type;
    if (current > maxConcurrent) maxConcurrent = current;
    console.log(`  ${ev.label} → concurrent: ${current}`);
  }

  console.log(`\nMax concurrent during search window: ${maxConcurrent}`);
  console.log(`Total capacity: ${facility.totalCapacity}`);
  console.log(`Spots left: ${facility.totalCapacity - maxConcurrent}`);
  console.log(`\n→ CDS2 will ${facility.totalCapacity - maxConcurrent > 0 ? 'SHOW' : 'NOT SHOW'} in search results`);
}

debugCDS2().catch(console.error).finally(() => prisma.$disconnect());
