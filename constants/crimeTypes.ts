// Crime types from Bangladesh Crime Dataset
export const CRIME_TYPES = [
  'assault',
  'bodyfound',
  'kidnap',
  'murder',
  'rape',
  'robbery'
] as const;

export type CrimeType = typeof CRIME_TYPES[number];

// Crime type descriptions
export const CRIME_TYPE_DESCRIPTIONS: Record<CrimeType, string> = {
  assault: 'Physical attack or threatening behavior',
  bodyfound: 'Discovery of deceased person',
  kidnap: 'Unlawful confinement or abduction',
  murder: 'Unlawful killing of a person',
  rape: 'Sexual assault or violation',
  robbery: 'Theft with force or intimidation'
};

// Crime severity levels
export const CRIME_SEVERITY: Record<CrimeType, 'high' | 'medium' | 'low'> = {
  murder: 'high',
  rape: 'high',
  kidnap: 'high',
  robbery: 'high',
  assault: 'medium',
  bodyfound: 'medium'
};

// Crime type colors for visualization
export const CRIME_TYPE_COLORS: Record<CrimeType, string> = {
  murder: '#dc3545',      // Red
  rape: '#c71c7c',        // Dark pink
  kidnap: '#fd7e14',      // Orange
  robbery: '#ffc107',     // Amber
  assault: '#17a2b8',     // Cyan
  bodyfound: '#6c757d'    // Gray
};
