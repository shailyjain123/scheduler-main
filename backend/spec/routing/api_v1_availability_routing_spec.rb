require 'rails_helper'

RSpec.describe 'API V1 Availability Routes', type: :routing do
  it 'routes recurring schedule endpoints' do
    expect(get: '/api/v1/availability/schedules').to route_to('api/v1/availability/availability_schedules#index')
    expect(post: '/api/v1/availability/schedules').to route_to('api/v1/availability/availability_schedules#create')
    expect(patch: '/api/v1/availability/schedules/1').to route_to('api/v1/availability/availability_schedules#update', id: '1')
    expect(delete: '/api/v1/availability/schedules/1').to route_to('api/v1/availability/availability_schedules#destroy', id: '1')
  end

  it 'routes date-specific override endpoints' do
    expect(get: '/api/v1/availability/overrides').to route_to('api/v1/availability/availability_overrides#index')
    expect(post: '/api/v1/availability/overrides').to route_to('api/v1/availability/availability_overrides#create')
    expect(patch: '/api/v1/availability/overrides/1').to route_to('api/v1/availability/availability_overrides#update', id: '1')
    expect(delete: '/api/v1/availability/overrides/1').to route_to('api/v1/availability/availability_overrides#destroy', id: '1')
  end

  it 'routes free-slot lookup endpoint' do
    expect(get: '/api/v1/availability/slots').to route_to('api/v1/availability/availability_schedules#slots')
  end
end
