const { PrismaClient } = require('./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client');

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log("Attempting to connect to Supabase...");
    await prisma.$connect();
    console.log("✅ Successfully connected to Supabase!");
    
    // Just count how many tables/models are available by checking a generic query, 
    // or just let Prisma confirm the connection.
    console.log("The connection is active and working.");
  } catch (error) {
    console.error("❌ Failed to connect to Supabase:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
