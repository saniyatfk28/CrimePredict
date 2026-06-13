// Small dev helper: seed a tiny sample dataset into localStorage
// so dropdowns show up immediately in development.

const SAMPLE_KEY = "crimepredict_dataset";

const SAMPLE_DATA = [
  {
    incident_district: "Dhaka",
    incident_type: "assault",
    incident_place: "Dhanmondi",
    incident_date: "2024-11-01",
    latitude: 23.7465,
    longitude: 90.3760
  },
  {
    incident_district: "Dhaka",
    incident_type: "theft",
    incident_place: "Gulshan",
    incident_date: "2024-11-03",
    latitude: 23.7925,
    longitude: 90.4074
  },
  {
    incident_district: "Chattogram",
    incident_type: "robbery",
    incident_place: "Pahartali",
    incident_date: "2024-10-21",
    latitude: 22.3569,
    longitude: 91.7832
  },
  {
    incident_district: "Sylhet",
    incident_type: "assault",
    incident_place: "Zindabazar",
    incident_date: "2024-09-11",
    latitude: 24.8949,
    longitude: 91.8687
  }
];

export function seedDatasetIfEmpty() {
  try {
    const existing = localStorage.getItem(SAMPLE_KEY);
    if (!existing) {
      localStorage.setItem(SAMPLE_KEY, JSON.stringify(SAMPLE_DATA));
      // also expose a quick flag for dev consoles
      console.info("[seedDataset] Sample dataset written to localStorage key:", SAMPLE_KEY);
    }
  } catch (err) {
    console.warn("[seedDataset] could not seed dataset:", err);
  }
}
