# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_05_11_080515) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "btree_gist"
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pg_trgm"

  create_table "availability_overrides", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.time "end_time"
    t.boolean "is_unavailable", default: false, null: false
    t.string "reason"
    t.time "start_time"
    t.string "timezone", default: "UTC", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["timezone"], name: "index_availability_overrides_on_timezone"
    t.index ["user_id", "date"], name: "index_availability_overrides_on_user_id_and_date"
    t.index ["user_id"], name: "index_availability_overrides_on_user_id"
    t.check_constraint "start_time IS NULL OR end_time IS NULL OR end_time > start_time", name: "availability_overrides_end_after_start"
  end

  create_table "availability_schedules", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "day_of_week", null: false
    t.time "end_time", null: false
    t.boolean "is_active", default: true, null: false
    t.time "start_time", null: false
    t.string "timezone", default: "UTC", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "day_of_week"], name: "index_availability_schedules_on_user_id_and_day_of_week"
    t.index ["user_id"], name: "index_availability_schedules_on_user_id"
    t.check_constraint "day_of_week >= 0 AND day_of_week <= 6", name: "availability_schedules_day_of_week_range"
    t.check_constraint "end_time > start_time", name: "availability_schedules_end_after_start"
  end

  create_table "booking_abuse_logs", force: :cascade do |t|
    t.boolean "blocked", default: false, null: false
    t.string "client_ip", null: false
    t.datetime "created_at", null: false
    t.bigint "event_type_id", null: false
    t.string "fingerprint"
    t.string "guest_email"
    t.string "guest_name"
    t.jsonb "metadata", default: {}, null: false
    t.bigint "public_booking_request_id"
    t.datetime "resolved_at"
    t.string "rule_violated", null: false
    t.string "severity", default: "warning", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["blocked"], name: "index_booking_abuse_logs_on_blocked"
    t.index ["client_ip"], name: "index_booking_abuse_logs_on_client_ip"
    t.index ["created_at"], name: "index_booking_abuse_logs_on_created_at"
    t.index ["event_type_id"], name: "index_booking_abuse_logs_on_event_type_id"
    t.index ["fingerprint"], name: "index_booking_abuse_logs_on_fingerprint"
    t.index ["guest_email"], name: "index_booking_abuse_logs_on_guest_email"
    t.index ["public_booking_request_id"], name: "index_booking_abuse_logs_on_public_booking_request_id"
    t.index ["rule_violated"], name: "index_booking_abuse_logs_on_rule_violated"
    t.index ["severity"], name: "index_booking_abuse_logs_on_severity"
    t.index ["user_id"], name: "index_booking_abuse_logs_on_user_id"
  end

  create_table "cities", force: :cascade do |t|
    t.text "alternate_names"
    t.string "country", null: false
    t.string "country_code", limit: 2, null: false
    t.datetime "created_at", null: false
    t.float "latitude"
    t.float "longitude"
    t.string "name", null: false
    t.integer "population", default: 0
    t.string "timezone", null: false
    t.datetime "updated_at", null: false
    t.index ["alternate_names"], name: "index_cities_on_alternate_names_trgm", opclass: :gin_trgm_ops, using: :gin
    t.index ["country_code"], name: "index_cities_on_country_code"
    t.index ["name"], name: "index_cities_on_name"
    t.index ["name"], name: "index_cities_on_name_trgm", opclass: :gin_trgm_ops, using: :gin
    t.index ["population"], name: "index_cities_on_population"
    t.index ["timezone"], name: "index_cities_on_timezone"
  end

  create_table "contact_notes", force: :cascade do |t|
    t.bigint "contact_id", null: false
    t.text "content", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["contact_id"], name: "index_contact_notes_on_contact_id"
    t.index ["created_at"], name: "index_contact_notes_on_created_at"
    t.index ["user_id"], name: "index_contact_notes_on_user_id"
  end

  create_table "contacts", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.string "first_name"
    t.string "last_name"
    t.text "notes"
    t.string "phone"
    t.string "status"
    t.string "type_category"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_contacts_on_user_id"
  end

  create_table "currencies", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.string "symbol", null: false
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_currencies_on_code", unique: true
  end

  create_table "currency_rates", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "currency", null: false
    t.decimal "rate", precision: 10, scale: 4, null: false
    t.datetime "updated_at", null: false
    t.index ["currency"], name: "index_currency_rates_on_currency", unique: true
  end

  create_table "event_invitees", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.bigint "event_id", null: false
    t.string "name"
    t.datetime "notified_at"
    t.datetime "responded_at"
    t.string "status", default: "pending", null: false
    t.string "token", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id"
    t.index ["email"], name: "index_event_invitees_on_email"
    t.index ["event_id", "email"], name: "index_event_invitees_on_event_id_and_email", unique: true
    t.index ["event_id"], name: "index_event_invitees_on_event_id"
    t.index ["token"], name: "index_event_invitees_on_token", unique: true
    t.index ["user_id"], name: "index_event_invitees_on_user_id"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying::text, 'accepted'::character varying::text, 'declined'::character varying::text, 'maybe'::character varying::text])", name: "event_invitees_status_check"
  end

  create_table "event_types", force: :cascade do |t|
    t.jsonb "availability", default: {}, null: false
    t.integer "buffer_after", default: 0
    t.integer "buffer_before", default: 0
    t.integer "buffer_time"
    t.datetime "created_at", null: false
    t.text "description"
    t.integer "duration"
    t.integer "events_count", default: 0, null: false
    t.boolean "is_active"
    t.integer "kind", default: 0, null: false
    t.string "location"
    t.integer "max_participants", default: 1, null: false
    t.string "minimum_notice_unit", default: "Hours"
    t.integer "minimum_notice_value", default: 4
    t.string "title"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_event_types_on_user_id"
  end

  create_table "events", force: :cascade do |t|
    t.string "booking_uid"
    t.integer "buffer_after_minutes", default: 0, null: false
    t.integer "buffer_before_minutes", default: 0, null: false
    t.text "cancel_reason"
    t.datetime "cancelled_at"
    t.datetime "created_at", null: false
    t.text "description"
    t.datetime "end_time", null: false
    t.integer "event_invitees_count", default: 0, null: false
    t.string "event_source", default: "host_created"
    t.bigint "event_type_id", null: false
    t.datetime "last_management_access_at"
    t.string "location"
    t.string "manage_token_digest"
    t.boolean "managed_by_attendee", default: false
    t.jsonb "metadata"
    t.bigint "rescheduled_from_event_id"
    t.bigint "rescheduled_to_event_id"
    t.datetime "start_time", null: false
    t.string "status", default: "scheduled", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["booking_uid"], name: "index_events_on_booking_uid", unique: true
    t.index ["cancelled_at"], name: "index_events_on_cancelled_at"
    t.index ["event_source"], name: "index_events_on_event_source"
    t.index ["event_type_id"], name: "index_events_on_event_type_id"
    t.index ["manage_token_digest"], name: "index_events_on_manage_token_digest", unique: true
    t.index ["rescheduled_from_event_id"], name: "index_events_on_rescheduled_from_event_id"
    t.index ["rescheduled_to_event_id"], name: "index_events_on_rescheduled_to_event_id"
    t.index ["user_id", "status", "start_time", "end_time"], name: "idx_events_lookup"
    t.index ["user_id"], name: "index_events_on_user_id"
    t.exclusion_constraint "user_id WITH =, tsrange((start_time - ((buffer_before_minutes)::double precision * 'PT1M'::interval)), (end_time + ((buffer_after_minutes)::double precision * 'PT1M'::interval)), '[)'::text) WITH &&", where: "(status)::text = 'scheduled'::text", using: :gist, name: "no_overlapping_user_events"
  end

  create_table "external_identities", force: :cascade do |t|
    t.text "access_token"
    t.string "account_type", default: "personal", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at"
    t.datetime "last_used_at"
    t.jsonb "metadata"
    t.string "provider"
    t.string "provider_email", null: false
    t.text "refresh_token"
    t.jsonb "scopes", default: [], null: false
    t.string "uid"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["provider", "uid"], name: "index_external_identities_on_provider_and_uid", unique: true
    t.index ["provider_email"], name: "index_external_identities_on_provider_email"
    t.index ["user_id", "provider"], name: "index_external_identities_on_user_id_and_provider", unique: true
    t.index ["user_id"], name: "index_external_identities_on_user_id"
  end

  create_table "invitee_notification_logs", force: :cascade do |t|
    t.string "action", null: false
    t.jsonb "change_summary", default: {}, null: false
    t.datetime "created_at", null: false
    t.string "delivery_status", null: false
    t.text "error_message"
    t.bigint "event_id", null: false
    t.bigint "event_invitee_id"
    t.string "mailer_message_id"
    t.string "recipient_email", null: false
    t.datetime "sent_at"
    t.datetime "updated_at", null: false
    t.index ["event_id", "created_at"], name: "index_invitee_notification_logs_on_event_id_and_created_at"
    t.index ["event_id"], name: "index_invitee_notification_logs_on_event_id"
    t.index ["event_invitee_id", "created_at"], name: "idx_on_event_invitee_id_created_at_d9c5353015"
    t.index ["event_invitee_id"], name: "index_invitee_notification_logs_on_event_invitee_id"
  end

  create_table "notifications", force: :cascade do |t|
    t.string "action_url"
    t.bigint "actor_id"
    t.string "category", default: "system", null: false
    t.datetime "created_at", null: false
    t.string "dedup_hash"
    t.text "description"
    t.string "event_name", default: "generic", null: false
    t.string "group_key"
    t.integer "grouped_count", default: 1, null: false
    t.datetime "interacted_at"
    t.datetime "last_occurred_at"
    t.jsonb "metadata"
    t.bigint "notifiable_id"
    t.string "notifiable_type"
    t.string "notification_type"
    t.string "priority"
    t.datetime "read_at"
    t.string "title"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["actor_id"], name: "index_notifications_on_actor_id"
    t.index ["dedup_hash"], name: "index_notifications_on_dedup_hash", unique: true
    t.index ["notifiable_type", "notifiable_id"], name: "index_notifications_on_notifiable_type_and_notifiable_id"
    t.index ["user_id", "category", "created_at"], name: "index_notifications_on_user_category_created"
    t.index ["user_id", "group_key"], name: "index_notifications_on_user_group_key"
    t.index ["user_id", "read_at", "created_at"], name: "index_notifications_on_user_read_created"
    t.index ["user_id"], name: "index_notifications_on_user_id"
  end

  create_table "plan_features", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "feature_name", null: false
    t.string "feature_value"
    t.bigint "plan_id", null: false
    t.datetime "updated_at", null: false
    t.index ["plan_id"], name: "index_plan_features_on_plan_id"
  end

  create_table "plans", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "billing_cycle", default: "monthly", null: false
    t.datetime "created_at", null: false
    t.integer "credits", default: 0, null: false
    t.string "name", null: false
    t.decimal "price", precision: 10, scale: 2, default: "0.0", null: false
    t.datetime "updated_at", null: false
    t.index ["name", "billing_cycle"], name: "index_plans_on_name_and_billing_cycle", unique: true
  end

  create_table "public_booking_requests", force: :cascade do |t|
    t.bigint "booking_event_id"
    t.string "client_fingerprint"
    t.string "client_ip"
    t.datetime "created_at", null: false
    t.datetime "email_validated_at"
    t.string "email_validation_provider"
    t.string "email_validation_status"
    t.datetime "end_time", null: false
    t.bigint "event_type_id", null: false
    t.string "guest_email", null: false
    t.string "guest_name", null: false
    t.string "idempotency_key"
    t.text "notes"
    t.jsonb "risk_flags", default: [], null: false
    t.integer "risk_score", default: 0, null: false
    t.datetime "start_time", null: false
    t.string "status", default: "pending", null: false
    t.string "timezone", default: "UTC", null: false
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.bigint "user_id", null: false
    t.integer "verification_attempts", default: 0, null: false
    t.string "verification_code_digest", null: false
    t.datetime "verification_expires_at", null: false
    t.datetime "verification_sent_at", null: false
    t.datetime "verified_at"
    t.index ["booking_event_id"], name: "index_public_booking_requests_on_booking_event_id"
    t.index ["client_fingerprint"], name: "index_public_booking_requests_on_client_fingerprint"
    t.index ["client_ip"], name: "index_public_booking_requests_on_client_ip"
    t.index ["event_type_id", "start_time"], name: "index_public_booking_requests_on_active_pending_slot_hold", unique: true, where: "((status)::text = 'pending'::text)"
    t.index ["event_type_id"], name: "index_public_booking_requests_on_event_type_id"
    t.index ["guest_email"], name: "index_public_booking_requests_on_guest_email"
    t.index ["idempotency_key"], name: "index_public_booking_requests_on_idempotency_key", unique: true
    t.index ["status"], name: "index_public_booking_requests_on_status"
    t.index ["user_id", "client_fingerprint", "created_at"], name: "index_public_booking_requests_on_user_fingerprint_created_at"
    t.index ["user_id", "client_ip", "created_at"], name: "index_public_booking_requests_on_user_ip_created_at"
    t.index ["user_id", "guest_email", "created_at"], name: "index_public_booking_requests_on_user_email_created_at"
    t.index ["user_id", "status", "verification_expires_at"], name: "idx_pending_lookup"
    t.index ["user_id"], name: "index_public_booking_requests_on_user_id"
    t.index ["verification_expires_at"], name: "index_public_booking_requests_on_verification_expires_at"
  end

  create_table "reminders", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "error_message"
    t.bigint "event_id", null: false
    t.string "offset_identifier", null: false
    t.string "recipient_type", null: false
    t.string "reminder_type", null: false
    t.datetime "scheduled_at", null: false
    t.datetime "sent_at"
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.integer "version", default: 1, null: false
    t.index ["event_id", "reminder_type", "offset_identifier", "version"], name: "idx_reminders_on_event_type_offset_version", unique: true
    t.index ["event_id"], name: "index_reminders_on_event_id"
    t.index ["status", "scheduled_at"], name: "index_reminders_on_status_and_scheduled_at"
  end

  create_table "sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "device_info"
    t.datetime "expires_at", null: false
    t.string "token", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["expires_at"], name: "index_sessions_on_expires_at"
    t.index ["token"], name: "index_sessions_on_token", unique: true
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "solid_queue_blocked_executions", force: :cascade do |t|
    t.string "concurrency_key", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.index ["concurrency_key", "priority", "job_id"], name: "index_solid_queue_blocked_executions_for_release"
    t.index ["expires_at", "concurrency_key"], name: "index_solid_queue_blocked_executions_for_maintenance"
    t.index ["job_id"], name: "index_solid_queue_blocked_executions_on_job_id", unique: true
  end

  create_table "solid_queue_claimed_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.bigint "process_id"
    t.index ["job_id"], name: "index_solid_queue_claimed_executions_on_job_id", unique: true
    t.index ["process_id", "job_id"], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
  end

  create_table "solid_queue_failed_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "error"
    t.bigint "job_id", null: false
    t.index ["job_id"], name: "index_solid_queue_failed_executions_on_job_id", unique: true
  end

  create_table "solid_queue_jobs", force: :cascade do |t|
    t.string "active_job_id"
    t.text "arguments"
    t.string "class_name", null: false
    t.string "concurrency_key"
    t.datetime "created_at", null: false
    t.datetime "finished_at"
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.datetime "scheduled_at"
    t.datetime "updated_at", null: false
    t.index ["active_job_id"], name: "index_solid_queue_jobs_on_active_job_id"
    t.index ["class_name"], name: "index_solid_queue_jobs_on_class_name"
    t.index ["finished_at"], name: "index_solid_queue_jobs_on_finished_at"
    t.index ["queue_name", "finished_at"], name: "index_solid_queue_jobs_for_filtering"
    t.index ["scheduled_at", "finished_at"], name: "index_solid_queue_jobs_for_alerting"
  end

  create_table "solid_queue_pauses", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "queue_name", null: false
    t.index ["queue_name"], name: "index_solid_queue_pauses_on_queue_name", unique: true
  end

  create_table "solid_queue_processes", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "hostname"
    t.string "kind", null: false
    t.datetime "last_heartbeat_at", null: false
    t.text "metadata"
    t.string "name", null: false
    t.integer "pid", null: false
    t.bigint "supervisor_id"
    t.index ["last_heartbeat_at"], name: "index_solid_queue_processes_on_last_heartbeat_at"
    t.index ["name", "supervisor_id"], name: "index_solid_queue_processes_on_name_and_supervisor_id", unique: true
    t.index ["supervisor_id"], name: "index_solid_queue_processes_on_supervisor_id"
  end

  create_table "solid_queue_ready_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.index ["job_id"], name: "index_solid_queue_ready_executions_on_job_id", unique: true
    t.index ["priority", "job_id"], name: "index_solid_queue_poll_all"
    t.index ["queue_name", "priority", "job_id"], name: "index_solid_queue_poll_by_queue"
  end

  create_table "solid_queue_recurring_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.datetime "run_at", null: false
    t.string "task_key", null: false
    t.index ["job_id"], name: "index_solid_queue_recurring_executions_on_job_id", unique: true
    t.index ["task_key", "run_at"], name: "index_solid_queue_recurring_executions_on_task_key_and_run_at", unique: true
  end

  create_table "solid_queue_recurring_tasks", force: :cascade do |t|
    t.text "arguments"
    t.string "class_name"
    t.string "command", limit: 2048
    t.datetime "created_at", null: false
    t.text "description"
    t.string "key", null: false
    t.integer "priority", default: 0
    t.string "queue_name"
    t.string "schedule", null: false
    t.boolean "static", default: true, null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_solid_queue_recurring_tasks_on_key", unique: true
    t.index ["static"], name: "index_solid_queue_recurring_tasks_on_static"
  end

  create_table "solid_queue_scheduled_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.datetime "scheduled_at", null: false
    t.index ["job_id"], name: "index_solid_queue_scheduled_executions_on_job_id", unique: true
    t.index ["scheduled_at", "priority", "job_id"], name: "index_solid_queue_dispatch_all"
  end

  create_table "solid_queue_semaphores", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "key", null: false
    t.datetime "updated_at", null: false
    t.integer "value", default: 1, null: false
    t.index ["expires_at"], name: "index_solid_queue_semaphores_on_expires_at"
    t.index ["key", "value"], name: "index_solid_queue_semaphores_on_key_and_value"
    t.index ["key"], name: "index_solid_queue_semaphores_on_key", unique: true
  end

  create_table "system_configurations", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "key", null: false
    t.datetime "updated_at", null: false
    t.jsonb "value", default: {}, null: false
    t.index ["key"], name: "index_system_configurations_on_key", unique: true
  end

  create_table "user_settings", force: :cascade do |t|
    t.jsonb "ai_voice_assistant_config", default: {"language"=>"English (US)", "voice_style"=>"Professional (Standard)"}, null: false
    t.boolean "ai_voice_assistant_enabled", default: true, null: false
    t.integer "booking_range_count", default: 60
    t.string "booking_range_type", default: "days"
    t.integer "buffer_after", default: 0
    t.integer "buffer_before", default: 0
    t.jsonb "call_reminders_config", default: {"script"=>"Hi {guest_name}, this is an automated reminder from {host_name}. Your appointment starts in 10 minutes. Please join using the link provided in your email.", "timing"=>"10 minutes before", "fallback_sms"=>true, "max_attempts"=>2, "fallback_email"=>false}, null: false
    t.boolean "call_reminders_enabled", default: true, null: false
    t.datetime "created_at", null: false
    t.jsonb "email_reminders_config", default: [{"offset"=>"24 hours before", "enabled"=>true, "recipient"=>"guest"}, {"offset"=>"1 hour before", "enabled"=>true, "recipient"=>"guest"}], null: false
    t.boolean "email_reminders_enabled", default: true, null: false
    t.integer "max_bookings_per_day"
    t.string "minimum_notice_unit", default: "Hours"
    t.integer "minimum_notice_value", default: 4
    t.jsonb "push_notifications_config", default: {"no_show"=>true, "reschedule"=>true, "new_booking"=>true, "cancellation"=>true, "meeting_soon"=>true, "payment_received"=>false}, null: false
    t.jsonb "sms_reminders_config", default: [{"offset"=>"30 minutes before", "enabled"=>true, "recipient"=>"guest"}], null: false
    t.boolean "sms_reminders_enabled", default: true, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_user_settings_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "appearance"
    t.string "avatar_source", default: "google"
    t.string "avatar_url"
    t.string "billing_cycle", default: "yearly"
    t.text "bio"
    t.boolean "cancel_at_period_end", default: false, null: false
    t.datetime "created_at", null: false
    t.integer "default_buffer_time"
    t.integer "default_meeting_duration"
    t.string "email", null: false
    t.boolean "email_verification_enabled", default: false, null: false
    t.datetime "email_verified_at"
    t.string "first_name"
    t.string "full_name"
    t.jsonb "integrations"
    t.string "language"
    t.string "last_name"
    t.boolean "onboarding_completed", default: false
    t.integer "onboarding_stage", default: 1
    t.string "otp_digest"
    t.datetime "otp_expires_at"
    t.integer "otp_failed_attempts", default: 0, null: false
    t.datetime "otp_locked_until"
    t.integer "otp_resend_count", default: 0, null: false
    t.datetime "otp_resend_window_started_at"
    t.datetime "otp_sent_at"
    t.string "password_digest", null: false
    t.datetime "password_reset_expires_at"
    t.integer "password_reset_failed_attempts", default: 0, null: false
    t.datetime "password_reset_locked_until"
    t.integer "password_reset_request_count", default: 0, null: false
    t.datetime "password_reset_request_window_started_at"
    t.datetime "password_reset_sent_at"
    t.string "password_reset_token_digest"
    t.jsonb "pending_plan_change", default: {}, null: false
    t.string "phone_number"
    t.datetime "plan_expires_at"
    t.datetime "plan_started_at"
    t.string "plan_type", default: "free", null: false
    t.string "preferred_currency", default: "USD"
    t.string "signup_method"
    t.string "status", default: "active", null: false
    t.string "timezone"
    t.integer "total_credits", default: 0, null: false
    t.integer "unread_notifications_count", default: 0, null: false
    t.datetime "updated_at", null: false
    t.integer "used_credits", default: 0, null: false
    t.string "username"
    t.string "work_type"
    t.string "workspace_name"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["email_verified_at"], name: "index_users_on_email_verified_at"
    t.index ["otp_locked_until"], name: "index_users_on_otp_locked_until"
    t.index ["password_reset_expires_at"], name: "index_users_on_password_reset_expires_at"
    t.index ["password_reset_locked_until"], name: "index_users_on_password_reset_locked_until"
    t.index ["plan_type"], name: "index_users_on_plan_type"
    t.index ["status"], name: "index_users_on_status"
  end

  add_foreign_key "availability_overrides", "users"
  add_foreign_key "availability_schedules", "users"
  add_foreign_key "booking_abuse_logs", "event_types"
  add_foreign_key "booking_abuse_logs", "public_booking_requests"
  add_foreign_key "booking_abuse_logs", "users"
  add_foreign_key "contact_notes", "contacts"
  add_foreign_key "contact_notes", "users"
  add_foreign_key "contacts", "users"
  add_foreign_key "event_invitees", "events"
  add_foreign_key "event_invitees", "users"
  add_foreign_key "event_types", "users"
  add_foreign_key "events", "event_types"
  add_foreign_key "events", "events", column: "rescheduled_from_event_id"
  add_foreign_key "events", "events", column: "rescheduled_to_event_id"
  add_foreign_key "events", "users"
  add_foreign_key "external_identities", "users", on_delete: :cascade
  add_foreign_key "invitee_notification_logs", "event_invitees"
  add_foreign_key "invitee_notification_logs", "events"
  add_foreign_key "notifications", "users"
  add_foreign_key "plan_features", "plans"
  add_foreign_key "public_booking_requests", "event_types"
  add_foreign_key "public_booking_requests", "events", column: "booking_event_id"
  add_foreign_key "public_booking_requests", "users"
  add_foreign_key "reminders", "events"
  add_foreign_key "sessions", "users"
  add_foreign_key "solid_queue_blocked_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_claimed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_failed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_ready_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_recurring_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_scheduled_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "user_settings", "users"
end
