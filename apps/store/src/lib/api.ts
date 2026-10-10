export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : `Request failed (${response.status})`);
  }
  return payload as T;
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: string | number;
  currency: string;
  imageUrl: string;
  inventory: number;
  featured: boolean;
  active: boolean;
  createdAt?: string;
};

export type OrderItem = {
  id: string;
  productName: string;
  unitPrice: string | number;
  quantity: number;
  lineTotal: string | number;
};

export type StoreOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentMethod?: "CASH_ON_DELIVERY" | "BANK_TRANSFER";
  paymentStatus?: string;
  total: string | number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
};
