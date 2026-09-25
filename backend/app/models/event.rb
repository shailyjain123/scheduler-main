class Event < ApplicationRecord
  # Associations
  belongs_to :user
  belongs_to :event_type, counter_cache: true
  belongs_to :rescheduled_from_event, class_name: 'Event', optional: true, foreign_key: :rescheduled_from_event_id
  belongs_to :rescheduled_to_event, class_name: 'Event', optional: true, foreign_key: :rescheduled_to_event_id

  has_many :event_invitees, dependent: :destroy
  has_many :invitee_notification_logs, dependent: :destroy
  has_many :reminders, dependent: :destroy

  # Validations
  validates :title, presence: true
  validates :start_time, presence: true
  validates :end_time, presence: true
  validate :end_time_after_start_time
  validate :validate_availability, if: :requires_availability_validation?
  validate :cancelled_events_cannot_be_rescheduled, on: :update
  validate :validate_phone_location

  # Status constants
  STATUSES = %w[scheduled completed cancelled no-shows].freeze
  validates :status, inclusion: { in: STATUSES }

  # Source constants
  EVENT_SOURCES = %w[host_created guest_booking].freeze
  validates :event_source, inclusion: { in: EVENT_SOURCES }

  validates :booking_uid, presence: true, uniqueness: true, on: :update

  # Management Token System
  attr_accessor :management_token

  before_validation :ensure_booking_uid, on: :create
  before_validation :generate_management_token, on: :create

  def self.find_by_management_link(uid, raw_token = nil)
    # 1. If we only have one param, treat it as a token (new unified flow)
    if raw_token.nil?
      token_digest = Digest::SHA256.hexdigest(uid)
      return find_by(manage_token_digest: token_digest)
    end

    # 2. Legacy UID + Token flow
    event = find_by(booking_uid: uid)
    return nil unless event
    return nil if event.manage_token_digest.blank?

    is_valid = ActiveSupport::SecurityUtils.secure_compare(
      Digest::SHA256.hexdigest(raw_token),
      event.manage_token_digest
    )

    is_valid ? event : nil
  end

  private

  def validate_availability
    res = Availability::ValidationService.call(
      user: user,
      event_type: event_type,
      start_time: start_time,
      end_time: end_time,
      current_event_id: id
    )

    return if res[:success]

    res[:errors].each do |msg|
      if msg.include?("Minimum notice")
        errors.add(:start_time, msg)
      elsif msg.include?("far in the future")
        errors.add(:start_time, msg)
      elsif msg.include?("daily limit")
        errors.add(:base, msg)
      elsif msg.include?("outside your availability")
        errors.add(:base, msg)
      elsif msg.include?("conflicts with an existing event")
        errors.add(:base, msg)
      elsif msg.include?("maximum capacity")
        errors.add(:base, msg)
      else
        errors.add(:base, msg)
      end
    end
  end

  # The following methods are now handled by Availability::ValidationService

  def cancelled_events_cannot_be_rescheduled
    return unless status_in_database == "cancelled"

    status_changed_to_non_cancelled = will_save_change_to_status? && status != "cancelled"
    time_changed = will_save_change_to_start_time? || will_save_change_to_end_time?
    return unless status_changed_to_non_cancelled || time_changed

    can_restore = will_save_change_to_status? && status == "scheduled" && !time_changed && end_time.present? && end_time > Time.current
    return if can_restore

    errors.add(:base, "Cancelled events cannot be rescheduled")
  end

  def validate_phone_location
    return unless location.to_s.include?("+") || title.to_s.downcase.include?("phone")

    # Simple check if location is a phone number
    return unless location.to_s.match?(/\A\+?[0-9\s\-()]+\z/)

    unless Phonelib.valid?(location)
      errors.add(:location, "is an invalid phone number")
    end
  end

  def end_time_after_start_time
    return if end_time.blank? || start_time.blank?

    if end_time <= start_time
      errors.add(:end_time, "must be after the start time")
    end
  end

  def requires_availability_validation?
    user.present? && start_time.present? && end_time.present? && status.to_s == "scheduled"
  end

  private

  def ensure_booking_uid
    self.booking_uid ||= SecureRandom.uuid
  end

  def generate_management_token
    return if manage_token_digest.present? || @management_token.present?

    token = SecureRandom.hex(32)
    @management_token = token
    self.manage_token_digest = Digest::SHA256.hexdigest(token)
  end
end
