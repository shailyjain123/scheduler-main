module Scheduler
  class OAuthError < StandardError
    attr_reader :code, :details

    def initialize(message, code: "auth_error", details: nil)
      super(message)
      @code = code
      @details = details
    end
  end

  class OAuthStateMismatchError < OAuthError
    def initialize(message = "Invalid OAuth state - parameter mismatch")
      super(message, code: "invalid_state")
    end
  end

  class OAuthProviderMismatchError < OAuthError
    def initialize(message = "OAuth provider mismatch")
      super(message, code: "provider_mismatch")
    end
  end

  class OAuthMissingStateError < OAuthError
    def initialize(message = "Invalid OAuth state - missing parameter")
      super(message, code: "invalid_state")
    end
  end
end
