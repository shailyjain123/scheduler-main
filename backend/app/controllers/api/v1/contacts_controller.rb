module Api
  module V1
    class ContactsController < Api::BaseController
      before_action :set_contact, only: [ :show, :update, :destroy ]

      # GET /api/v1/contacts
      def index
        contacts = current_user.contacts.order(created_at: :desc)

        if params[:q].present?
          query = "%#{ActiveRecord::Base.sanitize_sql_like(params[:q].to_s.strip)}%"
          contacts = contacts.where(
            "first_name ILIKE :query OR last_name ILIKE :query OR email ILIKE :query",
            query: query
          )
        end

        page = pagination_page
        per_page = pagination_per_page
        total_count = contacts.count
        contacts = contacts.offset((page - 1) * per_page).limit(per_page)

        render json: {
          success: true,
          data: {
            contacts: contacts.map { |contact| ContactSerializer.new(contact).as_json },
            pagination: {
              page: page,
              per_page: per_page,
              total_count: total_count,
              total_pages: (total_count.to_f / per_page).ceil
            }
          }
        }
      end

      # GET /api/v1/contacts/:id
      def show
        render json: {
          success: true,
          data: {
            contact: ContactSerializer.new(@contact).as_json
          }
        }
      end

      # POST /api/v1/contacts
      def create
        contact = current_user.contacts.build(contact_params)
        if contact.save
          Notifications::CreateService.call(
            user: current_user,
            event_name: "contact.created",
            category: "contacts",
            notification_type: "booking",
            title: "Contact added",
            description: "A new contact has been added to your workspace.",
            action_url: "/contacts",
            metadata: {
              contact_id: contact.id,
              email: contact.email
            }
          )

          render json: {
            success: true,
            data: { contact: ContactSerializer.new(contact).as_json },
            message: "Contact created successfully"
          }
        else
          render json: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: contact.errors.full_messages.to_sentence,
              details: contact.errors.as_json
            }
          }, status: 422
        end
      end

      # PATCH/PUT /api/v1/contacts/:id
      def update
        if @contact.update(contact_params)
          render json: {
            success: true,
            data: { contact: ContactSerializer.new(@contact).as_json },
            message: "Contact updated successfully"
          }
        else
          render json: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: @contact.errors.full_messages.to_sentence,
              details: @contact.errors.as_json
            }
          }, status: 422
        end
      end

      # DELETE /api/v1/contacts/:id
      def destroy
        @contact.destroy
        render json: {
          success: true,
          message: "Contact deleted successfully"
        }
      end

      private

      def set_contact
        @contact = current_user.contacts.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: {
          success: false,
          error: { code: "NOT_FOUND", message: "Contact not found" }
        }, status: 404
      end

      def contact_params
        params.require(:contact).permit(:first_name, :last_name, :email, :phone, :status, :type_category, :notes)
      end

      def pagination_page
        page = params[:page].to_i
        page.positive? ? page : 1
      end

      def pagination_per_page
        per_page = params[:per_page].to_i
        return 20 if per_page <= 0

        [ per_page, 100 ].min
      end
    end
  end
end
