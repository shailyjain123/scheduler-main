export interface AppointmentsOverviewItem {
  date: string;
  scheduled: number;
  completed: number;
  cancelled: number;
  no_shows: number;
}

export interface AppointmentsStatusItem {
  name: string;
  value: number;
}

export interface DashboardStats {
  totalBookings: number;
  conversionRate: number;
  noShowRate: number;
  revenue: number;
  upcomingCalls: number;
  appointmentsOverview?: AppointmentsOverviewItem[];
  appointmentsByStatus?: AppointmentsStatusItem[];
}
