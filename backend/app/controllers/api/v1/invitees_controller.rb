module Api
  module V1
    class InviteesController < Api::BaseController
      def index
        event = current_user.events.find(params[:event_id])
        invitees = event.event_invitees.order(created_at: :asc)

        render json: {
          data: invitees.map { |invitee| serialized_invitee(invitee) },
          meta: {
            total: invitees.count,
            accepted: invitees.accepted.count,
            declined: invitees.declined.count,
            maybe: invitees.maybe.count,
            pending: invitees.pending.count
          }
        }
      end

      def create
        event = current_user.events.find(params[:event_id])

        result = Invitees::AddInviteeService.new(
          event: event,
          email: invitee_params[:email],
          name: invitee_params[:name]
        ).call

        if result.success?
          render json: {
            success: true,
            data: serialized_invitee(result.invitee)
          }, status: :created
        else
          render json: {
            success: false,
            error: {
              code: result.error_code,
              message: result.error_message
            }
          }, status: :unprocessable_entity
        end
      end

      def destroy
        result = Invitees::RemoveInviteeService.new(
          user: current_user,
          invitee_id: params[:id]
        ).call

        if result.success?
          render json: { success: true, message: "Invitee removed" }
        else
          render json: {
            success: false,
            error: {
              code: result.error_code,
              message: result.error_message
            }
          }, status: result.error_code == "NOT_FOUND" ? :not_found : :unprocessable_entity
        end
      end

      def resend
        invitee = EventInvitee.joins(:event).find_by(id: params[:id], events: { user_id: current_user.id })
        if invitee.blank?
          render json: {
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Invitee not found"
            }
          }, status: :not_found
          return
        end

        if invitee.event.status == "cancelled"
          render json: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Cannot resend invite for a cancelled event"
            }
          }, status: :unprocessable_entity
          return
        end

        InviteeNotificationJob.perform_later(invitee_id: invitee.id, action: :resend)

        render json: {
          success: true,
          message: "Invite resent"
        }
      end

      private

      def invitee_params
        params.require(:invitee).permit(:email, :name)
      end

      def serialized_invitee(invitee)
        {
          id: invitee.id,
          email: invitee.email,
          name: invitee.name,
          status: invitee.status,
          is_registered_user: invitee.registered_user?,
          notified_at: invitee.notified_at&.utc&.iso8601,
          responded_at: invitee.responded_at&.utc&.iso8601
        }
      end
    end
  end
end
