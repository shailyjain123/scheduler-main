class EventSerializer
  def initialize(event)
    @event = event
  end

  def as_json
    {
      id: @event.id,
      title: @event.title,
      description: @event.description,
      location: serialized_location,
      meeting_link: serialized_meeting_link,
      start_time: @event.start_time&.utc&.iso8601,
      end_time: @event.end_time&.utc&.iso8601,
      status: @event.status,
      rescheduled: rescheduled?,
      previous_start_time: previous_start_time,
      attendees: serialized_attendees,
      user_id: @event.user_id,
      organizer: serialized_organizer,
      event_type_id: @event.event_type_id,
      created_at: @event.created_at.utc.iso8601
    }
  end

  private

  def serialized_organizer
    {
      name: @event.user.full_name.presence || @event.user.email.split("@").first,
      email: @event.user.email,
      avatar_url: @event.user.avatar_url
    }
  end

  def serialized_attendees
    raw_attendees = Array(@event.metadata&.[]("attendees")) + Array(@event.metadata&.[]("guests"))

    @event.event_invitees.each do |invitee|
      raw_attendees << { "name" => invitee.name, "email" => invitee.email }
    end

    seen = {}
    raw_attendees.filter_map do |entry|
      attendee = normalize_attendee(entry)
      next if attendee.nil?

      key = attendee["email"].downcase
      next if seen[key]

      seen[key] = true
      attendee
    end
  end

  def normalize_attendee(entry)
    case entry
    when String
      email = entry.strip
      return nil if email.blank?

      {
        "name" => email.split("@").first,
        "email" => email
      }
    when Hash
      email = extract_hash_value(entry, "email") || extract_hash_value(entry, "address")
      name = extract_hash_value(entry, "name") || extract_hash_value(entry, "displayName")

      nested_email = entry["emailAddress"] || entry[:emailAddress]
      if nested_email.is_a?(Hash)
        email ||= extract_hash_value(nested_email, "address")
        name ||= extract_hash_value(nested_email, "name")
      end

      return nil if email.blank?

      attendee = {
        "name" => (name.presence || email.split("@").first),
        "email" => email
      }

      avatar = extract_hash_value(entry, "avatar_url") || extract_hash_value(entry, "avatar") || extract_hash_value(entry, "image_url")
      attendee["avatar_url"] = avatar if avatar.present?
      attendee

    else
      nil
    end
  end

  def extract_hash_value(hash, key)
    value = hash[key] || hash[key.to_sym]
    value.to_s.strip.presence
  end

  def serialized_location
    raw_location = @event.location.to_s.strip
    metadata = @event.metadata || {}

    return metadata["meeting_link"].to_s.strip if raw_location.blank? && metadata["meeting_link"].present?
    return metadata["in_person_location"].to_s.strip if raw_location.casecmp("offline (in-person meeting)").zero? && metadata["in_person_location"].present?
    return metadata["invitee_phone"].to_s.strip if raw_location.casecmp("phone call").zero? && metadata["invitee_phone"].present?

    raw_location
  end

  def serialized_meeting_link
    metadata = @event.metadata || {}

    candidate = metadata["meeting_link"] || metadata["conference_link"] || metadata["join_url"]
    value = candidate.to_s.strip
    return nil if value.blank?

    value
  end

  def rescheduled?
    metadata = @event.metadata || {}
    ActiveModel::Type::Boolean.new.cast(metadata["rescheduled"]) || metadata["previous_start_time"].present?
  end

  def previous_start_time
    metadata = @event.metadata || {}
    value = metadata["previous_start_time"].to_s.strip
    value.presence
  end
end
