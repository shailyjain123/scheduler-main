module Api
  module V1
    class DashboardController < Api::BaseController
      def stats
        stats = Dashboard::StatsService.new(
          user: current_user,
          from: params[:from],
          to: params[:to]
        ).call

        render json: {
          success: true,
          data: stats
        }
      end
    end
  end
end
