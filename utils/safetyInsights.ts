export const DATASET_DB_KEY = "crimepredict_dataset";

export type CrimeRow = Record<string, any>;

export type Insight = {
  district: string;
  total: number;
  topCrimeTypes: { type: string; count: number }[];
  riskLevel: "Low" | "Medium" | "High";
};

const pick = (row: any, keys: string[]) => {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
};

export const loadDatasetRows = (): CrimeRow[] => {
  try {
    const raw = localStorage.getItem(DATASET_DB_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getDistrictFromRow = (row: any) =>
  String(pick(row, ["district", "District", "DISTRICT"])).trim();

export const getCrimeTypeFromRow = (row: any) =>
  String(
    pick(row, ["type", "Type", "crime_type", "crimeType", "CrimeType", "crime", "Crime"])
  ).trim();

export const computeDistrictInsight = (district: string, rows: CrimeRow[]): Insight => {
  const districtNorm = district.trim().toLowerCase();

  const filtered = rows.filter((r) => {
    const d = getDistrictFromRow(r).toLowerCase();
    return d === districtNorm;
  });

  const freq: Record<string, number> = {};
  for (const r of filtered) {
    const t = getCrimeTypeFromRow(r) || "Unknown";
    freq[t] = (freq[t] || 0) + 1;
  }

  const topCrimeTypes = Object.entries(freq)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const total = filtered.length;

  // simple risk level heuristic
  const riskLevel: Insight["riskLevel"] =
    total >= 500 ? "High" : total >= 150 ? "Medium" : "Low";

  return { district, total, topCrimeTypes, riskLevel };
};

export const getTopDistricts = (rows: CrimeRow[], limit = 5) => {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const d = getDistrictFromRow(r);
    if (!d) continue;
    counts[d] = (counts[d] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([district, total]) => ({ district, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
};