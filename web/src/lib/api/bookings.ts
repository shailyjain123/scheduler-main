import { apiClient, ApiResponse } from './client';

export interface PublicBookingDetails {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  status: string;
  host_name: string;
  guest_name: string;
  guest_email: string;
  event_type: {
    id: number;
    title: string;
    duration: number;
  };
}

export const bookingsApi = {
  getPublicBooking: (token: string) => 
    apiClient.get<PublicBookingDetails>(`/public/bookings/${token}`),
    
  cancelPublicBooking: (token: string) => 
    apiClient.post(`/public/bookings/${token}/cancel`),
    
  reschedulePublicBooking: (token: string, data: { start_time: string; timezone: string }) => 
    apiClient.post(`/public/bookings/${token}/reschedule`, data),

  // Unified Management (New)
  getManagement: (token: string) => 
    apiClient.get<PublicBookingDetails>(`/public/bookings/manage/${token}`),
    
  cancelManagement: (token: string, reason?: string) => 
    apiClient.post(`/public/bookings/manage/${token}/cancel`, { reason }),
    
  rescheduleManagement: (token: string, data: { start_time: string; timezone: string }) => 
    apiClient.post(`/public/bookings/manage/${token}/reschedule`, data),

  // Production-grade Management (Legacy UID + Token)
  getBookingManagement: (uid: string, token: string) => 
    apiClient.get<PublicBookingDetails>(`/public/bookings_management/${uid}?token=${token}`),
    
  cancelBookingManagement: (uid: string, token: string, reason?: string) => 
    apiClient.post(`/public/bookings_management/${uid}/cancel`, { legacy_token: token, reason }),
    
  rescheduleBookingManagement: (uid: string, token: string, data: { start_time: string; timezone: string }) => 
    apiClient.post(`/public/bookings_management/${uid}/reschedule`, { ...data, legacy_token: token }),
};
