module Api
  module V1
    class NotificationsController < Api::BaseController
      def index
        @notifications = current_user.notifications
                                    .includes(:actor)
                                    .latest_first
                                    .page(params[:page])
                                    .per(params[:per_page] || 20)

        render json: {
          success: true,
          data: @notifications.as_json(include: { 
            actor: { only: [:id, :full_name, :avatar_url] } 
          }),
          unread_count: current_user.unread_notifications_count,
          pagination: pagination_dict(@notifications)
        }
      end

      def mark_as_read
        notification = current_user.notifications.find(params[:id])
        if notification.mark_as_read!
          render json: { success: true, unread_count: current_user.unread_notifications_count }
        else
          render json: { success: false, error: "Failed to mark as read" }, status: :unprocessable_entity
        end
      end

      def mark_all_as_read
        unread_notifications = current_user.notifications.unread
        
        Notification.transaction do
          unread_notifications.update_all(read_at: Time.current)
          current_user.update!(unread_notifications_count: 0)
        end

        # Broadcast update
        ActionCable.server.broadcast(
          "notifications_#{current_user.id}",
          { type: "UNREAD_COUNT_UPDATE", unread_count: 0 }
        )

        render json: { success: true, unread_count: 0 }
      end

      def unread_count
        render json: { success: true, unread_count: current_user.unread_notifications_count }
      end

      private

      def pagination_dict(collection)
        {
          current_page: collection.current_page,
          next_page: collection.next_page,
          prev_page: collection.prev_page,
          total_pages: collection.total_pages,
          total_count: collection.total_count
        }
      end
    end
  end
end
