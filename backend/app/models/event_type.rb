class EventType < ApplicationRecord
  belongs_to :user
  has_many :events, dependent: :destroy

  enum :kind, { one_on_one: 0, group: 1 }, prefix: true

  before_validation :normalize_title

  validates :title, presence: true, length: { minimum: 3, maximum: 50 }
  validates :duration, presence: true, numericality: { greater_than: 0 }
  validates :location, presence: true
  validates :kind, presence: true
  validates :max_participants, presence: true, numericality: { greater_than_or_equal_to: 1 }

  def bookings_count
    events_count
  end

  def conversion_rate
    return 0 if events_count.zero?
    completed = events.where(status: "completed").count
    ((completed.to_f / events_count) * 100).round(1)
  end

  def revenue
    0
  end

  def canceled_count
    events.where(status: "cancelled").count
  end

  def upcoming_count
    events.where(status: "scheduled").where("start_time > ?", Time.current).count
  end


  private

  def normalize_title
    self.title = title.to_s.strip
  end
end
