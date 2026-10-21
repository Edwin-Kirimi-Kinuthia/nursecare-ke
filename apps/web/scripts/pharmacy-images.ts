/**
 * Attach product photos (apps/web/public/products) to drugs in the catalogue.
 *
 *   npm run pharmacy:images --workspace @carebora/web            # dry run: shows what would change
 *   npm run pharmacy:images --workspace @carebora/web -- --apply # writes it
 *   ... -- --apply --replace                                     # also overwrite photos already set
 *
 * A drug is matched when its name or generic name contains one of the keywords
 * (case-insensitive). Drugs that already have a photo are left alone unless
 * --replace is given. Photos are served as /products/<file>, so they need
 * deploying with the site. The script lists every drug it could not match, so the
 * catalogue and this list can be reconciled.
 */
import { db } from "@carebora/db";

const apply = process.argv.includes("--apply");
const replace = process.argv.includes("--replace");

/** keywords → photo. First rule that matches a drug wins, so put brand names before generics. */
const RULES: { keywords: string[]; file: string }[] = [
  { keywords: ["alka-seltzer", "alka seltzer"], file: "alka-seltzer.jpg" },
  { keywords: ["benylin"], file: "benylin.jpg" },
  { keywords: ["strepsils", "lozenge"], file: "strepsils.jpg" },
  { keywords: ["vicks", "vaporub", "menthol", "camphor"], file: "vicks-vaporub.jpg" },
  { keywords: ["diclofenac", "voltarol", "voltaren"], file: "diclofenac-gel.jpg" },
  { keywords: ["canesten"], file: "canesten.jpg" },
  { keywords: ["daktarin", "miconazole"], file: "daktarin.jpg" },
  { keywords: ["nizoral", "ketoconazole"], file: "nizoral.jpg" },
  { keywords: ["sudocrem"], file: "sudocrem.jpg" },
  { keywords: ["savlon liquid", "savlon antiseptic liquid"], file: "savlon-liquid.jpg" },
  { keywords: ["savlon"], file: "savlon-cream.jpg" },
  { keywords: ["dettol"], file: "dettol.jpg" },
  { keywords: ["betadine", "povidone"], file: "betadine.jpg" },
  { keywords: ["zyrtec", "cetirizine", "cetrine"], file: "zyrtec.jpg" },
  { keywords: ["loratadine", "claritin", "lorfast"], file: "loratadine.jpg" },
  { keywords: ["imodium", "loperamide"], file: "loperamide.jpg" },
  { keywords: ["famotidine"], file: "famotidine.jpg" },
  { keywords: ["simethicone", "infacol", "gas-x"], file: "simethicone.jpg" },
  { keywords: ["gelusil", "maalox", "actal", "antacid", "tums"], file: "antacid.jpg" },
  { keywords: ["oral rehydration", "ors"], file: "ors-electral.jpg" },
  { keywords: ["liquid paraffin", "mineral oil"], file: "liquid-paraffin.jpg" },
  { keywords: ["mebendazole", "vermox"], file: "mebendazole.jpg" },
  { keywords: ["cod liver", "seven seas"], file: "cod-liver-oil.jpg" },
  { keywords: ["multivitamin", "pharmaton", "wellwoman", "wellman", "sanatogen"], file: "multivitamin.jpg" },
  { keywords: ["calcium"], file: "calcium.jpg" },
  { keywords: ["aspirin", "disprin", "solprin"], file: "aspirin.jpg" },
  { keywords: ["cough syrup", "cough mixture", "ascoril", "bronchicum"], file: "cough-syrup.jpg" },
];

const norm = (s: string) => s.toLowerCase();

async function main() {
  const drugs = await db.drug.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  let changed = 0;
  const unmatched: string[] = [];
  for (const d of drugs) {
    const hay = norm(`${d.name} ${d.genericName ?? ""}`);
    const rule = RULES.find((r) => r.keywords.some((k) => hay.includes(k)));
    if (!rule) { if (!d.imageUrl) unmatched.push(d.name); continue; }
    const url = `/products/${rule.file}`;
    if (d.imageUrl && !replace) { console.log(`keep    ${d.name}  (already has a photo)`); continue; }
    if (d.imageUrl === url) continue;
    console.log(`${apply ? "set " : "would set "} ${d.name}  ->  ${url}`);
    if (apply) await db.drug.update({ where: { id: d.id }, data: { imageUrl: url, images: [url] } });
    changed++;
  }
  console.log(`\n${changed} drug(s) ${apply ? "updated" : "would be updated"}.${apply ? "" : " Re-run with --apply to save."}`);
  if (unmatched.length) console.log(`\nNo photo available for ${unmatched.length} drug(s) without one:\n  ${unmatched.join("\n  ")}`);
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
