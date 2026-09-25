# backend/scratch/test_timezone_shift.rb
# Run with: rails runner backend/scratch/test_timezone_shift.rb

user = User.first
unless user
  puts "No user found"
  exit
end

# Set user timezone to IST
user.update!(timezone: "Asia/Kolkata")

# Clear existing schedules
user.availability_schedules.destroy_all

# Create a schedule for Monday 9-5 in IST
schedule = user.availability_schedules.create!(
  day_of_week: 1, # Monday
  start_time: "09:00",
  end_time: "17:00",
  timezone: "Asia/Kolkata",
  is_active: true
)

puts "Initial state:"
puts "User timezone: #{user.timezone}"
puts "Schedule: #{schedule.start_time.strftime('%H:%M')} - #{schedule.end_time.strftime('%H:%M')} (#{schedule.timezone})"

# Mock an event type
event_type = user.event_types.first || user.event_types.create!(title: "Test", duration: 60, is_active: true)
event_type.update!(availability: {}, minimum_notice_value: 0)

# Ensure no minimum notice
user.user_setting&.update!(minimum_notice_value: 0)

# Next Monday + 7 days to be safe
next_monday = Date.today.next_occurring(:monday) + 7.days

def check_slots(event_type, date, label)
  service = Slots::PublicAvailabilityService.new(
    event_type: event_type,
    timezone: "UTC", # Guest wants UTC
    start_date: date,
    end_date: date
  )
  result = service.call
  puts "\n#{label}:"
  if result.available_slots.any?
    first = result.available_slots.first
    last = result.available_slots.last
    puts "First slot: #{first[:start_time]} (#{first[:label]})"
    puts "Last slot: #{last[:start_time]} (#{last[:label]})"
  else
    puts "No slots found"
  end
end

check_slots(event_type, next_monday, "Guest viewing in UTC while host is IST")

# CHANGE USER TIMEZONE to UTC
puts "\n--- Changing user timezone to UTC ---"
user.update!(timezone: "UTC")

check_slots(event_type, next_monday, "Guest viewing in UTC while host is now UTC (expecting shift if bug exists)")

# EXPECTED: 
# IST 9:00 is UTC 03:30.
# If bug exists: Second check will show first slot at 09:00 UTC (which is 14:30 IST).
