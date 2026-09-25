# app/services/concerns/advisory_lock.rb
module AdvisoryLock
  extend ActiveSupport::Concern

  def with_slot_lock(user_id, start_time)
    # Generate a unique 64-bit key for the (user, slot) combination
    # We shift the user_id by 32 bits and OR it with the unix timestamp of the slot
    # This ensures that locks for different slots or different users do not conflict
    key = (user_id.to_i << 32) | start_time.to_i
    
    ActiveRecord::Base.connection.execute("SELECT pg_advisory_xact_lock(#{key})")
    
    yield if block_given?
  end
end
