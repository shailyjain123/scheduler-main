module Notifications
  class CreateService
    Result = Struct.new(:success?, :notification, :grouped, :errors, keyword_init: true)

    def self.call(user:, event_name:, category:, title:, description:, notification_type: nil, priority: "normal", action_url: nil, metadata: {}, group_key: nil, group_window: 30.minutes)
      new(
        user: user,
        event_name: event_name,
        category: category,
        title: title,
        description: description,
        notification_type: notification_type,
        priority: priority,
        action_url: action_url,
        metadata: metadata,
        group_key: group_key,
        group_window: group_window
      ).call
    end

    def initialize(user:, event_name:, category:, title:, description:, notification_type:, priority:, action_url:, metadata:, group_key:, group_window:)
      @user = user
      @event_name = event_name
      @category = category
      @title = normalize_text(title)
      @description = normalize_text(description)
      @notification_type = notification_type || category
      @priority = priority
      @action_url = action_url
      @metadata = metadata.is_a?(Hash) ? metadata : {}
      @group_key = group_key.to_s.presence
      @group_window = group_window || 30.minutes
    end

    def call
      return Result.new(success?: false, errors: [ "User is required" ]) if @user.blank?

      apply_daily_digest_mode!
      apply_message_defaults!

      notification = nil
      grouped = false

      ActiveRecord::Base.transaction do
        notification = find_group_candidate

        if notification.present?
          grouped = true
          grouped_count = notification.grouped_count.to_i + 1
          notification.update!(
            title: @title,
            description: grouped_description(grouped_count),
            metadata: merged_metadata(notification.metadata),
            action_url: @action_url || notification.action_url,
            last_occurred_at: Time.current,
            grouped_count: grouped_count,
            priority: @priority,
            event_name: @event_name,
            notification_type: @notification_type,
            category: @category
          )
        else
          notification = @user.notifications.create!(
            notification_type: @notification_type,
            category: @category,
            event_name: @event_name,
            title: @title,
            description: @description,
            metadata: @metadata,
            priority: @priority,
            action_url: @action_url,
            group_key: @group_key,
            grouped_count: 1,
            last_occurred_at: Time.current
          )
        end
      end

      # Inserts are already published by Notification after_create_commit.
      # Grouped updates do not insert a row, so publish that transition explicitly.
      if grouped
        Notifications::BroadcastService.call(
          user: @user,
          notification: notification,
          event: "notification.grouped"
        )
      end

      Result.new(success?: true, notification: notification, grouped: grouped)
    rescue ActiveRecord::RecordInvalid => e
      Result.new(success?: false, errors: [ e.record.errors.full_messages.to_sentence.presence || e.message ])
    end

    private

    def find_group_candidate
      return nil if @group_key.blank?

      @user.notifications
        .where(group_key: @group_key, read_at: nil)
        .where("last_occurred_at >= ?", Time.current - @group_window)
        .order(last_occurred_at: :desc)
        .first
    end

    def merged_metadata(previous_metadata)
      existing = previous_metadata.is_a?(Hash) ? previous_metadata : {}
      existing.merge(@metadata)
    end

    def grouped_description(count)
      @description
    end

    def apply_message_defaults!
      @title = category_default_title if @title.blank?
      @description = category_default_description if @description.blank?
    end

    def category_default_title
      case @category.to_s
      when "meetings"
        "Meeting update"
      when "integrations"
        "Integration update"
      when "onboarding"
        "Onboarding update"
      when "contacts"
        "Contact update"
      else
        "Notification"
      end
    end

    def category_default_description
      case @category.to_s
      when "meetings"
        "There is an update related to one of your meetings."
      when "integrations"
        "There is an update related to one of your integrations."
      when "onboarding"
        "There is an update related to your onboarding setup."
      when "contacts"
        "There is an update related to your contacts."
      else
        "There is a new update in your workspace."
      end
    end

    def normalize_text(value)
      value.to_s.strip.gsub(/\s+/, " ")
    end

    def apply_daily_digest_mode!
      return unless daily_digest_enabled?
      return if @priority == "high"

      @group_key = @group_key.presence || "daily-digest:#{Date.current.iso8601}:#{@category}"
      @event_name = "daily.digest"
      @notification_type = "insight"
      @title = "Daily digest"
      @description = "You have new #{@category.humanize.downcase} updates today."
      @action_url ||= "/notifications"
    end

    def daily_digest_enabled?
      settings = @user.user_setting
      return false if settings.blank?

      config = settings.push_notifications_config
      return false unless config.is_a?(Hash)

      ActiveModel::Type::Boolean.new.cast(config["daily_digest"] || config[:daily_digest])
    end
  end
end
