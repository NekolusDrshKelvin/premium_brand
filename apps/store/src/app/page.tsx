import { ArrowDownRight, ArrowRight, ArrowUpRight, Menu, MoveUpRight } from "lucide-react";

const products = [
  { name: "The Everyday Tote", category: "Full-grain leather · Cognac", price: "$285", tag: "Bestseller", image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85", tone: "bg-[#e2d6c7]" },
  { name: "Studio Crossbody", category: "Pebbled leather · Espresso", price: "$195", tag: "New arrival", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85", tone: "bg-[#d8c9b7]" },
  { name: "The Weekender", category: "Heritage leather · Dark brown", price: "$420", tag: "", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85", tone: "bg-[#d4c5b4]" },
  { name: "Card Holder No. 02", category: "Vegetable-tanned · Chestnut", price: "$68", tag: "", image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=85", tone: "bg-[#e8dfd1]" },
];

function Wordmark() {
  return <a href="#" className="font-serif text-[22px] tracking-[.2em]">ATELIER<span className="text-[#9b7658]">.</span></a>;
}

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <div className="bg-[#38271f] px-4 py-2.5 text-center text-[9px] tracking-[.2em] text-[#f5f1e9] sm:text-[10px]">
        COMPLIMENTARY SHIPPING ON ORDERS OVER $150 <span className="mx-2 opacity-40">—</span> MADE TO BE KEPT
      </div>

      <header className="relative z-10 border-b border-black/10 bg-[#f5f1e9]">
        <div className="container-wide flex h-[76px] items-center justify-between">
          <button aria-label="Open menu" className="flex items-center gap-2 text-[10px] uppercase tracking-[.16em] md:hidden"><Menu size={18} /> Menu</button>
          <nav className="hidden items-center gap-7 text-[10px] uppercase tracking-[.15em] md:flex">
            <a className="hover:opacity-50" href="#collection">Shop all</a>
            <a className="hover:opacity-50" href="#story">Our story</a>
            <a className="hover:opacity-50" href="#craft">The craft</a>
          </nav>
          <div className="absolute left-1/2 -translate-x-1/2"><Wordmark /></div>
          <div className="flex items-center gap-5 text-[10px] uppercase tracking-[.15em]">
            <a href="#newsletter" className="hidden hover:opacity-50 sm:block">Journal</a>
            <a href="#collection" className="flex items-center gap-2">Bag <span className="flex h-5 w-5 items-center justify-center rounded-full border border-black/20 text-[9px]">0</span></a>
          </div>
        </div>
      </header>

      <section className="hero-photo relative flex min-h-[590px] items-end text-[#fffaf2] sm:min-h-[680px] lg:min-h-[760px]">
        <div className="container-wide grid w-full grid-cols-1 items-end gap-12 pb-14 pt-28 sm:pb-20 lg:grid-cols-[1.2fr_.8fr]">
          <div className="max-w-[760px]">
            <p className="eyebrow mb-6 text-white/75">Objects made to last · Collection 01</p>
            <h1 className="font-serif text-[clamp(3.7rem,9vw,8.4rem)] leading-[.88] tracking-[-.055em]">Carry less.<br/><i className="font-normal">Keep forever.</i></h1>
            <p className="mt-7 max-w-[360px] text-sm leading-6 text-white/80">Thoughtful leather essentials that grow more beautiful with every year, every journey, every story.</p>
            <a href="#collection" className="mt-8 inline-flex items-center gap-8 border-b border-white/60 pb-3 text-[10px] uppercase tracking-[.2em] transition hover:border-white">Explore the collection <ArrowDownRight size={16}/></a>
          </div>
          <div className="hidden justify-self-end pb-2 text-right lg:block">
            <p className="eyebrow text-white/70">Designed with intention</p>
            <p className="mt-3 font-serif text-xl italic">Fewer, better things.</p>
            <p className="mt-2 text-[10px] tracking-[.12em] text-white/60">01 / 04 — THE EVERYDAY EDIT</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/25"/>
      </section>

      <section className="container-wide grid gap-7 py-20 sm:grid-cols-3 sm:py-24">
        {[
          ["01", "Material first", "Selected full-grain hides, chosen for character and longevity."],
          ["02", "Made with care", "Thoughtful construction and considered details in every stitch."],
          ["03", "A life of its own", "Designed to patina, soften, and become unmistakably yours."],
        ].map(([number, title, text]) => (
          <div key={number} className="border-t border-black/20 pt-5">
            <span className="eyebrow text-[#8b7764]">{number} / 03</span>
            <h2 className="mt-8 font-serif text-2xl">{title}</h2>
            <p className="mt-3 max-w-[290px] text-sm leading-6 text-black/55">{text}</p>
          </div>
        ))}
      </section>

      <section id="collection" className="bg-[#ebe4d9] py-16 sm:py-24">
        <div className="container-wide">
          <div className="mb-10 flex items-end justify-between gap-6 sm:mb-14">
            <div>
              <p className="eyebrow text-[#8b7764]">The considered collection</p>
              <h2 className="mt-4 font-serif text-4xl tracking-[-.04em] sm:text-6xl">Everyday, elevated.</h2>
            </div>
            <a href="#newsletter" className="mb-1 hidden items-center gap-3 border-b border-black/30 pb-2 text-[10px] uppercase tracking-[.17em] sm:flex">View all pieces <ArrowRight size={14}/></a>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
            {products.map((product, index) => (
              <article key={product.name} className="product-card group min-w-0">
                <a href="#newsletter" aria-label={`Discover ${product.name}`} className={`relative block aspect-[.78] overflow-hidden ${product.tone}`}>
                  <div className="product-photo absolute inset-0" style={{ backgroundImage: `url('${product.image}')` }}/>
                  {product.tag && <span className="absolute left-3 top-3 bg-[#f5f1e9] px-2.5 py-2 text-[8px] uppercase tracking-[.15em] sm:left-4 sm:top-4">{product.tag}</span>}
                  <span className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-[#f5f1e9] opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100"><MoveUpRight size={16}/></span>
                </a>
                <div className="flex items-start justify-between gap-2 pt-4">
                  <div><h3 className="font-serif text-base sm:text-lg">{product.name}</h3><p className="mt-1.5 text-[9px] leading-4 text-black/50 sm:text-[10px]">{product.category}</p></div>
                  <span className="pt-1 text-[10px] sm:text-xs">{product.price}</span>
                </div>
              </article>
            ))}
          </div>
          <a href="#newsletter" className="mt-10 flex items-center justify-center gap-3 border border-black/30 py-4 text-[10px] uppercase tracking-[.18em] sm:hidden">View all pieces <ArrowRight size={14}/></a>
        </div>
      </section>

      <section id="story" className="container-wide grid gap-10 py-20 sm:py-28 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div className="relative min-h-[430px] overflow-hidden bg-[#d5c4b0] sm:min-h-[590px]">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85')" }}/>
          <div className="absolute bottom-5 left-5 bg-[#f5f1e9]/90 px-4 py-3"><p className="eyebrow">The art of less</p></div>
        </div>
        <div className="max-w-[510px] py-4 lg:py-12">
          <p className="eyebrow text-[#8b7764]">A quieter kind of luxury</p>
          <h2 className="mt-6 font-serif text-5xl leading-[1.02] tracking-[-.045em] sm:text-7xl">Good things<br/><i className="font-normal">take time.</i></h2>
          <p className="mt-7 text-sm leading-7 text-black/60">We believe the most meaningful objects are the ones you reach for without thinking. Pieces that feel right in the hand, work hard every day, and become part of your story.</p>
          <p className="mt-4 text-sm leading-7 text-black/60">No seasonal noise. No unnecessary details. Just honest materials, careful design, and the patience to make things properly.</p>
          <a href="#craft" className="mt-8 inline-flex items-center gap-4 border-b border-black/40 pb-3 text-[10px] uppercase tracking-[.18em]">Get to know us <ArrowUpRight size={15}/></a>
        </div>
      </section>

      <section id="craft" className="bg-[#38271f] py-16 text-[#f5f1e9] sm:py-24">
        <div className="container-wide grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div><p className="eyebrow text-[#c4a68b]">Made for the long way</p><h2 className="mt-5 max-w-md font-serif text-4xl leading-tight tracking-[-.035em] sm:text-6xl">The beauty is in the details.</h2></div>
          <div className="grid gap-8 border-t border-white/20 pt-6 sm:grid-cols-3 lg:gap-6">
            {[["01", "Honest materials", "Leather with natural character, selected to age beautifully."], ["02", "Purposeful design", "Every pocket, seam, and edge has a reason to be there."], ["03", "Built to be repaired", "Care guidance and considered construction for years of use."]].map(([n, title, body]) => <div key={n}><span className="eyebrow text-[#c4a68b]">{n}</span><h3 className="mt-5 font-serif text-xl">{title}</h3><p className="mt-3 text-xs leading-6 text-white/55">{body}</p></div>)}
          </div>
        </div>
      </section>

      <section id="newsletter" className="container-wide py-20 text-center sm:py-28">
        <p className="eyebrow text-[#8b7764]">Notes from the atelier</p>
        <h2 className="mx-auto mt-5 max-w-xl font-serif text-4xl tracking-[-.04em] sm:text-6xl">A little less noise.<br/><i className="font-normal">A little more meaning.</i></h2>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-black/55">Occasional notes on materials, care, and the things worth keeping.</p>
        <form className="mx-auto mt-8 flex max-w-md border-b border-black/40" action="#" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="email" className="sr-only">Email address</label>
          <input id="email" type="email" placeholder="Your email address" className="min-w-0 flex-1 bg-transparent px-1 py-4 text-sm outline-none placeholder:text-black/40" />
          <button type="submit" aria-label="Subscribe" className="px-3 transition hover:opacity-50"><ArrowRight size={18}/></button>
        </form>
        <p className="mt-4 text-[9px] tracking-wide text-black/40">BY SUBSCRIBING, YOU AGREE TO RECEIVE OCCASIONAL EMAILS FROM US.</p>
      </section>

      <footer className="bg-[#e8dfd1]">
        <div className="container-wide grid gap-10 py-10 sm:grid-cols-2 sm:items-end">
          <div><Wordmark/><p className="mt-3 text-xs text-black/50">Considered objects. Lasting stories.</p></div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-[9px] uppercase tracking-[.16em] sm:justify-end"><a href="#collection">Shop</a><a href="#story">Our story</a><a href="#craft">Care guide</a><a href="mailto:hello@example.com">Contact</a></div>
          <div className="border-t border-black/15 pt-5 text-[9px] tracking-wide text-black/45 sm:col-span-2">© {new Date().getFullYear()} ATELIER. MADE WITH INTENTION.</div>
        </div>
      </footer>
    </main>
  );
}
