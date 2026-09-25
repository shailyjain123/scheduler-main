module Integrations
  class DefaultLocationResolver
    def self.call(user)
      new(user).call
    end

    def initialize(user)
      @user = user
    end

    def call
      {
        recommended_default: recommended_default,
        integrations: integration_statuses
      }
    end

    private

    def recommended_default
      # Priority 1: Google Meet
      return { type: 'google_meet', label: 'Google Meet' } if connected?('google_meet')

      # Priority 2: Zoom
      return { type: 'zoom', label: 'Zoom' } if connected?('zoom')

      # Priority 3: Microsoft Teams
      return { type: 'teams', label: 'Microsoft Teams' } if connected?('teams')

      # Priority 4: Phone Call (Always available as fallback)
      return { type: 'phone', label: 'Phone Call' }

      # Priority 5: In Person
      # { type: 'in_person', label: 'In Person' }
    end

    def connected?(key)
      integrations = @user.integrations || { 'connected' => [] }
      Array(integrations['connected']).include?(key.to_s)
    end

    def integration_statuses
      all_keys = ['google_meet', 'zoom', 'teams', 'phone', 'in_person']
      all_keys.each_with_object({}) do |key, hash|
        hash[key] = {
          connected: key == 'phone' || key == 'in_person' || connected?(key)
        }
      end
    end
  end
end
