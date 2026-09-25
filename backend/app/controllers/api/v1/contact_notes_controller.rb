module Api
  module V1
    class ContactNotesController < Api::BaseController
      before_action :set_contact
      before_action :set_note, only: [:update, :destroy]

      # POST /api/v1/contacts/:contact_id/notes
      def create
        note = @contact.contact_notes.build(note_params)
        note.user = current_user

        if note.save
          render json: {
            success: true,
            data: { 
              note: {
                id: note.id,
                content: note.content,
                created_at: note.created_at,
                updated_at: note.updated_at
              }
            },
            message: "Note added successfully"
          }
        else
          render json: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: note.errors.full_messages.to_sentence
            }
          }, status: 422
        end
      end

      # PATCH/PUT /api/v1/contacts/:contact_id/notes/:id
      def update
        if @note.update(note_params)
          render json: {
            success: true,
            data: {
              note: {
                id: @note.id,
                content: @note.content,
                created_at: @note.created_at,
                updated_at: @note.updated_at
              }
            },
            message: "Note updated successfully"
          }
        else
          render json: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: @note.errors.full_messages.to_sentence
            }
          }, status: 422
        end
      end

      # DELETE /api/v1/contacts/:contact_id/notes/:id
      def destroy
        @note.destroy
        render json: {
          success: true,
          message: "Note deleted successfully"
        }
      end

      private

      def set_contact
        @contact = current_user.contacts.find(params[:contact_id])
      rescue ActiveRecord::RecordNotFound
        render json: {
          success: false,
          error: { code: "NOT_FOUND", message: "Contact not found" }
        }, status: 404
      end

      def set_note
        @note = @contact.contact_notes.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: {
          success: false,
          error: { code: "NOT_FOUND", message: "Note not found" }
        }, status: 404
      end

      def note_params
        params.require(:note).permit(:content)
      end
    end
  end
end
