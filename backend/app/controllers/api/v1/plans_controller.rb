module Api
  module V1
    class PlansController < Api::BaseController
      skip_before_action :authenticate_request!, only: [:index]

      def index
        plans = Plan.active.order(:price)
        render json: { success: true, data: plans }
      end
    end
  end
end
