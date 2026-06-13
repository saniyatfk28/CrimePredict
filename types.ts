
export enum UserRole {
  ADMIN = 'ADMIN',
  PUBLIC = 'PUBLIC',
  LAW_ENFORCEMENT = 'LAW_ENFORCEMENT'
}

export enum CrimeType {
  ASSAULT = 'assault',
  BODYFOUND = 'bodyfound',
  KIDNAP = 'kidnap',
  MURDER = 'murder',
  RAPE = 'rape',
  ROBBERY = 'robbery'
}

export interface User {
  username: string;
  role: UserRole;
  fullName: string;
  id: string;
}

export interface WidgetConfig {
  id: string;
  title: string;
  isVisible: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface CitizenTip {
  id: string;
  location: string;
  crimeType: string;
  description: string;
  timestamp: string;
}

export type UrgencyLevel = 'Low' | 'Medium' | 'High';

export type ReportStatus = 'Submitted' | 'In Progress' | 'Completed';

export interface CitizenReport {
  reportId: string;
  reporterUsername: string;
  reporterName: string;
  reporterEmail: string;
  location: string;
  crimeType: string;
  incidentDateTime: string;
  description: string;
  urgency: UrgencyLevel;
  status: ReportStatus;
  createdAt: string;
  photo?: string; // optional data URL or backend path
}
