module Api
  class BaseController < ApplicationController
    include ActionController::Cookies
    before_action :authenticate_user!, except: [ :health ]
    before_action :set_response_format

    rescue_from StandardError, with: :handle_error
    rescue_from ActiveRecord::RecordNotFound, with: :handle_not_found
    rescue_from ActionController::ParameterMissing, with: :handle_missing_param

    attr_reader :current_user

    # GET /health
    def health
      render json: { status: "ok" }
    end

    # Authenticate user from JWT token
    def authenticate_user!
      @current_user = user_from_token

      unless @current_user
        render json: {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or invalid authentication token"
          }
        }, status: 401
      end
    end

    # Extract user from JWT token
    def user_from_token
      if token.present?
        User.from_token(token)
      end
    end

    # Extract token from Authorization header
    def token
      authorization_header = request.headers["Authorization"]

      if authorization_header.present?
        # Extract token from "Bearer <token>" format
        if authorization_header.match?(/\ABearer\s+/i)
          extracted_token = authorization_header.sub(/\ABearer\s+/i, "").strip
          Rails.logger.debug "[Auth] Extracted token from Authorization header: #{extracted_token[0..10]}..."
          return extracted_token
        end

        Rails.logger.debug "[Auth] Authorization header format invalid: #{authorization_header[0..20]}..."
      end

      cookie_token = request.cookies["token"].to_s.presence
      if cookie_token.present?
        Rails.logger.debug "[Auth] Using token from cookie"
        return cookie_token
      end

      Rails.logger.debug "[Auth] No authentication token present in Authorization header or cookie"
      nil
    end

    def set_response_format
      request.format = :json
    end

    private

    def handle_error(exception)
      Rails.logger.error("#{exception.class}: #{exception.message}")
      Rails.logger.error(exception.backtrace.join("\n"))

      message = Rails.env.development? ? exception.message : "An unexpected error occurred"

      render json: {
        success: false,
        error: {
          code: exception.class.name.underscore.upcase,
          message: message,
          details: (exception.backtrace.first(5) if Rails.env.development?)
        }
      }, status: 500
    end

    def handle_not_found
      render json: {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found"
        }
      }, status: 404
    end

    def handle_missing_param(exception)
      render json: {
        success: false,
        error: {
          code: "MISSING_PARAMETER",
          message: exception.message
        }
      }, status: 400
    end
  end
end
