import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json({ limit: "1mb" }));

const products = [
  { id: "tote-001", slug: "everyday-tote", name: "The Everyday Tote", category: "Bags", price: 285, currency: "USD", description: "A considered everyday carryall in full-grain leather.", imageUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85", featured: true },
  { id: "crossbody-001", slug: "studio-crossbody", name: "Studio Crossbody", category: "Bags", price: 195, currency: "USD", description: "A compact companion with a clean, purposeful silhouette.", imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85", featured: true },
  { id: "weekender-001", slug: "the-weekender", name: "The Weekender", category: "Travel", price: 420, currency: "USD", description: "A spacious heritage-inspired travel bag.", imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85", featured: false },
  { id: "card-001", slug: "card-holder-no-02", name: "Card Holder No. 02", category: "Small goods", price: 68, currency: "USD", description: "A slim card holder made for everyday essentials.", imageUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=85", featured: false }
];

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "premium-brand-api" }));

app.get("/api/products", (req, res) => {
  const category = String(req.query.category ?? "").trim().toLowerCase();
  const search = String(req.query.search ?? "").trim().toLowerCase();
  const result = products.filter((product) => {
    const categoryMatches = !category || product.category.toLowerCase() === category;
    const searchMatches = !search || `${product.name} ${product.description}`.toLowerCase().includes(search);
    return categoryMatches && searchMatches;
  });
  res.json({ data: result, total: result.length });
});

app.get("/api/products/:slug", (req, res) => {
  const product = products.find((item) => item.slug === req.params.slug);
  if (!product) return res.status(404).json({ error: "Product not found" });
  return res.json({ data: product });
});

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

app.listen(port, () => {
  console.log(`Premium Brand API listening on http://localhost:${port}`);
});
