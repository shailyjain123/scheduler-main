module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      user = User.from_token(extract_token)
      return user if user.present?

      reject_unauthorized_connection
    end

    def extract_token
      return bearer_token if bearer_token.present?
      return request.params[:token].to_s if request.params[:token].present?

      request.cookies["token"].to_s
    end

    def bearer_token
      auth_header = request.headers["Authorization"].to_s
      return nil unless auth_header.match?(/\ABearer\s+/i)

      auth_header.sub(/\ABearer\s+/i, "").strip
    end
  end
end
