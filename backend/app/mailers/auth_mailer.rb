require "cgi"

class AuthMailer < ApplicationMailer
  def signup_otp_email
    @user = params[:user]
    @otp_code = params[:otp_code]
    @expiry_minutes = (User::OTP_TTL / 60).to_i

    mail(to: @user.email, subject: "Your verification code")
  end

  def password_reset_email
    @user = params[:user]
    @reset_token = params[:reset_token]
    @expiry_minutes = (User::PASSWORD_RESET_TTL / 60).to_i
    frontend_url = params[:frontend_url].presence || ENV.fetch("FRONTEND_URL")

    @reset_url = "#{frontend_url}/login?mode=reset&email=#{CGI.escape(@user.email)}&token=#{CGI.escape(@reset_token)}"
    mail(to: @user.email, subject: "Reset your password")
  end
end
