"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Boxes, Check, ChevronDown, CircleDollarSign, ClipboardList, ExternalLink, LayoutDashboard, LoaderCircle, LogOut, PackagePlus, RefreshCw, ShieldCheck, ShoppingBag, Users, X } from "lucide-react";
import { apiRequest, type Product, type SessionUser, type StoreOrder } from "@/lib/api";

type Overview = {
  stats: { products: number; activeProducts: number; orders: number; customers: number; revenue: string };
  recentOrders: StoreOrder[];
  lowStock: Product[];
};
type Tab = "overview" | "products" | "orders";
const statuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
const money = (value: string | number, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value) || 0);

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", category: "Bags", description: "", price: "100", inventory: "10", imageUrl: "", featured: false });

  const loadData = useCallback(async () => {
    setError("");
    const [overviewResult, productResult, orderResult] = await Promise.all([
      apiRequest<Overview>("/api/admin/overview"),
      apiRequest<{ data: Product[] }>("/api/admin/products"),
      apiRequest<{ data: StoreOrder[] }>("/api/admin/orders"),
    ]);
    setOverview(overviewResult);
    setProducts(productResult.data);
    setOrders(orderResult.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const result = await apiRequest<{ user: SessionUser }>("/api/auth/me");
        if (result.user.role !== "ADMIN") {
          await apiRequest<void>("/api/auth/logout", { method: "POST" });
          router.replace("/admin/login");
          return;
        }
        if (!cancelled) setUser(result.user);
        await loadData();
      } catch {
        if (!cancelled) router.replace("/admin/login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => { cancelled = true; };
  }, [loadData, router]);

  async function refresh() {
    setBusy(true);
    setNotice("");
    try { await loadData(); setNotice("Dashboard updated."); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not refresh dashboard."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    try { await apiRequest<void>("/api/auth/logout", { method: "POST" }); }
    finally { router.replace("/admin/login"); }
  }

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest("/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          slug: form.slug || form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          price: Number(form.price),
          inventory: Number(form.inventory),
          currency: "USD",
          active: true,
        }),
      });
      setForm({ name: "", slug: "", category: "Bags", description: "", price: "100", inventory: "10", imageUrl: "", featured: false });
      setShowCreate(false);
      setNotice("Product created successfully.");
      await loadData();
      setTab("products");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create product."); }
    finally { setBusy(false); }
  }

  async function archiveProduct(product: Product) {
    if (!window.confirm(`Archive "${product.name}"? It will no longer appear in the public store.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest(`/api/admin/products/${product.id}`, { method: "DELETE" });
      setNotice("Product archived.");
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not archive product."); }
    finally { setBusy(false); }
  }

  async function changeOrderStatus(orderId: string, status: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest(`/api/admin/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setNotice("Order status updated.");
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update order."); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f5f1e9]"><div className="flex items-center gap-3 text-sm text-black/55"><LoaderCircle className="animate-spin" size={18}/> Preparing your workspace…</div></main>;

  const nav: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "products", label: "Products", icon: ShoppingBag },
    { id: "orders", label: "Orders", icon: ClipboardList },
  ];

  return (
    <main className="min-h-screen bg-[#f5f1e9] text-[#27231f]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[245px] flex-col bg-[#38271f] px-5 py-7 text-[#f5f1e9] lg:flex">
        <Link href="/" className="px-3 font-serif text-xl tracking-[.2em]">ATELIER<span className="text-[#c4a68b]">.</span></Link>
        <p className="eyebrow mt-12 px-3 text-white/40">Workspace</p>
        <nav className="mt-4 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} onClick={() => setTab(item.id)} className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition ${tab === item.id ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"}`}><Icon size={17} strokeWidth={1.6}/>{item.label}</button>;
          })}
        </nav>
        <div className="mt-auto border-t border-white/15 pt-5">
          <div className="flex items-center gap-3 px-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><ShieldCheck size={17}/></div><div className="min-w-0"><p className="truncate text-xs">{user?.name}</p><p className="mt-1 truncate text-[10px] text-white/45">Administrator</p></div></div>
          <button onClick={signOut} className="mt-5 flex w-full items-center gap-3 px-3 py-3 text-xs text-white/55 transition hover:text-white"><LogOut size={16}/> Sign out</button>
        </div>
      </aside>

      <div className="lg:pl-[245px]">
        <header className="sticky top-0 z-10 border-b border-black/10 bg-[#f5f1e9]/95 backdrop-blur">
          <div className="flex min-h-[76px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
            <div><p className="eyebrow text-[#8b7764]">Atelier / Administration</p><h1 className="mt-1 font-serif text-2xl sm:text-3xl">{tab === "overview" ? "Overview" : tab === "products" ? "Product catalogue" : "Order management"}</h1></div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/" target="_blank" className="hidden items-center gap-2 border border-black/20 px-3 py-2.5 text-[9px] uppercase tracking-[.13em] transition hover:bg-black/5 sm:flex">View store <ExternalLink size={13}/></Link>
              <button onClick={() => void refresh()} disabled={busy} aria-label="Refresh dashboard" className="flex h-10 w-10 items-center justify-center border border-black/20 transition hover:bg-black/5 disabled:opacity-50"><RefreshCw size={15} className={busy ? "animate-spin" : ""}/></button>
              <button onClick={signOut} aria-label="Sign out" className="flex h-10 w-10 items-center justify-center border border-black/20 lg:hidden"><LogOut size={16}/></button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto px-5 pb-3 lg:hidden">{nav.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap px-4 py-2 text-xs ${tab === item.id ? "bg-[#38271f] text-white" : "border border-black/15"}`}>{item.label}</button>)}</div>
        </header>

        <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          {error && <div role="alert" className="mb-5 flex items-start justify-between gap-4 border border-red-900/15 bg-red-900/5 px-4 py-3 text-sm text-red-900"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={16}/></button></div>}
          {notice && <div role="status" className="mb-5 flex items-center gap-2 border border-green-900/15 bg-green-900/5 px-4 py-3 text-sm text-green-900"><Check size={16}/>{notice}</div>}

          {tab === "overview" && <>
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-black/55">A clear view of how your store is doing.</p><p className="mt-2 text-xs text-black/40">Signed in as {user?.email}</p></div><span className="eyebrow text-[#8b7764]">Live data · API connected</span></div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                { label: "Total products", value: overview?.stats.products ?? 0, note: `${overview?.stats.activeProducts ?? 0} active`, icon: ShoppingBag },
                { label: "Orders received", value: overview?.stats.orders ?? 0, note: "All-time orders", icon: ClipboardList },
                { label: "Customer accounts", value: overview?.stats.customers ?? 0, note: "Registered customers", icon: Users },
                { label: "Order revenue", value: money(overview?.stats.revenue ?? 0), note: "Excludes cancelled orders", icon: CircleDollarSign },
              ].map((card) => { const Icon = card.icon; return <div key={card.label} className="border border-black/10 bg-white/45 p-4 sm:p-6"><div className="flex items-center justify-between gap-2"><span className="text-[11px] text-black/55">{card.label}</span><Icon size={17} className="text-[#8b7764]"/></div><p className="mt-5 break-words font-serif text-3xl sm:text-4xl">{card.value}</p><p className="mt-2 text-[10px] text-black/45">{card.note}</p></div>; })}
            </div>
            <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
              <section className="border border-black/10 bg-white/45">
                <div className="flex items-center justify-between border-b border-black/10 px-5 py-4"><div><h2 className="font-serif text-xl">Recent orders</h2><p className="mt-1 text-xs text-black/45">The latest activity in your store</p></div><button onClick={() => setTab("orders")} className="flex items-center gap-1 text-[10px] uppercase tracking-[.12em]">All orders <ArrowUpRight size={14}/></button></div>
                <div className="divide-y divide-black/10">{(overview?.recentOrders ?? []).length === 0 ? <p className="px-5 py-10 text-sm text-black/45">No orders yet. New orders will appear here.</p> : overview?.recentOrders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="text-xs">{order.orderNumber}</p><p className="mt-1 text-[11px] text-black/50">{order.customerName} · {order.items.length} item(s)</p></div><div className="text-right"><p className="text-sm">{money(order.total, order.currency)}</p><span className="mt-1 inline-block text-[9px] uppercase tracking-[.12em] text-[#8b7764]">{order.status}</span></div></div>)}</div>
              </section>
              <section className="border border-black/10 bg-white/45">
                <div className="flex items-center justify-between border-b border-black/10 px-5 py-4"><div><h2 className="font-serif text-xl">Low stock</h2><p className="mt-1 text-xs text-black/45">Five or fewer units remaining</p></div><Boxes size={17} className="text-[#8b7764]"/></div>
                <div className="divide-y divide-black/10">{(overview?.lowStock ?? []).length === 0 ? <p className="px-5 py-10 text-sm text-black/45">No low-stock items right now.</p> : overview?.lowStock.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="truncate text-xs">{product.name}</p><p className="mt-1 text-[10px] text-black/45">{product.category}</p></div><span className={`shrink-0 px-2.5 py-1 text-[10px] ${product.inventory === 0 ? "bg-red-900/10 text-red-900" : "bg-amber-900/10 text-amber-900"}`}>{product.inventory} left</span></div>)}</div>
              </section>
            </div>
          </>}

          {tab === "products" && <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-black/55">{products.length} products in your catalogue</p><button onClick={() => setShowCreate((value) => !value)} className="flex items-center gap-2 bg-[#38271f] px-4 py-3 text-[10px] uppercase tracking-[.15em] text-white transition hover:bg-[#76533b]">{showCreate ? <X size={15}/> : <PackagePlus size={15}/>} {showCreate ? "Close form" : "Add product"}</button></div>
            {showCreate && <form onSubmit={createProduct} className="mb-7 border border-black/10 bg-white/55 p-5 sm:p-7"><h2 className="mb-5 font-serif text-2xl">Add a product</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Product name" value={form.name} onChange={(v) => { updateField("name",v); if (!form.slug) updateField("slug",v.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")); }} required/>
              <Field label="URL slug" value={form.slug} onChange={(v) => updateField("slug",v)} required/>
              <Field label="Category" value={form.category} onChange={(v) => updateField("category",v)} required/>
              <Field label="Price (USD)" type="number" value={form.price} onChange={(v) => updateField("price",v)} required/>
              <Field label="Inventory quantity" type="number" value={form.inventory} onChange={(v) => updateField("inventory",v)} required/>
              <Field label="Image URL (https)" type="url" value={form.imageUrl} onChange={(v) => updateField("imageUrl",v)} required/>
              <label className="flex items-center gap-3 text-xs sm:col-span-2"><input type="checkbox" checked={form.featured} onChange={(e) => updateField("featured",e.target.checked)} className="h-4 w-4 accent-[#38271f]"/> Feature this product on the store</label>
              <label className="text-[10px] uppercase tracking-[.13em] sm:col-span-2 xl:col-span-3">Description<textarea required minLength={5} maxLength={4000} value={form.description} onChange={(e) => updateField("description",e.target.value)} rows={3} className="mt-2 w-full border border-black/15 bg-transparent px-3 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#76533b]"/></label>
            </div><button disabled={busy} className="mt-5 flex items-center gap-2 bg-[#38271f] px-5 py-3 text-[10px] uppercase tracking-[.15em] text-white disabled:opacity-50">{busy ? <LoaderCircle className="animate-spin" size={14}/> : <Check size={14}/>} Save product</button></form>}
            <div className="overflow-x-auto border border-black/10 bg-white/45"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-black/10 bg-black/[.025]"><tr>{["Product","Category","Price","Stock","Status","Action"].map((heading) => <th key={heading} className="px-4 py-3 text-[9px] font-normal uppercase tracking-[.15em] text-black/50">{heading}</th>)}</tr></thead><tbody className="divide-y divide-black/10">{products.map((product) => <tr key={product.id} className="hover:bg-black/[.02]"><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="h-12 w-10 shrink-0 bg-cover bg-center" style={{backgroundImage:`url('${product.imageUrl}')`}}/><div><p className="text-xs">{product.name}</p><p className="mt-1 text-[10px] text-black/40">{product.slug}</p></div></div></td><td className="px-4 py-4 text-xs text-black/60">{product.category}</td><td className="px-4 py-4 text-xs">{money(product.price,product.currency)}</td><td className="px-4 py-4 text-xs">{product.inventory}</td><td className="px-4 py-4"><span className={`text-[9px] uppercase tracking-[.12em] ${product.active ? "text-green-800" : "text-black/35"}`}>{product.active ? "Active" : "Archived"}</span></td><td className="px-4 py-4">{product.active && <button disabled={busy} onClick={() => void archiveProduct(product)} className="border border-black/15 px-3 py-2 text-[9px] uppercase tracking-[.1em] transition hover:border-red-900/30 hover:text-red-900 disabled:opacity-50">Archive</button>}</td></tr>)}</tbody></table></div>
          </>}

          {tab === "orders" && <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-black/55">Review orders and update fulfillment status.</p><span className="eyebrow text-[#8b7764]">Latest 100 orders</span></div>
            <div className="overflow-x-auto border border-black/10 bg-white/45"><table className="w-full min-w-[900px] text-left"><thead className="border-b border-black/10 bg-black/[.025]"><tr>{["Order","Customer","Date","Items","Total","Status"].map((heading) => <th key={heading} className="px-4 py-3 text-[9px] font-normal uppercase tracking-[.15em] text-black/50">{heading}</th>)}</tr></thead><tbody className="divide-y divide-black/10">{orders.map((order) => <tr key={order.id} className="align-top hover:bg-black/[.02]"><td className="px-4 py-4 text-xs">{order.orderNumber}</td><td className="px-4 py-4"><p className="text-xs">{order.customerName}</p><p className="mt-1 text-[10px] text-black/45">{order.customerEmail}</p></td><td className="px-4 py-4 text-xs text-black/60">{new Date(order.createdAt).toLocaleDateString()}</td><td className="max-w-[220px] px-4 py-4 text-xs text-black/60">{order.items.map((item) => `${item.productName} × ${item.quantity}`).join(", ")}</td><td className="px-4 py-4 text-xs">{money(order.total,order.currency)}</td><td className="px-4 py-4"><div className="relative"><select aria-label={`Status for ${order.orderNumber}`} value={order.status} disabled={busy} onChange={(e) => void changeOrderStatus(order.id,e.target.value)} className="appearance-none border border-black/15 bg-[#f5f1e9] py-2 pl-2 pr-7 text-[9px] uppercase tracking-[.08em] outline-none focus:border-[#76533b]">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"/></div></td></tr>)}</tbody></table>{orders.length === 0 && <p className="px-5 py-12 text-sm text-black/45">No orders received yet.</p>}</div>
          </>}
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 py-5 text-[9px] uppercase tracking-[.12em] text-black/40"><span>ATELIER · Private workspace</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-green-700"/> Connected to API</span></footer>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block text-[10px] uppercase tracking-[.13em]">{label}<input type={type} required={required} min={type === "number" ? 0 : undefined} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full border border-black/15 bg-transparent px-3 py-3 text-sm normal-case tracking-normal outline-none focus:border-[#76533b]"/></label>;
}
