module Api
  module V1
    class UsersController < Api::BaseController
      # GET /api/v1/users?q=foo&limit=10
      # Lightweight search endpoint for invite autocomplete.
      def index
        query = params[:q].to_s.strip
        limit = params[:limit].to_i
        limit = 10 if limit <= 0
        limit = 25 if limit > 25

        # Avoid broad user listing on empty/short queries.
        if query.length < 3
          return render json: {
            success: true,
            data: { users: [] }
          }, status: :ok
        end

        pattern = "%#{ActiveRecord::Base.sanitize_sql_like(query)}%"
        users = User
          .where("email ILIKE :pattern OR full_name ILIKE :pattern", pattern: pattern)
          .where.not(id: current_user.id)
          .order(:full_name, :email)
          .limit(limit)
          .pluck(:id, :full_name, :email)
          .map do |id, full_name, email|
            {
              id: id,
              name: full_name.presence || email.to_s.split("@").first,
              email: email
            }
          end

        render json: {
          success: true,
          data: { users: users }
        }, status: :ok
      end

      # GET /api/v1/users/me
      def me
        render json: {
          success: true,
          data: {
            user: UserSerializer.new(current_user).as_json
          }
        }, status: 200
      end

      # PATCH /api/v1/users/:id
      def update
        unless current_user.id == params[:id].to_i
          return render json: {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You can only update your own profile"
            }
          }, status: 403
        end

        if current_user.update(user_params)
          render json: {
            success: true,
            data: {
              user: UserSerializer.new(current_user).as_json
            },
            message: "Profile updated successfully"
          }, status: 200
        else
          render json: {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Failed to update profile",
              details: current_user.errors.as_json
            }
          }, status: 422
        end
      end

      # DELETE /api/v1/users/:id
      def destroy
        unless current_user.id == params[:id].to_i
          return render json: {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You can only delete your own account"
            }
          }, status: 403
        end

        if current_user.destroy
          cookies.delete(:token, path: "/")
          render json: {
            success: true,
            message: "Account deleted successfully"
          }, status: 200
        else
          render json: {
            success: false,
            error: {
              code: "DELETION_FAILED",
              message: "Failed to delete account"
            }
          }, status: 422
        end
      end

      private

      def user_params
        params.require(:user).permit(
          :first_name,
          :last_name,
          :username,
          :full_name,
          :bio,
          :timezone,
          :avatar_url,
          :phone_number,
          :workspace_name,
          :language,
          :appearance,
          :work_type,
          :default_meeting_duration,
          :default_buffer_time,
          :plan_type,
          :preferred_currency,
          :billing_cycle,
          :email_verification_enabled
        )
      end
    end
  end
end
