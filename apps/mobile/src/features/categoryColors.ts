/** Same category colours as the website's product cards. */
const CATEGORY: Record<string, [string, string]> = {
  "Pain Relief": ["#FB7185", "#FB923C"], Gastrointestinal: ["#2DD4BF", "#06B6D4"], Supplements: ["#34D399", "#22C55E"],
  Dermatology: ["#FBBF24", "#EAB308"], ENT: ["#38BDF8", "#3B82F6"], Antibiotics: ["#818CF8", "#8B5CF6"],
  Diabetes: ["#E879F9", "#A855F7"], Cardiovascular: ["#F87171", "#F43F5E"], Respiratory: ["#22D3EE", "#14B8A6"],
};
export const categoryColors = (c: string): [string, string] => CATEGORY[c] ?? ["#94A3B8", "#64748B"];

