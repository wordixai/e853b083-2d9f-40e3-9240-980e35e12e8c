export interface User {
  id: string;
  device_id: string;
  created_at: string;
  updated_at: string;
}

export interface CheckinRecord {
  id: string;
  user_id: string;
  date: string;
  checked_at: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
}

// Legacy types for compatibility
export interface UserData {
  contacts: EmergencyContact[];
  checkins: CheckinRecord[];
  lastCheckin: string | null;
}
