import { PrismaClient, UserRole, UserStatus, RoomType, TableStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Default Panel
  const panel = await prisma.panel.upsert({
    where: { slug: 'demo-panel' },
    update: {},
    create: {
      name: 'Demo Panel',
      slug: 'demo-panel',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      nullPercent: 5,
      brokerCommission: 2,
    },
  });
  console.log('✅ Created Panel:', panel.name);

  // 2. Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@admin.com' },
    update: {},
    create: {
      email: 'super@admin.com',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      displayName: 'Super Admin',
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Created Super Admin:', superAdmin.email);

  // 3. Create Panel Admin
  const panelAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash,
      role: UserRole.PANEL_ADMIN,
      panelId: panel.id,
      displayName: 'Demo Admin',
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Created Panel Admin:', panelAdmin.email);

  // 4. Create Players with Wallets
  const players = [];
  for (let i = 1; i <= 4; i++) {
    const email = `player${i}@demo.com`;
    const player = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        role: UserRole.PLAYER,
        panelId: panel.id,
        displayName: `Player ${i}`,
        status: UserStatus.ACTIVE,
        wallet: {
          create: {
            balance: 10000, // ₹10,000 initial balance
            currency: 'INR',
          },
        },
      },
    });
    players.push(player);
    console.log(`✅ Created Player ${i}:`, player.email);
  }

  // 5. Create a Game Table
  const table = await prisma.table.create({
    data: {
      panelId: panel.id,
      name: 'High Rollers Club',
      roomType: RoomType.CLASSIC_CHAAL,
      status: TableStatus.WAITING,
      minBet: 100,
      maxBet: 10000,
      nullPercent: 5,
      maxPlayers: 6,
    },
  });
  console.log('✅ Created Table:', table.name);

  console.log('🏁 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
