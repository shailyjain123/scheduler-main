export interface AvailabilitySlot {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
  timezone?: string;
}

export interface DateOverride {
  id?: number;
  date: string;
  is_unavailable: boolean;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
  timezone?: string;
}

export interface Schedule {
  id: number;
  name: string;
  is_default: boolean;
  availability_slots: AvailabilitySlot[];
  date_overrides: DateOverride[];
}
