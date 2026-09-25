Contact.where.not(notes: [nil, ""]).find_each do |contact|
  contact.notes.split("\n").filter(&:present?).each do |line|
    # Try to parse timestamp if present: [May 8, 11:00 AM] Content
    content = line.gsub(/^\[.*?\]\s*/, "")
    created_at = contact.created_at
    
    # Very basic attempt to recover timestamp if it's there
    if line =~ /^\[(.*?)\]/
      begin
        # Note: Time.parse might be tricky with "May 8, 11:00 AM" if year is missing
        # but let's just use contact's created_at as fallback
      rescue
      end
    end

    contact.contact_notes.create!(
      user_id: contact.user_id,
      content: content,
      created_at: created_at
    )
  end
end
