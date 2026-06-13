import { BANGLADESH_DISTRICTS } from "../constants/bangladeshDistricts";

export type CrimeRecord = Record<string, any>;

const DATASET_KEY = "crimepredict_dataset";

// Normalize common column name chaos
const pick = (obj: any, keys: string[]) => {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null && String(obj[k]).trim() !== "") return obj[k];
  }
  return undefined;
};

export function loadDataset(): CrimeRecord[] {
  try {
    const raw = localStorage.getItem(DATASET_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeRecord(r: CrimeRecord) {
  const districtRaw = pick(r, ["district", "District", "DISTRICT", "area", "Area", "location", "Location", "incident_district", "incident_district"]);
  const crimeTypeRaw = pick(r, ["crime_type", "Crime Type", "crimeType", "type", "Type", "incident", "Incident", "incident_type", "crime"]);
  const dateRaw = pick(r, ["date", "Date", "incident_date", "Incident Date", "datetime", "time", "Time"]);

  const latRaw = pick(r, ["lat", "Lat", "latitude", "Latitude"]);
  const lngRaw = pick(r, ["lng", "Lng", "lon", "Lon", "longitude", "Longitude"]);

  const district = typeof districtRaw === "string" ? districtRaw.trim() : (districtRaw ? String(districtRaw) : "");
  const crimeType = typeof crimeTypeRaw === "string" ? crimeTypeRaw.trim().toLowerCase() : (crimeTypeRaw ? String(crimeTypeRaw).trim().toLowerCase() : "unknown");
  const date = dateRaw ? String(dateRaw) : "";

  const lat = latRaw !== undefined ? Number(latRaw) : undefined;
  const lng = lngRaw !== undefined ? Number(lngRaw) : undefined;

  return { district, crimeType, date, lat, lng, raw: r };
}

export function getDistrictOptions(records: CrimeRecord[]) {
  // Try dataset first
  const set = new Set<string>();
  for (const r of records) {
    const n = normalizeRecord(r);
    if (n.district) set.add(titleCase(n.district));
  }

  // If dataset gives nothing, show all BD districts (fallback)
  const fromDataset = [...set].sort();
  return fromDataset.length ? fromDataset : BANGLADESH_DISTRICTS;
}

export function getCrimeTypeOptions(records: CrimeRecord[]) {
  const set = new Set<string>(["theft","robbery","assault","rape","murder","bodyfound","kidnap","unknown"]);
  for (const r of records) {
    const n = normalizeRecord(r);
    if (n.crimeType) set.add(n.crimeType);
  }
  // Add "other" choice explicitly
  return [...set].filter(Boolean).sort().concat(["other"]);
}

export function computeDistrictStats(records: CrimeRecord[], district: string) {
  const districtNorm = district.trim().toLowerCase();
  const filtered = records
    .map(normalizeRecord)
    .filter(r => r.district && r.district.trim().toLowerCase() === districtNorm);

  const total = filtered.length;

  const counts: Record<string, number> = {};
  for (const r of filtered) {
    const ct = r.crimeType || "unknown";
    counts[ct] = (counts[ct] || 0) + 1;
  }

  const topTypes = Object.entries(counts)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type,count]) => ({ type, count }));

  const risk =
    total >= 500 ? "High" :
    total >= 200 ? "Medium" :
    total >= 50  ? "Low" :
    "Very Low";

  const mostCommonType = topTypes[0]?.type || "unknown";

  return { total, topTypes, risk, mostCommonType };
}

export function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(w => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}
