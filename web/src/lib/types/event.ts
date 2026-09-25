export interface Attendee {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}


export interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  meeting_link?: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-shows';
  rescheduled?: boolean;
  previous_start_time?: string | null;
  color_theme?: string;
  user_id: number;
  organizer: {
    name: string;
    email: string;
    avatar_url?: string;
  };
  attendees: Attendee[];
}

export type EventsResponse = Event[];

export interface EventType {
  id?: number;
  title: string;
  duration: number;
  location: string;
  description: string;
  availability?: {
    slots: {
      id?: number;
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_active?: boolean;
      timezone?: string;
    }[];
  };
  is_active?: boolean;
  kind?: 'one_on_one' | 'group';
  max_participants?: number;
  created_at?: string;
  bookings_count?: number;
  conversion_rate?: number;
  revenue?: number;
  canceled_count?: number;
  upcoming_count?: number;
  [key: string]: unknown;
}
