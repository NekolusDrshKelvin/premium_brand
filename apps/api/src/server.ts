import "dotenv/config";
import { randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { OrderStatus, PaymentMethod, Prisma, PrismaClient, UserRole } from "@prisma/client";
import { z } from "zod";
import { checkoutPayloadSchema } from "./checkout-validation";
import { canTransitionPaymentStatus, createMmpayClient, isMmpayConfigured, normalizeMmpayStatus, validateMmpayTransaction, type MmpayTransaction } from "./mmqr";

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT ?? 4000);
const jwtSecret = process.env.JWT_SECRET ?? "";
const authCookie = "atelier_session";
const tokenLifetimeSeconds = 60 * 60 * 8;

if (jwtSecret.length < 32 || jwtSecret.startsWith("replace_with_")) {
  throw new Error("Set JWT_SECRET to a unique random secret of at least 32 characters in apps/api/.env.");
}

type SessionUser = { id: string; role: UserRole; email: string; name: string };
type AuthRequest = Request & { user?: SessionUser };

app.disable("x-powered-by");
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  credentials: true,
}));
app.use(express.json({ limit: "1mb", verify: (req, _res, buffer) => { (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer); } }));
app.use(cookieParser());

const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: tokenLifetimeSeconds * 1000,
});

function signSession(user: SessionUser) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email, name: user.name }, jwtSecret, {
    expiresIn: tokenLifetimeSeconds,
    issuer: "premium-brand-api",
    audience: "premium-brand-store",
  });
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[authCookie];
    if (!token) return res.status(401).json({ error: "Please sign in to continue." });
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: "premium-brand-api",
      audience: "premium-brand-store",
    }) as JwtPayload;
    if (typeof decoded.sub !== "string" || typeof decoded.email !== "string") {
      return res.status(401).json({ error: "Your session is invalid. Please sign in again." });
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return res.status(401).json({ error: "Your account could not be found." });
    (req as AuthRequest).user = user;
    return next();
  } catch {
    res.clearCookie(authCookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as AuthRequest).user?.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Administrator access is required." });
  }
  return next();
}

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});
const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(200),
});
const productSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(5).max(4000),
  category: z.string().trim().min(2).max(80),
  price: z.number().positive().max(10000000),
  currency: z.string().trim().length(3).default("USD"),
  imageUrl: z.string().url().max(2000),
  inventory: z.number().int().min(0).max(1000000),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
});
const productPatchSchema = productSchema.partial();
const orderStatusSchema = z.object({ status: z.nativeEnum(OrderStatus) });
const checkoutSchema = checkoutPayloadSchema;

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", service: "premium-brand-api", database: "connected" });
  } catch {
    res.status(503).json({ status: "unavailable", service: "premium-brand-api", database: "disconnected" });
  }
});

// Customer registration always creates CUSTOMER accounts. Public requests cannot choose their own role.
app.post("/api/auth/register", async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a name, valid email, and password of at least 12 characters." });
  try {
    const email = parsed.data.email.toLowerCase();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: { name: parsed.data.name, email, passwordHash, role: UserRole.CUSTOMER },
      select: { id: true, name: true, email: true, role: true },
    });
    const token = signSession(user);
    res.cookie(authCookie, token, authCookieOptions());
    return res.status(201).json({ user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    return next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email and password." });
  try {
    const userRecord = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    const valid = userRecord ? await bcrypt.compare(parsed.data.password, userRecord.passwordHash) : false;
    if (!userRecord || !valid) return res.status(401).json({ error: "Email or password is incorrect." });
    const user = { id: userRecord.id, name: userRecord.name, email: userRecord.email, role: userRecord.role };
    res.cookie(authCookie, signSession(user), authCookieOptions());
    return res.json({ user });
  } catch (error) { return next(error); }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = (req as AuthRequest).user;
  return res.json({ user });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(authCookie, authCookieOptions());
  return res.status(204).end();
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
    return res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
});

app.get("/api/products/:slug", async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({ where: { slug: req.params.slug, active: true } });
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json({ data: product });
  } catch (error) { return next(error); }
});

// Admin-only overview data. Customer data is never returned from public endpoints.
app.get("/api/admin/overview", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [products, activeProducts, orders, customers, revenue, recentOrders, lowStock] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { active: true } }),
      prisma.order.count(),
      prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      prisma.order.aggregate({ where: { status: { not: OrderStatus.CANCELLED } }, _sum: { total: true } }),
      prisma.order.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { items: true } }),
      prisma.product.findMany({ where: { active: true, inventory: { lte: 5 } }, orderBy: { inventory: "asc" }, take: 8 }),
    ]);
    return res.json({
      stats: {
        products,
        activeProducts,
        orders,
        customers,
        revenue: revenue._sum.total?.toString() ?? "0",
      },
      recentOrders,
      lowStock,
    });
  } catch (error) { return next(error); }
});

app.get("/api/admin/products", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const data = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
    return res.json({ data });
  } catch (error) { return next(error); }
});

app.post("/api/admin/products", requireAuth, requireAdmin, async (req, res, next) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Product details are invalid.", details: parsed.error.flatten() });
  try {
    const data = await prisma.product.create({ data: { ...parsed.data, price: new Prisma.Decimal(parsed.data.price) } });
    return res.status(201).json({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return res.status(409).json({ error: "That product slug already exists." });
    return next(error);
  }
});

app.patch("/api/admin/products/:id", requireAuth, requireAdmin, async (req, res, next) => {
  const parsed = productPatchSchema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) return res.status(400).json({ error: "Provide valid product fields to update." });
  try {
    const data = await prisma.product.update({
      where: { id: req.params.id },
      data: { ...parsed.data, ...(parsed.data.price !== undefined ? { price: new Prisma.Decimal(parsed.data.price) } : {}) },
    });
    return res.json({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return res.status(404).json({ error: "Product not found." });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return res.status(409).json({ error: "That product slug already exists." });
    return next(error);
  }
});

app.delete("/api/admin/products/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
    return res.json({ data, message: "Product archived." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return res.status(404).json({ error: "Product not found." });
    return next(error);
  }
});

app.get("/api/admin/orders", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    if (status && !Object.values(OrderStatus).includes(status as OrderStatus)) return res.status(400).json({ error: "Invalid order status." });
    const data = await prisma.order.findMany({
      where: status ? { status: status as OrderStatus } : {},
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return res.json({ data });
  } catch (error) { return next(error); }
});

app.patch("/api/admin/orders/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  const parsed = orderStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid order status." });
  try {
    const data = await prisma.order.update({ where: { id: req.params.id }, data: { status: parsed.data.status }, include: { items: true } });
    return res.json({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return res.status(404).json({ error: "Order not found." });
    return next(error);
  }
});

async function applyMmpayTransaction(transaction: MmpayTransaction): Promise<boolean> {
  const payment = await prisma.paymentTransaction.findUnique({
    where: { providerOrderId: transaction.orderId },
    include: { order: true },
  });
  if (!payment) return false;
  const expectedAmount = Number(payment.amount);
  if (!validateMmpayTransaction(transaction, {
    orderId: payment.providerOrderId,
    amount: expectedAmount,
    currency: payment.currency,
  })) {
    console.warn("Rejected MMQR transaction with mismatched order, amount, currency, or status.");
    return false;
  }
  const nextStatus = normalizeMmpayStatus(transaction.status);
  if (!nextStatus) return false;
  if (!canTransitionPaymentStatus(payment.status, nextStatus)) return true;

  await prisma.$transaction(async (tx) => {
    const current = await tx.paymentTransaction.findUnique({ where: { id: payment.id } });
    if (!current || !canTransitionPaymentStatus(current.status, nextStatus)) return;
    await tx.paymentTransaction.update({
      where: { id: current.id },
      data: {
        status: nextStatus,
        ...(transaction.transactionRefId ? { transactionRefId: transaction.transactionRefId } : {}),
        ...(transaction.vendorQrRefId ? { vendorQrRefId: transaction.vendorQrRefId } : {}),
        ...(transaction.vendor ? { vendor: transaction.vendor } : {}),
        ...(transaction.method ? { method: transaction.method } : {}),
        callbackReceivedAt: new Date(),
      },
    });
    await tx.order.update({
      where: { id: current.orderId },
      data: {
        paymentStatus: nextStatus,
        ...(nextStatus === "PAID" ? { status: OrderStatus.CONFIRMED } : {}),
      },
    });
  });
  return true;
}

let mmpayClient: ReturnType<typeof createMmpayClient> | null = null;
if (isMmpayConfigured()) {
  try {
    mmpayClient = createMmpayClient();
    const handleVerifiedEvent = (transaction: MmpayTransaction) => {
      void applyMmpayTransaction(transaction).catch((error) => console.error("MMQR event reconciliation failed:", error));
    };
    mmpayClient.onTxSuccess(handleVerifiedEvent);
    mmpayClient.onTxFail(handleVerifiedEvent);
    mmpayClient.onTxRefund(handleVerifiedEvent);
    mmpayClient.onTxCancel(handleVerifiedEvent);
    mmpayClient.onTxExpire(handleVerifiedEvent);
    mmpayClient.onHeartbeat(handleVerifiedEvent);
  } catch (error) {
    console.error("MMQR configuration could not be initialized. MMQR checkout will remain unavailable.", error);
  }
}

app.post("/api/orders", async (req, res, next) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid checkout details", details: parsed.error.flatten() });
  const input = parsed.data;
  if (input.paymentMethod === PaymentMethod.MMQR && (!mmpayClient || !isMmpayConfigured())) {
    return res.status(503).json({ error: "MMQR is not configured yet. Please choose another payment method or contact the store." });
  }
  try {
    const order = await prisma.$transaction(async (tx) => {
      const requested = new Map<string, number>();
      for (const item of input.items) requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity);
      const ids = [...requested.keys()];
      const products = await tx.product.findMany({ where: { id: { in: ids }, active: true } });
      const productById = new Map(products.map((product) => [product.id, product]));
      let subtotal = new Prisma.Decimal(0);
      const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];
      for (const [productId, quantity] of requested) {
        const product = productById.get(productId);
        if (!product) throw new Error("CHECKOUT_PRODUCT_NOT_FOUND");
        if (product.inventory < quantity) throw new Error(`CHECKOUT_STOCK:${product.name}`);
        const lineTotal = product.price.mul(quantity);
        subtotal = subtotal.add(lineTotal);
        orderItems.push({ product: { connect: { id: product.id } }, productName: product.name, unitPrice: product.price, quantity, lineTotal });
      }
      if (new Set(products.map((product) => product.currency)).size > 1) throw new Error("CHECKOUT_MIXED_CURRENCIES");
      if (input.paymentMethod === PaymentMethod.MMQR) {
        if (products.some((product) => product.currency !== "MMK")) throw new Error("CHECKOUT_MMQR_REQUIRES_MMK");
        if (!Number.isInteger(Number(subtotal.toString()))) throw new Error("CHECKOUT_MMQR_INTEGER_AMOUNT");
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
          customerEmail: input.customerEmail.toLowerCase(),
          customerPhone: input.customerPhone,
          shippingAddress: input.shippingAddress,
          notes: input.notes,
          paymentMethod: input.paymentMethod,
          paymentStatus: "PENDING",
          currency: products[0]?.currency ?? "USD",
          subtotal,
          shippingFee,
          total: subtotal.add(shippingFee),
          items: { create: orderItems },
        },
        include: { items: true },
      });
    });

    if (input.paymentMethod !== PaymentMethod.MMQR) {
      return res.status(201).json({ data: order });
    }

    const amount = Number(order.total);
    const payment = await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: "MYANMYANPAY",
        providerOrderId: order.orderNumber,
        amount: new Prisma.Decimal(order.total.toString()),
        currency: "MMK",
        status: "PENDING",
      },
    });
    try {
      const items = order.items.map((item) => ({
        name: item.productName.slice(0, 100),
        amount: Number(item.unitPrice),
        quantity: item.quantity,
      }));
      const gatewayResponse = await mmpayClient!.pay({
        orderId: order.orderNumber,
        amount,
        currency: "MMK",
        callbackUrl: process.env.MMPAY_CALLBACK_URL,
        customMessage: `Order ${order.orderNumber}`.slice(0, 150),
        items,
      });
      if (
        gatewayResponse &&
        gatewayResponse.orderId === order.orderNumber &&
        gatewayResponse.amount === amount &&
        gatewayResponse.currency === "MMK" &&
        gatewayResponse.status === "FAILED"
      ) {
        await applyMmpayTransaction({
          orderId: gatewayResponse.orderId,
          amount: gatewayResponse.amount,
          currency: gatewayResponse.currency,
          status: "FAILED",
        });
        return res.status(201).json({
          data: order,
          payment: { provider: "MYANMYANPAY", status: "FAILED", qrPayload: null },
          message: "The provider reported that MMQR payment initialization failed. Contact the store before retrying.",
        });
      }
      if (
        !gatewayResponse ||
        gatewayResponse.orderId !== order.orderNumber ||
        gatewayResponse.amount !== amount ||
        gatewayResponse.currency !== "MMK" ||
        typeof gatewayResponse.qr !== "string" ||
        gatewayResponse.qr.length < 10 ||
        !["PENDING", "SUCCESS"].includes(gatewayResponse.status)
      ) {
        throw new Error("MMQR provider response did not match the order amount, currency, ID, or expected status.");
      }
      if (gatewayResponse.status === "SUCCESS") {
        await applyMmpayTransaction({
          orderId: gatewayResponse.orderId,
          amount: gatewayResponse.amount,
          currency: gatewayResponse.currency,
          status: "SUCCESS",
          transactionRefId: gatewayResponse.transactionRefId,
        });
      }
      const updatedPayment = await prisma.paymentTransaction.update({
        where: { id: payment.id },
        data: { qrPayload: gatewayResponse.qr },
      });
      return res.status(201).json({
        data: order,
        payment: { provider: "MYANMYANPAY", status: updatedPayment.status, qrPayload: updatedPayment.qrPayload },
      });
    } catch (gatewayError) {
      // Keep the order and stock reservation pending if the provider timed out: the gateway may have
      // accepted the request before the network failed. Reconcile through the provider/admin before retrying.
      console.error("MMQR payment creation did not return a confirmed QR response for order", order.orderNumber, gatewayError);
      return res.status(201).json({
        data: order,
        payment: { provider: "MYANMYANPAY", status: "PENDING", qrPayload: null, setupError: true },
        message: "Order created, but QR creation was not confirmed. Contact the store before retrying; do not submit a duplicate order.",
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "CHECKOUT_PRODUCT_NOT_FOUND") return res.status(400).json({ error: "One or more products are unavailable." });
    if (error instanceof Error && error.message === "CHECKOUT_MIXED_CURRENCIES") return res.status(400).json({ error: "Please select products with the same currency. Mixed-currency totals are not supported." });
    if (error instanceof Error && error.message === "CHECKOUT_MMQR_REQUIRES_MMK") return res.status(400).json({ error: "MMQR checkout requires all selected products to be priced in MMK. Update product currency and prices in the admin catalog first." });
    if (error instanceof Error && error.message === "CHECKOUT_MMQR_INTEGER_AMOUNT") return res.status(400).json({ error: "MMQR checkout requires a whole-number MMK total." });
    if (error instanceof Error && (error.message.startsWith("CHECKOUT_STOCK:") || error.message === "CHECKOUT_STOCK_CHANGED")) return res.status(409).json({ error: "Insufficient stock for one or more items." });
    return next(error);
  }
});

// Public order status is gated by both the unpredictable order number and the customer's email.
// The provider status query is used as a second source of truth while the payment is still pending.
app.get("/api/orders/:orderNumber/payment", async (req, res, next) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "A valid checkout email is required." });
  }
  try {
    let payment = await prisma.paymentTransaction.findUnique({
      where: { providerOrderId: req.params.orderNumber },
      include: { order: true },
    });
    if (!payment || payment.order.customerEmail !== email) return res.status(404).json({ error: "Payment record not found." });

    if (payment.status === "PENDING" && mmpayClient) {
      try {
        const providerResult = await mmpayClient.get({ orderId: payment.providerOrderId, nonce: randomUUID() });
        // The provider SDK omits currency from status responses; its MMQR API only supports MMK transactions.
        const accepted = await applyMmpayTransaction({ ...providerResult, currency: "MMK" } as MmpayTransaction);
        if (accepted) {
          payment = await prisma.paymentTransaction.findUnique({
            where: { id: payment.id },
            include: { order: true },
          });
        }
      } catch (providerError) {
        console.warn("MMQR status query failed; retaining the last known payment status.", providerError);
      }
    }
    if (!payment) return res.status(404).json({ error: "Payment record not found." });
    return res.json({
      orderNumber: payment.order.orderNumber,
      paymentStatus: payment.order.paymentStatus,
      status: payment.status,
      currency: payment.currency,
      amount: payment.amount.toString(),
      qrPayload: payment.qrPayload,
      transactionRefId: payment.transactionRefId,
      provider: payment.provider,
    });
  } catch (error) { return next(error); }
});

// MMPay's SDK verifies the signature and nonce before emitting the registered transaction events.
app.post("/api/webhooks/mmpay", async (req, res) => {
  if (!mmpayClient) return res.status(503).json({ error: "MMQR webhook is not configured." });
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const nonce = req.header("x-mmpay-nonce");
  const signature = req.header("x-mmpay-signature");
  if (!rawBody || !nonce || !signature) return res.status(400).json({ error: "Missing raw payload or MMQR signature headers." });
  try {
    const rawPayload = rawBody.toString("utf8");
    await mmpayClient.listen(rawPayload, nonce, signature);
    const transaction = JSON.parse(rawPayload) as MmpayTransaction;
    const accepted = await applyMmpayTransaction(transaction);
    if (!accepted) return res.status(400).json({ error: "MMQR callback did not match a pending payment." });
    return res.status(200).json({ received: true });
  } catch {
    return res.status(401).json({ error: "MMQR callback signature or nonce verification failed." });
  }
});

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
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
