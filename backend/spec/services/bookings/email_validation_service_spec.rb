require "rails_helper"

RSpec.describe Bookings::EmailValidationService do
  let(:email) { "test@example.com" }
  let(:host) { create(:user, plan: host_plan) }
  let(:host_plan) { "premium" }
  let(:service) { described_class.new(email: email, host: host) }

  before do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("VERIFALIA_USERNAME").and_return("user")
    allow(ENV).to receive(:[]).with("VERIFALIA_PASSWORD").and_return("pass")
  end

  describe "#call" do
    context "when host is on free plan" do
      let(:host_plan) { "free" }

      it "returns a skipped result" do
        result = service.call
        expect(result.success?).to be(true)
        expect(result.classification).to eq("skipped")
        expect(result.status).to eq("skipped")
      end
    end

    context "when Verifalia is not configured" do
      before do
        allow(ENV).to receive(:[]).with("VERIFALIA_USERNAME").and_return(nil)
      end

      it "returns a skipped result" do
        result = service.call
        expect(result.success?).to be(true)
        expect(result.classification).to eq("skipped")
        expect(result.status).to eq("skipped")
      end
    end

    context "when Verifalia API call is successful" do
      let(:mock_client) { instance_double(Verifalia::Client) }
      let(:mock_validations) { double("Validations") }
      let(:mock_job) { double("Job", entries: [ mock_entry ]) }
      let(:mock_entry) { double("Entry", classification: "Deliverable", status: "Success") }

      before do
        allow(Verifalia::Client).to receive(:new).and_return(mock_client)
        allow(mock_client).to receive(:email_validations).and_return(mock_validations)
        allow(mock_validations).to receive(:submit).and_return(mock_job)
      end

      it "returns the classification and status" do
        result = service.call
        expect(result.success?).to be(true)
        expect(result.classification).to eq("Deliverable")
        expect(result.status).to eq("Success")
      end
    end

    context "when Verifalia API call raises an error" do
      let(:mock_client) { instance_double(Verifalia::Client) }
      let(:mock_validations) { double("Validations") }

      before do
        allow(Verifalia::Client).to receive(:new).and_return(mock_client)
        allow(mock_client).to receive(:email_validations).and_return(mock_validations)
        allow(mock_validations).to receive(:submit).and_raise(StandardError, "API Timeout")
      end

      it "fails open and returns a skipped result" do
        expect(Rails.logger).to receive(:error).with("[Bookings::EmailValidationService] StandardError: API Timeout")

        result = service.call
        expect(result.success?).to be(true)
        expect(result.classification).to eq("skipped")
        expect(result.status).to eq("skipped")
      end
    end
  end
end
