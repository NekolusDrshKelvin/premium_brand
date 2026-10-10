import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const products = [
  {
    slug: "everyday-tote",
    name: "The Everyday Tote",
    category: "Bags",
    description: "A considered everyday carryall in full-grain leather.",
    price: "285.00",
    imageUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85",
    inventory: 24,
    featured: true,
  },
  {
    slug: "studio-crossbody",
    name: "Studio Crossbody",
    category: "Bags",
    description: "A compact companion with a clean, purposeful silhouette.",
    price: "195.00",
    imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85",
    inventory: 18,
    featured: true,
  },
  {
    slug: "the-weekender",
    name: "The Weekender",
    category: "Travel",
    description: "A spacious heritage-inspired travel bag.",
    price: "420.00",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",
    inventory: 9,
    featured: false,
  },
  {
    slug: "card-holder-no-02",
    name: "Card Holder No. 02",
    category: "Small goods",
    description: "A slim card holder made for everyday essentials.",
    price: "68.00",
    imageUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=85",
    inventory: 40,
    featured: false,
  },
];

async function main() {
  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
  }
  console.log(`Seeded ${products.length} products`);

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      update: {
        name: process.env.ADMIN_NAME?.trim() || "Store Administrator",
        passwordHash,
        role: UserRole.ADMIN,
      },
      create: {
        name: process.env.ADMIN_NAME?.trim() || "Store Administrator",
        email,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    console.log(`Admin account provisioned for ${email}. Keep the password private.`);
  } else {
    console.log("Admin account not provisioned. Set ADMIN_EMAIL and ADMIN_PASSWORD in apps/api/.env, then run npm run db:seed.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
