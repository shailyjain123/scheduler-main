class UserSerializer
  def initialize(user)
    @user = user
  end

  def as_json
    {
      id: @user.id,
      email: @user.email,
      email_verified: @user.email_verified?,
      email_verification_enabled: !!@user.email_verification_enabled,
      full_name: @user.full_name,
      status: @user.status,
      onboarding_completed: !!@user.onboarding_completed,
      onboarding_stage: @user.onboarding_stage || 1,
      username: @user.username,
      bio: @user.bio,
      timezone: @user.timezone,
      avatar_url: @user.avatar_url,
      phone_number: @user.phone_number,
      workspace_name: @user.workspace_name,
      language: @user.language,
      appearance: @user.appearance,
      work_type: @user.work_type,
      default_meeting_duration: @user.default_meeting_duration,
      default_buffer_time: @user.default_buffer_time,
      integrations: @user.integrations || { "connected" => [] },
      availability: AvailabilitySchedulesSerializer.new(@user.availability_schedules).as_weekly_json,
      signup_method: @user.signup_method,
      plan_type: @user.plan_type,
      billing_cycle: @user.billing_cycle,
      total_credits: @user.total_credits,
      used_credits: @user.used_credits,
      remaining_credits: @user.remaining_credits,
      plan_started_at: @user.plan_started_at,
      plan_expires_at: @user.plan_expires_at,
      days_remaining: @user.days_remaining,
      plan_expired: @user.plan_expired?,
      credits_exhausted: @user.credits_exhausted?,
      created_at: @user.created_at.iso8601
    }
  end
end
