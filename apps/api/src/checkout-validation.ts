import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

export const checkoutPayloadSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(254),
  customerPhone: z.string().trim().max(40).optional(),
  shippingAddress: z.string().trim().min(8).max(600),
  notes: z.string().trim().max(1000).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH_ON_DELIVERY),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(30),
});
