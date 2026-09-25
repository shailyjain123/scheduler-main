import {
  projectBookingSlots,
  projectSelectedTimeToHost,
} from '../timezone';

describe('booking timezone projection', () => {
  it('reprojects slots into the selected timezone and preserves host timestamps for saving', () => {
    const projected = projectBookingSlots(
      [
        {
          date: 'Wed Apr 29 2026',
          start_time: '2026-04-29T23:30:00-04:00',
          end_time: '2026-04-30T00:30:00-04:00',
          label: '11:30pm - 12:30am',
          available: true,
        },
      ],
      'America/New_York',
      'Asia/Tokyo',
    );

    expect(projected).toHaveLength(1);
    expect(projected[0].date).toBe('Thu Apr 30 2026');
    expect(projected[0].label).toBe('12:30pm - 1:30pm');
    expect(projectSelectedTimeToHost(projected[0].start_time, 'America/New_York')).toBe(projected[0].host_start_time);
  });
});