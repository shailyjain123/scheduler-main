# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin Ajax requests.

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    allowed_origins = []

    frontend_url = ENV["FRONTEND_URL"].to_s.strip
    allowed_origins << frontend_url if frontend_url.present?

    ENV.fetch("ADDITIONAL_FRONTEND_URLS", "").split(",").map(&:strip).reject(&:empty?).each do |url|
      allowed_origins << url
    end


    unique_origins = allowed_origins.uniq
    if unique_origins.empty?
      origins { false }
    else
      origins(*unique_origins)
    end

    resource "*",
      headers: :any,
      methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
      credentials: true
  end
end
