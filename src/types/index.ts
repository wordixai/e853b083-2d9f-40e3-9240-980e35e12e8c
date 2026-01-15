export interface EmergencyContact {
  id: string;
  name: string;
  email: string;
}

export interface CheckinRecord {
  date: string;
  timestamp: number;
}

export interface UserData {
  contacts: EmergencyContact[];
  checkins: CheckinRecord[];
  lastCheckin: string | null;
}
