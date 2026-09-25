module CalendarLinkHelper
  module_function

  def calendar_description(event)
    chunks = []
    chunks << event.description.to_s.strip if event.description.present?

    meeting_link = event.metadata.is_a?(Hash) ? event.metadata["meeting_link"].to_s.strip : ""
    chunks << "Meeting link: #{meeting_link}" if meeting_link.present?

    chunks.join("\n\n")
  end
end
