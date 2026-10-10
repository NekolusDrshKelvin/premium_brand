"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, LoaderCircle, Minus, Plus, ShoppingBag, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { apiRequest, type Product } from "@/lib/api";

type CartLine = { product: Product; quantity: number };
type PlacedOrder = { orderNumber: string; total: string | number; currency: string; paymentMethod: string };
type CreatedPayment = { provider: string; status: string; qrPayload: string | null; setupError?: boolean; transactionRefId?: string | null };

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);

export default function CheckoutPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [payment, setPayment] = useState<CreatedPayment | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [form, setForm] = useState({
    customerName: "", customerEmail: "", customerPhone: "", shippingAddress: "", notes: "",
    paymentMethod: "CASH_ON_DELIVERY" as "CASH_ON_DELIVERY" | "BANK_TRANSFER" | "MMQR",
  });

  useEffect(() => {
    let alive = true;
    apiRequest<{ data: Product[] }>("/api/products?limit=48")
      .then((result) => { if (alive) setProducts(result.data); })
      .catch((err) => { if (alive) setError(err instanceof Error ? err.message : "Could not load products."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const lines: CartLine[] = useMemo(() => products
    .filter((product) => (cart[product.id] ?? 0) > 0)
    .map((product) => ({ product, quantity: cart[product.id] })), [products, cart]);
  const subtotal = lines.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
  const currency = lines[0]?.product.currency ?? products[0]?.currency ?? "USD";
  const mmqrEligible = lines.length > 0 && lines.every((line) => line.product.currency === "MMK");
  const mixedCurrencies = new Set(lines.map((line) => line.product.currency)).size > 1;
  const canCheckout = lines.length > 0 && !busy && !loading;

  useEffect(() => {
    if (!order || order.paymentMethod !== "MMQR" || !payment || payment.status !== "PENDING") return;
    let active = true;
    const check = async () => {
      if (!active) return;
      setCheckingPayment(true);
      try {
        const result = await apiRequest<{
          status: string;
          paymentStatus: string;
          qrPayload: string | null;
          transactionRefId?: string | null;
          provider: string;
        }>(`/api/orders/${encodeURIComponent(order.orderNumber)}/payment?email=${encodeURIComponent(form.customerEmail)}`);
        if (active) setPayment((current) => current ? { ...current, ...result, status: result.status, qrPayload: result.qrPayload } : current);
      } catch {
        // A temporary status-query failure should not change the last known payment state.
      } finally {
        if (active) setCheckingPayment(false);
      }
    };
    const timer = setInterval(() => { void check(); }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [order, payment?.status, form.customerEmail]);

  function changeQuantity(productId: string, delta: number) {
    setCart((current) => {
      const next = Math.max(0, Math.min(20, (current[productId] ?? 0) + delta));
      return { ...current, [productId]: next };
    });
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lines.length) {
      setError("Please add at least one item to your bag.");
      return;
    }
    if (mixedCurrencies) {
      setError("Please select products with the same currency. Mixed-currency totals are not supported.");
      return;
    }
    if (lines.some((line) => line.quantity > line.product.inventory)) {
      setError("One or more selected quantities exceed the available stock. Please update your bag.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<{ data: PlacedOrder; payment?: CreatedPayment; message?: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          items: lines.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        }),
      });
      setOrder(result.data);
      setPayment(result.payment ?? null);
      setError(result.message ?? "");
      setCart({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not place your order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f1e9] text-[#27231f]">
      <div className="bg-[#38271f] px-4 py-2.5 text-center text-[9px] tracking-[.2em] text-[#f5f1e9]">THOUGHTFULLY MADE · COMPLIMENTARY SHIPPING OVER $150</div>
      <header className="border-b border-black/10">
        <div className="container-wide flex h-[76px] items-center justify-between">
          <Link href="/" className="font-serif text-[22px] tracking-[.2em]">ATELIER<span className="text-[#9b7658]">.</span></Link>
          <Link href="/" className="flex items-center gap-2 text-[10px] uppercase tracking-[.15em] hover:opacity-60"><ArrowLeft size={15}/> Continue shopping</Link>
        </div>
      </header>

      <div className="container-wide max-w-[1200px] py-10 sm:py-16">
        {order ? (
          <section className="mx-auto max-w-[640px] border border-black/10 bg-white/50 px-6 py-12 text-center sm:px-12">
            <CheckCircle2 className="mx-auto text-[#6e7656]" size={42} strokeWidth={1.2}/>
            <p className="eyebrow mt-6 text-[#8b7764]">Order received</p>
            <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Thank you, {form.customerName.split(" ")[0]}.</h1>
            <p className="mt-4 text-sm leading-6 text-black/55">Your order has been created. Keep this reference for your records.</p>
            <div className="my-8 border-y border-black/10 py-5"><p className="text-[10px] uppercase tracking-[.15em] text-black/45">Order reference</p><p className="mt-2 font-serif text-2xl">{order.orderNumber}</p><p className="mt-2 text-sm">{formatMoney(Number(order.total), order.currency)}</p></div>
            {order.paymentMethod === "MMQR" && payment ? (
              <div className="bg-[#ebe4d9] p-5 text-left">
                <p className="text-xs font-medium">MMQR payment · {payment.status}</p>
                {payment.qrPayload ? <div className="mt-4 flex flex-col items-center bg-white p-4"><QRCodeSVG value={payment.qrPayload} size={220} level="M" includeMargin/><p className="mt-3 text-center text-[10px] text-black/50">Scan this QR using a supported Myanmar bank or wallet app.</p></div> : <p className="mt-2 text-xs leading-5 text-black/60">{payment.status === "FAILED" ? "The provider reported that payment initialization failed. Contact the store before retrying." : "A payment QR could not be confirmed by the provider. Your order is pending reconciliation. Please contact the store before creating another order."}</p>}
                <p className="mt-3 text-xs leading-5 text-black/60">{payment.status === "PAID" ? "Payment verified by the provider. Thank you." : payment.status === "FAILED" || payment.status === "EXPIRED" || payment.status === "CANCELLED" ? "This payment is not complete. Contact the store for assistance." : "Payment status is checked automatically. Keep this page open until the provider confirms payment."}</p>
                {checkingPayment && <p className="mt-2 flex items-center gap-2 text-[10px] text-black/45"><RefreshCw size={12} className="animate-spin"/> Checking payment status…</p>}
                {payment.transactionRefId && <p className="mt-2 text-[10px] text-black/45">Transaction reference: {payment.transactionRefId}</p>}
                {error && <p className="mt-3 text-xs leading-5 text-amber-900">{error}</p>}
              </div>
            ) : order.paymentMethod === "BANK_TRANSFER" ? (
              <div className="bg-[#ebe4d9] p-5 text-left">
                <p className="text-xs font-medium">Bank transfer selected</p>
                <p className="mt-2 text-xs leading-5 text-black/60">Your order is pending payment. Please contact the store to receive verified bank details and payment instructions. Do not send funds to unverified account details.</p>
              </div>
            ) : (
              <div className="bg-[#ebe4d9] p-5 text-left"><p className="text-xs font-medium">Cash on delivery</p><p className="mt-2 text-xs leading-5 text-black/60">Payment is due when your order is delivered. Our team will review the order and contact you if needed.</p></div>
            )}
            <Link href="/" className="mt-8 inline-flex bg-[#38271f] px-7 py-4 text-[10px] uppercase tracking-[.17em] text-white hover:bg-[#76533b]">Return to the store</Link>
          </section>
        ) : (
          <>
            <p className="eyebrow text-[#8b7764]">A considered purchase</p>
            <h1 className="mt-4 font-serif text-5xl tracking-[-.045em] sm:text-6xl">Your checkout.</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-black/55">Thoughtful essentials, on their way to becoming part of your story.</p>

            {error && <div role="alert" className="mt-7 border border-red-900/20 bg-red-900/5 px-4 py-3 text-sm text-red-900">{error}</div>}

            <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-16">
              <section>
                <div className="flex items-center justify-between border-b border-black/15 pb-4"><h2 className="font-serif text-2xl">The collection</h2><span className="text-xs text-black/45">{lines.reduce((sum, line) => sum + line.quantity, 0)} item(s)</span></div>
                {loading ? <div className="flex items-center gap-3 py-12 text-sm text-black/50"><LoaderCircle size={17} className="animate-spin"/> Loading the collection…</div> : products.length === 0 ? <p className="py-12 text-sm text-black/50">No products are available right now. Please try again later.</p> : (
                  <div className="divide-y divide-black/10">
                    {products.map((product) => {
                      const quantity = cart[product.id] ?? 0;
                      return <article key={product.id} className="flex gap-4 py-5">
                        <div className="h-[118px] w-[92px] shrink-0 bg-[#e2d6c7] bg-cover bg-center sm:h-[140px] sm:w-[112px]" style={{ backgroundImage: `url("${product.imageUrl}")` }}/>
                        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                          <div className="flex items-start justify-between gap-3"><div><p className="font-serif text-lg">{product.name}</p><p className="mt-1 text-[10px] uppercase tracking-[.1em] text-black/45">{product.category}</p><p className="mt-2 text-xs">{formatMoney(Number(product.price), product.currency)}</p></div><span className="pt-1 text-[10px] text-black/40">{product.inventory} available</span></div>
                          <div className="flex items-center justify-between gap-3"><div className="flex items-center border border-black/20"><button type="button" aria-label={`Remove one ${product.name}`} onClick={() => changeQuantity(product.id, -1)} className="p-2.5 hover:bg-black/5"><Minus size={13}/></button><span className="min-w-8 text-center text-xs">{quantity}</span><button type="button" aria-label={`Add one ${product.name}`} disabled={quantity >= Math.min(20, product.inventory)} onClick={() => changeQuantity(product.id, 1)} className="p-2.5 hover:bg-black/5 disabled:opacity-30"><Plus size={13}/></button></div>{quantity > 0 && <button type="button" onClick={() => setCart((current) => ({ ...current, [product.id]: 0 }))} className="text-[9px] uppercase tracking-[.12em] text-black/45 hover:text-black">Remove</button>}</div>
                        </div>
                      </article>;
                    })}
                  </div>
                )}
              </section>

              <section>
                <div className="border border-black/10 bg-white/40 p-5 sm:p-7">
                  <h2 className="font-serif text-2xl">Delivery details</h2>
                  <form onSubmit={submitOrder} className="mt-6 space-y-4">
                    <Field label="Full name" value={form.customerName} onChange={(v) => setForm((s) => ({ ...s, customerName: v }))} required/>
                    <Field label="Email address" type="email" value={form.customerEmail} onChange={(v) => setForm((s) => ({ ...s, customerEmail: v }))} required/>
                    <Field label="Phone (optional)" type="tel" value={form.customerPhone} onChange={(v) => setForm((s) => ({ ...s, customerPhone: v }))}/>
                    <label className="block text-[10px] uppercase tracking-[.13em]">Delivery address<textarea required minLength={8} maxLength={600} value={form.shippingAddress} onChange={(e) => setForm((s) => ({ ...s, shippingAddress: e.target.value }))} rows={3} className="mt-2 w-full border border-black/15 bg-transparent px-3 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#76533b]" placeholder="Street, city, postal code"/></label>
                    <label className="block text-[10px] uppercase tracking-[.13em]">Order notes (optional)<textarea maxLength={1000} value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} rows={2} className="mt-2 w-full border border-black/15 bg-transparent px-3 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#76533b]" placeholder="Delivery instructions"/></label>
                    <div className="border-t border-black/10 pt-5"><p className="text-[10px] uppercase tracking-[.15em]">Payment method</p>
                      <label className="mt-3 flex cursor-pointer items-start gap-3 border border-black/15 p-3.5"><input type="radio" name="paymentMethod" value="CASH_ON_DELIVERY" checked={form.paymentMethod === "CASH_ON_DELIVERY"} onChange={() => setForm((s) => ({ ...s, paymentMethod: "CASH_ON_DELIVERY" }))} className="mt-1 accent-[#38271f]"/><span><span className="block text-xs">Cash on delivery</span><span className="mt-1 block text-[10px] leading-4 text-black/50">Pay when your order arrives.</span></span></label>
                      <label className="mt-2 flex cursor-pointer items-start gap-3 border border-black/15 p-3.5"><input type="radio" name="paymentMethod" value="BANK_TRANSFER" checked={form.paymentMethod === "BANK_TRANSFER"} onChange={() => setForm((s) => ({ ...s, paymentMethod: "BANK_TRANSFER" }))} className="mt-1 accent-[#38271f]"/><span><span className="block text-xs">Bank transfer</span><span className="mt-1 block text-[10px] leading-4 text-black/50">The store will provide verified transfer instructions after reviewing your order.</span></span></label>
                      <label className={`mt-2 flex items-start gap-3 border border-black/15 p-3.5 ${mmqrEligible ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}><input type="radio" name="paymentMethod" value="MMQR" checked={form.paymentMethod === "MMQR"} disabled={!mmqrEligible} onChange={() => setForm((s) => ({ ...s, paymentMethod: "MMQR" }))} className="mt-1 accent-[#38271f]"/><span><span className="block text-xs">MMQR · Myanmar QR</span><span className="mt-1 block text-[10px] leading-4 text-black/50">{mmqrEligible ? "Generate a dynamic QR and wait for server-verified payment confirmation." : "Available only when every selected product is priced in MMK."}</span></span></label>
                      {!mmqrEligible && <p className="mt-2 text-[10px] leading-4 text-black/45">Your current catalog contains non-MMK products. Update product currency and prices in the admin catalog to enable MMQR. Prices are never automatically converted.</p>}
                    </div>
                    <div className="border-t border-black/10 pt-5"><div className="flex justify-between text-sm"><span className="text-black/55">Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div><div className="mt-3 flex justify-between text-sm"><span className="text-black/55">Shipping</span><span>{subtotal >= 150 ? "Complimentary" : "Calculated by store"}</span></div><p className="mt-4 text-[10px] leading-5 text-black/45">Shipping is currently not charged by the API. The final total is calculated server-side from the product prices and quantities.</p><div className="mt-5 flex items-center justify-between border-t border-black/10 pt-4"><span className="font-serif text-xl">Order total</span><span className="font-serif text-2xl">{formatMoney(subtotal, currency)}</span></div></div>
                    <button type="submit" disabled={!canCheckout} className="flex w-full items-center justify-between bg-[#38271f] px-5 py-4 text-[10px] uppercase tracking-[.16em] text-white transition hover:bg-[#76533b] disabled:cursor-not-allowed disabled:opacity-50"><span className="flex items-center gap-2">{busy ? <LoaderCircle size={15} className="animate-spin"/> : <ShoppingBag size={15}/>} {busy ? "Placing order…" : "Place order"}</span><span>{formatMoney(subtotal, currency)}</span></button>
                    <p className="text-center text-[9px] leading-4 text-black/40">By placing your order, you agree that the store may contact you about delivery.</p>
                  </form>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block text-[10px] uppercase tracking-[.13em]">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full border border-black/15 bg-transparent px-3 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#76533b]"/></label>;
}
