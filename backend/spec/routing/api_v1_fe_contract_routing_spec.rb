require 'rails_helper'

RSpec.describe 'API V1 FE Contract Routes', type: :routing do
  it 'routes auth and session endpoints used by FE' do
    expect(post: '/api/v1/auth/login').to route_to('api/v1/auth#login')
    expect(post: '/api/v1/auth/signup').to route_to('api/v1/auth#signup')
    expect(post: '/api/v1/auth/logout').to route_to('api/v1/auth#logout')
    expect(post: '/api/v1/auth/refresh').to route_to('api/v1/auth#refresh')
    expect(get: '/api/v1/users/me').to route_to('api/v1/users#me')
  end

  it 'routes OAuth start and callback endpoints used by FE flows' do
    expect(get: '/api/v1/auth/google/authorize').to route_to(
      'api/v1/auth#oauth_authorize',
      provider: 'google'
    )
    expect(get: '/api/v1/auth/microsoft/authorize').to route_to(
      'api/v1/auth#oauth_authorize',
      provider: 'microsoft'
    )
    expect(get: '/api/v1/auth/slack/authorize').to route_to(
      'api/v1/auth#oauth_authorize',
      provider: 'slack'
    )
    expect(get: '/api/v1/auth/google_oauth2/callback').to route_to(
      'api/v1/auth#omniauth_callback',
      provider: 'google_oauth2'
    )
  end

  it 'routes onboarding and integration endpoints used by FE views' do
    expect(post: '/api/v1/onboarding/profile').to route_to('api/v1/onboarding#profile')
    expect(post: '/api/v1/onboarding/integrations').to route_to('api/v1/onboarding#integrations')
    expect(post: '/api/v1/onboarding/availability').to route_to('api/v1/onboarding#availability')
    expect(post: '/api/v1/onboarding/meeting-types').to route_to('api/v1/onboarding#meeting_types')
    expect(post: '/api/v1/onboarding/finalise').to route_to('api/v1/onboarding#finalise')

    expect(get: '/api/v1/integrations').to route_to('api/v1/integrations#index')
    expect(delete: '/api/v1/integrations/google').to route_to(
      'api/v1/integrations#destroy',
      provider: 'google'
    )

    expect(get: '/api/v1/event_types').to route_to('api/v1/event_types#index')
    expect(post: '/api/v1/event_types').to route_to('api/v1/event_types#create')
  end

  it 'routes dashboard and event endpoints used by FE views' do
    expect(get: '/api/v1/dashboard/stats').to route_to('api/v1/dashboard#stats')
    expect(get: '/api/v1/events').to route_to('api/v1/events#index')
    expect(post: '/api/v1/events').to route_to('api/v1/events#create')
    expect(patch: '/api/v1/events/1').to route_to('api/v1/events#update', id: '1')
    expect(delete: '/api/v1/events/1').to route_to('api/v1/events#destroy', id: '1')
  end
end
