/**
 * Idempotent demo-listing seeder for the D&D Luxury marketplace.
 *
 * Adds a curated set of authenticated luxury listings (with category-matched,
 * HTTP-verified images) to the existing "Verified Atelier" demo seller, so the
 * browse/home grids and filters have realistic volume to work with.
 *
 * Safe to re-run: listings are keyed by (seller_id, title) and skipped if they
 * already exist. All data sits on the @dndluxury demo seller and is purgeable
 * before production (see HANDOFF.md §5).
 *
 *   node --env-file=.env.local scripts/seed-demo-listings.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local)");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const SELLER_USERNAME = "verified-atelier";
const FEE_BPS = 1200; // Free tier, matches existing demo listings
const u = (id) => `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;

// Candidate images per category. Verified over HTTP before use; anything that
// 404s is dropped, and we fall back to the existing in-DB pool so no listing
// ever ships a broken image.
const IMAGE_CANDIDATES = {
  watches: [
    "1523275335684-37898b6baf30", "1524592094714-0f0654e20314",
    "1587836374828-4dbafa94cf0e", "1547996160-81dfa63595aa",
    "1612817159949-195b6eb9e31a", "1620625515032-6ed0c1790c75",
    "1509048191080-d2984bad6ae5", "1434056886845-dac89ffe9b56",
  ].map(u),
  bags: [
    "1584917865442-de89df76afd3", "1548036328-c9fa89d128fa",
    "1591561954557-26941169b49e", "1566150905458-1bf1fc113f0d",
    "1594223274512-ad4803739b7c", "1559563458-527698bf5295",
    "1564422170194-896b89110ef8", "1606522754091-a3bbf9ad4cb3",
  ].map(u),
  jewellery: [
    "1611652022419-a9419f74343d", "1599643478518-a784e5dc4c8f",
    "1605100804763-247f67b3557e", "1515562141207-7a88fb7ce338",
    "1602173574767-37ac01994b2a", "1535632066927-ab7c9ab60908",
  ].map(u),
  shoes: [
    "1614252369475-531eba835eb1", "1543163521-1bf539c55dd2",
    "1549298916-b41d501d3772", "1560769629-975ec94e6a86",
    "1595950653106-6c9ebd614d3a",
  ].map(u),
};

// Gender for the demo catalogue (mirrors the migration backfill): all bags +
// the Chanel slingback are women; loafers + sport/dress watches are men;
// everything else (jewellery, sneakers, neutral watches) stays unisex.
const MEN_TITLES = new Set([
  "Prada Monolith Loafer",
  "Gucci Horsebit 1953 Loafer",
  "Patek Philippe Aquanaut",
  "Audemars Piguet Royal Oak 15500ST",
  "Rolex Cosmograph Daytona",
  "Rolex GMT-Master II Pepsi",
  "Patek Philippe Nautilus",
]);
const genderFor = (item) =>
  item.category === "bags" || item.title === "Chanel Slingback Two-Tone"
    ? "women"
    : MEN_TITLES.has(item.title)
      ? "men"
      : "unisex";

const NEW_LISTINGS = [
  // Watches
  { title: "Audemars Piguet Royal Oak 15500ST", brand: "Audemars Piguet", category: "watches", model: "15500ST.OO.1220ST.01", price: 88000000, year: 2021, condition: "Mint", method: "courier", description: "Blue 'Grande Tapisserie' dial, integrated bracelet. Box and papers, lightly worn." },
  { title: "Rolex Cosmograph Daytona", brand: "Rolex", category: "watches", model: "116500LN", price: 52000000, year: 2022, condition: "Pristine", method: "courier", description: "White dial ceramic-bezel Daytona. Unworn, full set with card." },
  { title: "Rolex GMT-Master II Pepsi", brand: "Rolex", category: "watches", model: "126710BLRO", price: 32000000, year: 2020, condition: "Excellent", method: "courier", description: "Jubilee bracelet, red-and-blue Cerachrom bezel. Serviced, box and papers." },
  { title: "Patek Philippe Aquanaut", brand: "Patek Philippe", category: "watches", model: "5167A-001", price: 72000000, year: 2019, condition: "Mint", method: "dropoff", description: "Stainless steel Aquanaut, black embossed dial. Full set, immaculate." },
  { title: "Cartier Santos de Cartier Large", brand: "Cartier", category: "watches", model: "WSSA0018", price: 16500000, year: 2021, condition: "Excellent", method: "photo", description: "Large model on steel with interchangeable strap. QuickSwitch bracelet included." },

  // Bags
  { title: "Hermès Kelly 28 Sellier", brand: "Hermès", category: "bags", model: "Kelly 28", price: 61500000, year: 2022, condition: "Pristine", method: "courier", description: "Sellier Kelly 28 in Epsom, gold hardware. Full set with rain cover and box." },
  { title: "Chanel 2.55 Reissue 226", brand: "Chanel", category: "bags", model: "Reissue 226", price: 15800000, year: 2021, condition: "Excellent", method: "photo", description: "Aged calfskin with ruthenium Mademoiselle clasp. Hologram and card present." },
  { title: "Louis Vuitton Capucines MM", brand: "Louis Vuitton", category: "bags", model: "Capucines MM", price: 9200000, year: 2023, condition: "Mint", method: "photo", description: "Taurillon leather Capucines in black with gold-tone LV clasp." },
  { title: "Bottega Veneta Jodie Mini", brand: "Bottega Veneta", category: "bags", model: "Jodie Mini", price: 4800000, year: 2022, condition: "Excellent", method: "photo", description: "Intrecciato Nappa Jodie in Fondant. Lightly used, dust bag included." },
  { title: "Dior Lady Dior Medium", brand: "Dior", category: "bags", model: "Lady Dior Medium", price: 10500000, year: 2021, condition: "Mint", method: "dropoff", description: "Black Cannage lambskin with gold D.I.O.R. charms. Strap and box included." },
  { title: "Gucci Jackie 1961 Small", brand: "Gucci", category: "bags", model: "Jackie 1961", price: 3800000, year: 2023, condition: "Pristine", method: "photo", description: "GG Supreme canvas Jackie with piston closure. Unused with tags." },
  { title: "Prada Galleria Saffiano", brand: "Prada", category: "bags", model: "Galleria", price: 4200000, year: 2022, condition: "Excellent", method: "photo", description: "Saffiano leather Galleria in black, medium. Strap, lock and card present." },

  // Jewellery
  { title: "Cartier Juste un Clou Bracelet", brand: "Cartier", category: "jewellery", model: "B6062617", price: 18500000, year: 2021, condition: "Mint", method: "courier", description: "18k yellow gold nail bracelet, size 17. Box, papers and screwdriver included." },
  { title: "Bvlgari Serpenti Viper Bracelet", brand: "Bvlgari", category: "jewellery", model: "Serpenti Viper", price: 24000000, year: 2020, condition: "Excellent", method: "courier", description: "18k rose gold with pavé diamonds. Certificate of authenticity included." },
  { title: "Bvlgari B.zero1 Ring", brand: "Bvlgari", category: "jewellery", model: "B.zero1", price: 6200000, year: 2022, condition: "Pristine", method: "dropoff", description: "Four-band B.zero1 in 18k rose gold, size 54. As new with box." },
  { title: "Cartier Trinity Ring", brand: "Cartier", category: "jewellery", model: "Trinity", price: 3800000, year: 2023, condition: "Mint", method: "photo", description: "Three interlaced bands in yellow, white and rose gold. Box and papers." },

  // Shoes
  { title: "Chanel Slingback Two-Tone", brand: "Chanel", category: "shoes", model: "Slingback", price: 1850000, year: 2023, condition: "Excellent", method: "photo", description: "Beige and black grosgrain slingbacks, size 38. Worn twice, box included." },
  { title: "Gucci Horsebit 1953 Loafer", brand: "Gucci", category: "shoes", model: "Horsebit 1953", price: 1690000, year: 2022, condition: "Good", method: "photo", description: "Leather Horsebit loafers in black, size 42. Resoled, light wear." },
  { title: "Dior B23 High-Top", brand: "Dior", category: "shoes", model: "B23", price: 2150000, year: 2021, condition: "Excellent", method: "photo", description: "Oblique canvas B23 high-tops, size 43. Box and extra laces included." },
  { title: "Prada Monolith Loafer", brand: "Prada", category: "shoes", model: "Monolith", price: 1990000, year: 2023, condition: "Mint", method: "photo", description: "Brushed leather Monolith loafers, size 41. Worn once." },
];

const CONDITIONS = ["Pristine", "Mint", "Excellent", "Good"];

async function urlOk(link) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(link, { method: "GET", signal: ctrl.signal });
    clearTimeout(t);
    if (res.body) await res.body.cancel();
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  // 1. Resolve the demo seller.
  const { data: seller, error: sErr } = await db
    .from("seller_profiles")
    .select("user_id, display_name")
    .eq("username", SELLER_USERNAME)
    .single();
  if (sErr || !seller) throw new Error(`Seller '${SELLER_USERNAME}' not found: ${sErr?.message}`);
  const sellerId = seller.user_id;
  console.log(`Seller: ${seller.display_name} (${sellerId})`);

  // 2. Existing titles (idempotency) + existing image pool by category (guaranteed-good fallback).
  const { data: existing } = await db
    .from("listings")
    .select("id, title, category");
  const existingTitles = new Set((existing ?? []).map((l) => l.title));
  const catById = new Map((existing ?? []).map((l) => [l.id, l.category]));

  const { data: existingImgs } = await db
    .from("listing_images")
    .select("listing_id, url");
  const dbPool = { watches: [], bags: [], jewellery: [], shoes: [], other: [] };
  for (const img of existingImgs ?? []) {
    const cat = catById.get(img.listing_id);
    if (dbPool[cat]) dbPool[cat].push(img.url);
  }

  // 3. Verify candidate images; merge verified candidates with the DB pool.
  console.log("Verifying candidate images...");
  const pool = {};
  for (const cat of Object.keys(IMAGE_CANDIDATES)) {
    const checks = await Promise.all(
      IMAGE_CANDIDATES[cat].map(async (link) => ((await urlOk(link)) ? link : null)),
    );
    const verified = checks.filter(Boolean);
    pool[cat] = [...verified, ...(dbPool[cat] ?? [])];
    console.log(`  ${cat}: ${verified.length} verified + ${dbPool[cat]?.length ?? 0} from DB`);
    if (pool[cat].length === 0) pool[cat] = dbPool.bags; // last-ditch fallback
  }

  // 4. Insert listings + images.
  let added = 0, skipped = 0, imgCount = 0;
  let i = 0;
  for (const item of NEW_LISTINGS) {
    if (existingTitles.has(item.title)) { skipped++; i++; continue; }

    const { data: inserted, error: lErr } = await db
      .from("listings")
      .insert({
        seller_id: sellerId,
        auth_submission_id: null,
        title: item.title,
        brand: item.brand,
        category: item.category,
        gender: genderFor(item),
        model: item.model,
        description: item.description,
        condition: item.condition ?? CONDITIONS[i % CONDITIONS.length],
        price_cents: item.price,
        year: item.year,
        status: "active",
        fee_rate_bps: FEE_BPS,
        auth_method: item.method,
      })
      .select("id")
      .single();
    if (lErr) { console.error(`  ✗ ${item.title}: ${lErr.message}`); i++; continue; }

    // 2-3 category-matched images, rotated by index so listings don't all match.
    const catPool = pool[item.category] ?? pool.bags;
    const n = Math.min(3, Math.max(2, catPool.length));
    const rows = [];
    for (let k = 0; k < n; k++) {
      const link = catPool[(i * 2 + k) % catPool.length];
      rows.push({ listing_id: inserted.id, url: link, sort_order: k });
    }
    const { error: iErr } = await db.from("listing_images").insert(rows);
    if (iErr) console.error(`  ! images for ${item.title}: ${iErr.message}`);
    else imgCount += rows.length;

    added++; i++;
    console.log(`  ✓ ${item.title}  (R ${(item.price / 100).toLocaleString("en-ZA")})`);
  }

  const { count } = await db.from("listings").select("*", { count: "exact", head: true }).eq("status", "active");
  console.log(`\nAdded ${added} listings (${imgCount} images), skipped ${skipped} existing.`);
  console.log(`Active listings now: ${count}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
