Rails.application.routes.draw do
  # Health check
  get "up" => "rails/health#show", as: :rails_health_check

  # API routes
  namespace :api do
    namespace :v1 do
      # Authentication endpoints
      post "auth/login", to: "auth#login"
      post "auth/signup", to: "auth#signup"
      post "auth/verify-otp", to: "auth#verify_otp"
      post "auth/resend-otp", to: "auth#resend_otp"
      post "auth/forgot-password", to: "auth#forgot_password"
      post "auth/reset-password", to: "auth#reset_password"
      post "auth/logout", to: "auth#logout"
      post "auth/refresh", to: "auth#refresh"
      post "auth/change-password", to: "auth#change_password"
      get "auth/sessions", to: "auth#sessions"
      delete "auth/sessions/:id", to: "auth#destroy_session"
      delete "auth/sessions", to: "auth#destroy_other_sessions"

      # FE-friendly OAuth start aliases (redirect to OmniAuth provider paths)
      get "auth/google/authorize", to: "auth#oauth_authorize", defaults: { provider: "google" }
      get "auth/microsoft/authorize", to: "auth#oauth_authorize", defaults: { provider: "microsoft" }
      get "auth/:provider/authorize", to: "auth#oauth_authorize"

      # OmniAuth routes (Authentication Mode - login/signup only)
      get "auth/:provider/callback", to: "auth#omniauth_callback"
      get "auth/failure", to: "auth#omniauth_failure"

      # OAuth Callback (Connection Mode - already logged in, connecting integrations only)
      # Requires current_user to be present - NO FALLBACK TO AUTH
      post "integrations/:provider/oauth/callback", to: "integrations#oauth_callback"

      # User endpoints
      get "users", to: "users#index"
      get "users/me", to: "users#me"
      patch "users/:id", to: "users#update"
      delete "users/:id", to: "users#destroy"

      # Onboarding endpoints
      post "onboarding/profile", to: "onboarding#profile"
      post "onboarding/integrations", to: "onboarding#integrations"
      post "onboarding/availability", to: "onboarding#availability"
      post "onboarding/meeting-types", to: "onboarding#meeting_types"
      post "onboarding/finalise", to: "onboarding#finalise"

      # Dashboard endpoints
      get "dashboard/stats", to: "dashboard#stats"

      # Events management
      resources :events, only: [ :index, :create, :update, :destroy ] do
        resources :invitees, only: [ :index, :create, :destroy ], shallow: true do
          member do
            post :resend
          end
        end
      end

      # Availability (Phase 1)
      namespace :availability do
        resources :schedules, only: [ :index, :create, :update, :destroy ], controller: "availability_schedules"
        resources :overrides, only: [ :index, :create, :update, :destroy ], controller: "availability_overrides"
        resources :conflicts, only: [ :index ], controller: "conflicts"
        get "slots", to: "availability_schedules#slots"
      end

      # Event Types management
      resources :event_types

      namespace :public do
        post 'bookings/validate_email', to: 'bookings#validate_email'
        
        # Production-grade Booking Management (Unified Token)
        get 'bookings/manage/:token', to: 'bookings_management#show'
        post 'bookings/manage/:token/cancel', to: 'bookings_management#cancel'
        post 'bookings/manage/:token/reschedule', to: 'bookings_management#reschedule'

        # Legacy Booking Management (UID + Token)
        get 'bookings_management/:booking_uid', to: 'bookings_management#show'
        post 'bookings_management/:booking_uid/cancel', to: 'bookings_management#cancel'
        post 'bookings_management/:booking_uid/reschedule', to: 'bookings_management#reschedule'

        resources :event_types, only: [ :show ] do
          resources :bookings, only: [ :create ] do
            collection do
              post :verify
            end
          end
        end
      end

      # Integration management
      get "integrations", to: "integrations#index"
      get "integrations/location_defaults", to: "integrations#location_defaults"
      delete "integrations/:provider", to: "integrations#destroy"

      # Settings management
      resource :settings, only: [ :show, :update ], controller: "settings" do
        collection do
          post :cancel_subscription
          post :reactivate_subscription
        end
      end

      # Notifications management
      resources :notifications, only: [ :index, :destroy ] do
        member do
          post :mark_as_read
        end
        collection do
          get :unread_count
          post :mark_all_as_read
        end
      end

      # Contacts management
      resources :contacts do
        resources :notes, controller: 'contact_notes', only: [:create, :update, :destroy]
      end

      # Plans management (public API for pricing page/settings)
      resources :plans, only: [:index]

      # Cities search (public — no auth required)
      get "cities/search", to: "cities#search"
    end
  end

  get "/rsvp/:token/accept", to: "rsvp#accept"
  get "/rsvp/:token/decline", to: "rsvp#decline"
  get "/rsvp/:token/maybe", to: "rsvp#maybe"

  mount ActionCable.server => "/cable"
end
