require "rails_helper"

RSpec.describe "Api::V1::Notifications", type: :request do
  let(:user) { create(:user) }
  let(:token) { user.generate_token }
  let(:headers) { { "Authorization" => "Bearer #{token}" } }

  describe "GET /api/v1/notifications" do
    before do
      create(:notification, user: user, category: "meetings", read_at: nil, created_at: 2.hours.ago)
      create(:notification, user: user, category: "contacts", read_at: Time.current, created_at: 1.hour.ago)
      create(:notification, user: user, category: "integrations", read_at: nil, created_at: Time.current)
    end

    it "returns paginated notifications with unread count" do
      get "/api/v1/notifications", params: { page: 1, per_page: 2 }, headers: headers

      expect(response).to have_http_status(:ok)
      body = response.parsed_body

      expect(body["success"]).to eq(true)
      expect(body.dig("data", "notifications").size).to eq(2)
      expect(body.dig("data", "unread_count")).to eq(2)
      expect(body.dig("data", "pagination", "total_count")).to eq(3)
    end

    it "filters by unread" do
      get "/api/v1/notifications", params: { filter: "unread" }, headers: headers

      body = response.parsed_body
      expect(body.dig("data", "notifications").all? { |n| n["read_at"].nil? }).to eq(true)
    end

    it "filters by category" do
      get "/api/v1/notifications", params: { category: "meetings,integrations" }, headers: headers

      body = response.parsed_body
      categories = body.dig("data", "notifications").map { |n| n["category"] }.uniq
      expect(categories.sort).to eq(%w[integrations meetings])
    end
  end

  describe "PATCH /api/v1/notifications/:id" do
    let!(:notification) { create(:notification, user: user, read_at: nil) }

    it "marks notification as read" do
      patch "/api/v1/notifications/#{notification.id}", params: { read: true }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(notification.reload.read_at).to be_present
    end

    it "marks notification as unread" do
      notification.update!(read_at: Time.current)

      patch "/api/v1/notifications/#{notification.id}", params: { read: false }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(notification.reload.read_at).to be_nil
    end
  end

  describe "POST /api/v1/notifications/mark_all_as_read" do
    before do
      create_list(:notification, 2, user: user, read_at: nil)
    end

    it "marks all unread notifications as read" do
      post "/api/v1/notifications/mark_all_as_read", headers: headers

      expect(response).to have_http_status(:ok)
      expect(user.notifications.unread.count).to eq(0)
    end
  end

  describe "DELETE /api/v1/notifications/:id" do
    let!(:notification) { create(:notification, user: user) }

    it "deletes a notification" do
      delete "/api/v1/notifications/#{notification.id}", headers: headers

      expect(response).to have_http_status(:ok)
      expect { notification.reload }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end

  describe "DELETE /api/v1/notifications/bulk_destroy" do
    let!(:n1) { create(:notification, user: user) }
    let!(:n2) { create(:notification, user: user) }

    it "deletes selected notifications" do
      delete "/api/v1/notifications/bulk_destroy", params: { ids: [ n1.id, n2.id ] }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(user.notifications.where(id: [ n1.id, n2.id ]).count).to eq(0)
    end
  end
end
