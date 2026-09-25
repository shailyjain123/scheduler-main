class ContactSerializer
  def initialize(contact)
    @contact = contact
  end

  def as_json
    {
      id: @contact.id,
      first_name: @contact.first_name,
      last_name: @contact.last_name,
      full_name: @contact.full_name,
      email: @contact.email,
      phone: @contact.phone,
      status: @contact.status,
      type_category: @contact.type_category,
      notes: @contact.notes,
      contact_notes: @contact.contact_notes.map { |note|
        {
          id: note.id,
          content: note.content,
          created_at: note.created_at,
          updated_at: note.updated_at
        }
      },
      created_at: @contact.created_at,
      updated_at: @contact.updated_at
    }
  end
end
