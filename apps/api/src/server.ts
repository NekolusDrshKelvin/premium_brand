import "dotenv/config";
import express from "express";
import cors from "cors";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json({ limit: "1mb" }));

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(254),
  customerPhone: z.string().trim().max(40).optional(),
  shippingAddress: z.string().trim().min(8).max(600),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(30),
});

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", service: "premium-brand-api", database: "connected" });
  } catch {
    res.status(503).json({ status: "unavailable", service: "premium-brand-api", database: "disconnected" });
  }
});

app.get("/api/products", async (req, res, next) => {
  try {
    const category = String(req.query.category ?? "").trim();
    const search = String(req.query.search ?? "").trim();
    const featuredOnly = String(req.query.featured ?? "") === "true";
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(48, Math.max(1, Number.parseInt(String(req.query.limit ?? "12"), 10) || 12));
    const where: Prisma.ProductWhereInput = {
      active: true,
      ...(category ? { category: { equals: category, mode: "insensitive" as const } } : {}),
      ...(featuredOnly ? { featured: true } : {}),
      ...(search ? { OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ] } : {}),
    };
    const [data, total] = await prisma.$transaction([
      prisma.product.findMany({ where, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], skip: (page - 1) * limit, take: limit }),
      prisma.product.count({ where }),
    ]);
    res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

app.get("/api/products/:slug", async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({ where: { slug: req.params.slug, active: true } });
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json({ data: product });
  } catch (error) { next(error); }
});

app.post("/api/orders", async (req, res, next) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid checkout details", details: parsed.error.flatten() });
  }
  try {
    const input = parsed.data;
    const order = await prisma.$transaction(async (tx) => {
      const ids = [...new Set(input.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: ids }, active: true },
      });
      const productById = new Map(products.map((product) => [product.id, product]));
      const requested = new Map<string, number>();
      for (const item of input.items) {
        requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity);
      }
      let subtotal = new Prisma.Decimal(0);
      const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];
      for (const [productId, quantity] of requested) {
        const product = productById.get(productId);
        if (!product) throw new Error("CHECKOUT_PRODUCT_NOT_FOUND");
        if (product.inventory < quantity) throw new Error(`CHECKOUT_STOCK:${product.name}`);
        const lineTotal = product.price.mul(quantity);
        subtotal = subtotal.add(lineTotal);
        orderItems.push({
          product: { connect: { id: product.id } },
          productName: product.name,
          unitPrice: product.price,
          quantity,
          lineTotal,
        });
      }
      for (const [productId, quantity] of requested) {
        const changed = await tx.product.updateMany({
          where: { id: productId, active: true, inventory: { gte: quantity } },
          data: { inventory: { decrement: quantity } },
        });
        if (changed.count !== 1) throw new Error("CHECKOUT_STOCK_CHANGED");
      }
      const shippingFee = new Prisma.Decimal(0);
      const orderNumber = `AT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      return tx.order.create({
        data: {
          orderNumber,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          shippingAddress: input.shippingAddress,
          notes: input.notes,
          currency: products[0]?.currency ?? "USD",
          subtotal,
          shippingFee,
          total: subtotal.add(shippingFee),
          items: { create: orderItems },
        },
        include: { items: true },
      });
    });
    return res.status(201).json({ data: order });
  } catch (error) {
    if (error instanceof Error && error.message === "CHECKOUT_PRODUCT_NOT_FOUND") {
      return res.status(400).json({ error: "One or more products are unavailable" });
    }
    if (error instanceof Error && (error.message.startsWith("CHECKOUT_STOCK:") || error.message === "CHECKOUT_STOCK_CHANGED")) {
      return res.status(409).json({ error: "Insufficient stock for one or more items" });
    }
    return next(error);
  }
});

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(port, () => {
  console.log(`Premium Brand API listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}
process.on("SIGINT", () => { void shutdown(); });
process.on("SIGTERM", () => { void shutdown(); });
