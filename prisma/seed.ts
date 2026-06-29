import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const club = await prisma.club.upsert({
    where: { slug: "demo-padel-luanda" },
    update: {},
    create: {
      name: "Padel Clube Luanda (Demo)",
      slug: "demo-padel-luanda",
      city: "Luanda",
      brandColor: "#da6259",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@padelzone.ao" },
    update: {},
    create: { name: "Admin Demo", email: "admin@padelzone.ao", password, role: "ADMIN" },
  });

  await prisma.clubUser.upsert({
    where: { clubId_userId: { clubId: club.id, userId: admin.id } },
    update: {},
    create: { clubId: club.id, userId: admin.id, role: "CLUB_OWNER" },
  });

  if ((await prisma.player.count()) === 0) {
    const nomes = [
      ["Ana Domingos", "FEMALE"],
      ["Bruno Silva", "MALE"],
      ["Carla Neto", "FEMALE"],
      ["David Lopes", "MALE"],
      ["Edu Mendes", "MALE"],
      ["Filipa Costa", "FEMALE"],
      ["Gabriel Sousa", "MALE"],
      ["Helena Dias", "FEMALE"],
    ] as const;
    await prisma.player.createMany({
      data: nomes.map(([name, gender]) => ({ name, gender, clubId: club.id })),
    });
  }

  const comp = await prisma.competition.upsert({
    where: { clubId_slug: { clubId: club.id, slug: "torneio-abertura" } },
    update: {},
    create: {
      clubId: club.id,
      name: "Torneio de Abertura (Demo)",
      slug: "torneio-abertura",
      status: "OPEN",
    },
  });

  const cat = await prisma.category.findFirst({
    where: { competitionId: comp.id, name: "Masculino A" },
  });
  if (!cat) {
    await prisma.category.create({
      data: {
        competitionId: comp.id,
        name: "Masculino A",
        gender: "MALE",
        unit: "PAIR",
        price: 15000,
      },
    });
  }

  if ((await prisma.court.count({ where: { clubId: club.id } })) === 0) {
    await prisma.court.createMany({
      data: [
        { name: "Campo 1", clubId: club.id },
        { name: "Campo 2", clubId: club.id },
      ],
    });
  }

  console.log(
    "Seed concluído: clube, admin (admin@padelzone.ao / password123), 8 jogadores, 1 competição + categoria, 2 campos."
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
