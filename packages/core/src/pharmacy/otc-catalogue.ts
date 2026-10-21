/**
 * Starter over-the-counter range for Care Bora Pharmacy.
 *
 * PRICES AND STOCK HERE ARE PLACEHOLDERS (rough Nairobi shelf prices, 50 in
 * stock) so every item can go on sale immediately; the pharmacy owner edits
 * them in Admin → Pharmacy to match what is actually in stock. Photos are
 * illustrative: where the exact pack has no free photo, one of the same
 * medicine is used, and items with no photo get the category tile.
 */
export type OtcItem = { name: string; generic?: string; category: string; form?: string; strength?: string; price: number; img?: string; description?: string };

export const CAT = {
  pain: "Pain & Fever", allergy: "Allergy", cold: "Cough, Cold & Flu", gut: "Digestive Health",
  skin: "Skin & Wound Care", worm: "Deworming", vit: "Vitamins & Supplements",
} as const;

const i = (name: string, category: string, price: number, o: Partial<OtcItem> = {}): OtcItem => ({ name, category, price, ...o });

export const OTC_STARTER: OtcItem[] = [
  // Pain & fever
  i("Panadol Extra", CAT.pain, 250, { generic: "Paracetamol + Caffeine", form: "tablet", strength: "500mg/65mg", description: "Pain and fever relief." }),
  i("Panadol Advance", CAT.pain, 200, { generic: "Paracetamol", form: "tablet", strength: "500mg", description: "Faster-acting pain and fever relief." }),
  i("Panadol ActiFast", CAT.pain, 220, { generic: "Paracetamol", form: "tablet", strength: "500mg", description: "Fast pain and fever relief." }),
  i("MaraMoL", CAT.pain, 120, { generic: "Paracetamol", form: "tablet", strength: "500mg", description: "Pain and fever relief." }),
  i("Adol", CAT.pain, 100, { generic: "Paracetamol", form: "tablet", strength: "500mg", description: "Pain and fever relief." }),
  i("Calpol Syrup", CAT.pain, 450, { generic: "Paracetamol", form: "suspension", strength: "120mg/5ml", description: "Paracetamol syrup for children's pain and fever." }),
  i("Brufen", CAT.pain, 350, { generic: "Ibuprofen", form: "tablet", strength: "400mg", img: "ibuprofen.jpg", description: "Pain, fever and inflammation." }),
  i("Ibugesic", CAT.pain, 300, { generic: "Ibuprofen", form: "syrup / tablet", img: "ibuprofen.jpg", description: "Ibuprofen for pain and fever, in syrup and tablets." }),
  i("Ibuprofen 400mg Tablets", CAT.pain, 250, { generic: "Ibuprofen", form: "tablet", strength: "400mg", img: "ibuprofen.jpg", description: "Pain, fever and inflammation." }),
  i("Deep Relief Gel", CAT.pain, 450, { generic: "Ibuprofen + Levomenthol", form: "gel", description: "Topical gel for muscle and joint pain." }),
  i("Disprin", CAT.pain, 150, { generic: "Aspirin", form: "soluble tablet", strength: "300mg", img: "aspirin.jpg", description: "Soluble aspirin for adult pain and fever." }),
  i("Solprin", CAT.pain, 150, { generic: "Aspirin", form: "soluble tablet", strength: "300mg", img: "aspirin.jpg", description: "Soluble aspirin for adult pain and fever." }),
  i("Mefenamic Acid 500mg", CAT.pain, 200, { generic: "Mefenamic Acid", form: "tablet", strength: "500mg", description: "Menstrual cramps and mild pain." }),
  i("Deep Heat Spray", CAT.pain, 650, { form: "spray", description: "Heat spray for muscular aches and pains." }),
  i("Deep Heat Cream", CAT.pain, 500, { form: "cream", description: "Warming rub for muscular aches and pains." }),
  i("Vicks VapoRub", CAT.pain, 250, { generic: "Menthol + Camphor", form: "ointment", img: "vicks-vaporub.jpg", description: "Menthol and camphor rub." }),
  i("Voltarol Emulgel", CAT.pain, 900, { generic: "Diclofenac", form: "gel", img: "diclofenac-gel.jpg", description: "Diclofenac gel for muscle and joint pain." }),
  i("Diclofenac Gel 1%", CAT.pain, 450, { generic: "Diclofenac", form: "gel", strength: "1%", img: "diclofenac-gel.jpg", description: "Topical pain relief for muscles and joints." }),
  // Allergy
  i("Zyrtec", CAT.allergy, 450, { generic: "Cetirizine", form: "tablet", strength: "10mg", img: "zyrtec.jpg", description: "Allergy relief." }),
  i("Cetrine", CAT.allergy, 200, { generic: "Cetirizine", form: "tablet", strength: "10mg", img: "zyrtec.jpg", description: "Allergy relief." }),
  i("Cetirizine 10mg Tablets", CAT.allergy, 150, { generic: "Cetirizine", form: "tablet", strength: "10mg", img: "zyrtec.jpg", description: "Allergy relief." }),
  i("Claritin", CAT.allergy, 450, { generic: "Loratadine", form: "tablet", strength: "10mg", img: "loratadine.jpg", description: "Non-drowsy allergy relief." }),
  i("LorFast", CAT.allergy, 250, { generic: "Loratadine", form: "tablet", strength: "10mg", img: "loratadine.jpg", description: "Non-drowsy allergy relief." }),
  i("Loratadine 10mg Tablets", CAT.allergy, 150, { generic: "Loratadine", form: "tablet", strength: "10mg", img: "loratadine.jpg", description: "Non-drowsy allergy relief." }),
  i("Piriton", CAT.allergy, 200, { generic: "Chlorpheniramine", form: "tablet", strength: "4mg", description: "Antihistamine for hay fever, rashes and itching." }),
  i("Histal", CAT.allergy, 250, { generic: "Chlorpheniramine", form: "syrup", description: "Antihistamine for allergy symptoms." }),
  i("Chlorpheniramine 4mg Tablets", CAT.allergy, 100, { generic: "Chlorpheniramine", form: "tablet", strength: "4mg", description: "Antihistamine for allergy symptoms." }),
  i("Allegra", CAT.allergy, 700, { generic: "Fexofenadine", form: "tablet", strength: "120mg", description: "Allergic rhinitis and hives." }),
  // Cough, cold & flu
  i("Actifed", CAT.cold, 400, { generic: "Triprolidine + Pseudoephedrine", form: "syrup / tablet", description: "Blocked nose and runny nose relief." }),
  i("Benylin Cold & Flu", CAT.cold, 550, { form: "syrup", description: "Cold and flu symptom relief." }),
  i("Benylin Wet Cough", CAT.cold, 550, { form: "syrup", img: "benylin.jpg", description: "Chesty cough expectorant." }),
  i("Benylin Dry Cough", CAT.cold, 550, { form: "syrup", img: "benylin.jpg", description: "Dry cough suppressant." }),
  i("Fludrex", CAT.cold, 250, { form: "tablet", description: "Cold and flu relief." }),
  i("Coldcap", CAT.cold, 150, { form: "capsule", description: "Cold and flu relief." }),
  i("Sinutab", CAT.cold, 450, { form: "tablet", description: "Sinus and nasal congestion relief." }),
  i("Panadol Cold & Flu", CAT.cold, 450, { form: "tablet", description: "Cold and flu relief." }),
  i("Ascoril Syrup", CAT.cold, 450, { form: "syrup", description: "Cough expectorant syrup." }),
  i("Bronchicum Cough Syrup", CAT.cold, 650, { form: "syrup", description: "Herbal cough syrup." }),
  i("Cough Syrup", CAT.cold, 300, { form: "syrup", img: "cough-syrup.jpg", description: "Everyday cough syrup." }),
  i("Strepsils Lozenges", CAT.cold, 300, { form: "lozenge", img: "strepsils.jpg", description: "Sore throat lozenges." }),
  i("Kaluma King Lozenges", CAT.cold, 100, { form: "lozenge", description: "Throat lozenges." }),
  i("Dequadin Lozenges", CAT.cold, 400, { form: "lozenge", description: "Antiseptic lozenges for mouth and throat infections." }),
  i("Chloraseptic Throat Spray", CAT.cold, 700, { form: "spray", description: "Sore throat relief spray." }),
  // Digestive
  i("Gaviscon", CAT.gut, 650, { form: "suspension", description: "Heartburn and acid reflux relief." }),
  i("Gelusil", CAT.gut, 150, { form: "chewable tablet", img: "antacid.jpg", description: "Antacid for heartburn and indigestion." }),
  i("Maalox", CAT.gut, 450, { form: "suspension", img: "antacid.jpg", description: "Antacid for heartburn and indigestion." }),
  i("Actal", CAT.gut, 250, { form: "chewable tablet", img: "antacid.jpg", description: "Antacid for heartburn and indigestion." }),
  i("Enos Fruit Salt", CAT.gut, 100, { form: "powder", description: "Effervescent antacid." }),
  i("Alka-Seltzer", CAT.gut, 350, { form: "effervescent tablet", img: "alka-seltzer.jpg", description: "Effervescent relief for heartburn, indigestion and aches." }),
  i("Famotidine 20mg", CAT.gut, 300, { generic: "Famotidine", form: "tablet", strength: "20mg", img: "famotidine.jpg", description: "Acid reduction for heartburn." }),
  i("Omeprazole 20mg Capsules", CAT.gut, 350, { generic: "Omeprazole", form: "capsule", strength: "20mg", img: "omeprazole.jpg", description: "Short-course acid reducer for heartburn." }),
  i("Imodium", CAT.gut, 500, { generic: "Loperamide", form: "capsule", strength: "2mg", img: "loperamide.jpg", description: "Fast relief from diarrhoea." }),
  i("Loperamide 2mg Capsules", CAT.gut, 200, { generic: "Loperamide", form: "capsule", strength: "2mg", img: "loperamide.jpg", description: "Relief from diarrhoea." }),
  i("Oral Rehydration Salts (ORS)", CAT.gut, 50, { form: "sachet", img: "ors-electral.jpg", description: "Replaces fluids and salts lost in diarrhoea." }),
  i("Zinc Sulphate 20mg Dispersible", CAT.gut, 150, { generic: "Zinc Sulphate", form: "dispersible tablet", strength: "20mg", img: "zinc.jpg", description: "Zinc supplement, used with ORS for diarrhoea." }),
  i("Dulcolax", CAT.gut, 350, { generic: "Bisacodyl", form: "tablet", strength: "5mg", description: "Relief from constipation." }),
  i("Lactulose Syrup", CAT.gut, 650, { generic: "Lactulose", form: "syrup", description: "Gentle laxative for constipation." }),
  i("Senna Tablets", CAT.gut, 200, { generic: "Senna", form: "tablet", description: "Stimulant laxative for constipation." }),
  i("Liquid Paraffin", CAT.gut, 250, { form: "liquid", img: "liquid-paraffin.jpg", description: "Stool softener." }),
  i("Simethicone", CAT.gut, 300, { generic: "Simethicone", form: "tablet", img: "simethicone.jpg", description: "Relief from gas and bloating." }),
  i("Activated Charcoal Tablets", CAT.gut, 250, { form: "tablet", description: "Relief from gas and bloating." }),
  // Skin & wound care
  i("Canesten Cream", CAT.skin, 650, { generic: "Clotrimazole", form: "cream", strength: "1%", img: "canesten.jpg", description: "Antifungal cream for athlete's foot, ringworm and thrush." }),
  i("Fungitrak Cream", CAT.skin, 300, { generic: "Clotrimazole", form: "cream", img: "clotrimazole.jpg", description: "Antifungal cream." }),
  i("Clotrimazole Cream 1%", CAT.skin, 250, { generic: "Clotrimazole", form: "cream", strength: "1%", img: "clotrimazole.jpg", description: "Antifungal cream." }),
  i("Ketoconazole Cream 2%", CAT.skin, 400, { generic: "Ketoconazole", form: "cream", strength: "2%", img: "nizoral.jpg", description: "Antifungal cream." }),
  i("Miconazole Cream 2%", CAT.skin, 350, { generic: "Miconazole", form: "cream", strength: "2%", img: "daktarin.jpg", description: "Antifungal cream." }),
  i("Dettol Antiseptic Liquid", CAT.skin, 450, { form: "liquid", img: "dettol.jpg", description: "Antiseptic disinfectant for cuts and household use." }),
  i("Savlon Antiseptic Cream", CAT.skin, 400, { form: "cream", img: "savlon-cream.jpg", description: "Antiseptic cream for minor cuts and grazes." }),
  i("Savlon Antiseptic Liquid", CAT.skin, 450, { form: "liquid", img: "savlon-liquid.jpg", description: "Antiseptic liquid for cleaning wounds." }),
  i("Hydrogen Peroxide 3%", CAT.skin, 150, { form: "solution", strength: "3%", description: "Wound cleaning solution." }),
  i("Betadine Antiseptic Solution", CAT.skin, 500, { generic: "Povidone-Iodine", form: "solution", img: "betadine.jpg", description: "Antiseptic for wounds and skin." }),
  i("Lipsore Cold Sore Cream", CAT.skin, 550, { generic: "Aciclovir", form: "cream", strength: "5%", description: "Cold sore treatment." }),
  i("Zinc Oxide Cream", CAT.skin, 250, { form: "cream", description: "Soothing barrier cream." }),
  i("Sudocrem", CAT.skin, 850, { form: "cream", img: "sudocrem.jpg", description: "Nappy rash and minor skin irritation." }),
  i("Vaseline Petroleum Jelly", CAT.skin, 250, { form: "jelly", description: "Skin protectant and moisturiser." }),
  // Deworming
  i("Zentel", CAT.worm, 300, { generic: "Albendazole", form: "tablet", strength: "400mg", description: "Treats intestinal worms." }),
  i("Wormicid", CAT.worm, 150, { generic: "Albendazole", form: "tablet", strength: "400mg", description: "Treats intestinal worms." }),
  i("Albendazole 400mg", CAT.worm, 150, { generic: "Albendazole", form: "tablet", strength: "400mg", description: "Treats intestinal worms." }),
  i("Vermox", CAT.worm, 350, { generic: "Mebendazole", form: "tablet", strength: "100mg", img: "mebendazole.jpg", description: "Treats intestinal worms." }),
  i("Mebendazole 100mg", CAT.worm, 150, { generic: "Mebendazole", form: "tablet", strength: "100mg", img: "mebendazole.jpg", description: "Treats intestinal worms." }),
  // Vitamins & supplements
  i("Abidec Multivitamin Drops", CAT.vit, 900, { form: "drops", description: "Multivitamin drops for babies and children." }),
  i("Seven Seas Cod Liver Oil", CAT.vit, 900, { form: "capsule", img: "cod-liver-oil.jpg", description: "Cod liver oil capsules." }),
  i("Pharmaton", CAT.vit, 1800, { form: "capsule", img: "multivitamin.jpg", description: "Multivitamin and mineral." }),
  i("Wellwoman", CAT.vit, 1500, { form: "capsule", img: "multivitamin.jpg", description: "Multivitamin for women." }),
  i("Wellman", CAT.vit, 1500, { form: "capsule", img: "multivitamin.jpg", description: "Multivitamin for men." }),
  i("Sanatogen", CAT.vit, 1200, { form: "tablet", img: "multivitamin.jpg", description: "Multivitamin and mineral." }),
  i("Vitamin C 500mg", CAT.vit, 300, { generic: "Ascorbic Acid", form: "tablet", strength: "500mg", img: "vitamin-c.jpg", description: "Vitamin C supplement." }),
  i("Vitamin D3", CAT.vit, 800, { generic: "Cholecalciferol", form: "capsule", description: "Vitamin D supplement." }),
  i("Calcium + Vitamin D3", CAT.vit, 900, { form: "tablet", img: "calcium.jpg", description: "Calcium and vitamin D supplement." }),
  i("Folic Acid 5mg", CAT.vit, 150, { generic: "Folic Acid", form: "tablet", strength: "5mg", description: "Folate supplement." }),
  i("Ferrous Sulphate 200mg", CAT.vit, 200, { generic: "Ferrous Sulphate", form: "tablet", strength: "200mg", description: "Iron supplement." }),
];
