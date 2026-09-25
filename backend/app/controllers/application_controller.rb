class ApplicationController < ActionController::API
  include ActionController::Cookies

  rescue_from ActiveRecord::RecordInvalid, with: :render_validation_error
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActionController::ParameterMissing, with: :render_parameter_missing

  private

  def render_validation_error(exception)
    render json: {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: exception.record.errors.messages
      }
    }, status: :unprocessable_entity
  end

  def render_not_found(exception)
    render json: {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: exception.message
      }
    }, status: :not_found
  end

  def render_parameter_missing(exception)
    render json: {
      success: false,
      error: {
        code: "PARAMETER_MISSING",
        message: exception.message
      }
    }, status: :bad_request
  end
end
