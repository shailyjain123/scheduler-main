module Invitees
  class ResolveInviteeService
    def initialize(email:)
      @email = email.to_s.strip.downcase
    end

    def call
      User.find_by(email: @email)&.id
    end
  end
end
