namespace :plans do
  desc "Create a new plan. Usage: rake plans:create name=Starter credits=250 price=10 billing_cycle=monthly"
  task create: :environment do
    name = ENV["name"]
    credits = ENV["credits"]
    price = ENV["price"]
    billing_cycle = ENV["billing_cycle"] || "monthly"
    active = ENV.fetch("active", "true") == "true"

    if name.blank? || credits.blank? || price.blank?
      puts "Error: Missing required arguments."
      puts "Usage: rake plans:create name=Starter credits=250 price=10 billing_cycle=monthly"
      exit 1
    end

    plan = Plan.new(
      name: name,
      credits: credits,
      price: price,
      billing_cycle: billing_cycle,
      active: active
    )

    if plan.save
      puts "Successfully created plan: #{plan.name} (#{plan.billing_cycle}) - #{plan.credits} credits at $#{plan.price}"
      Rails.logger.info "[Admin:Rake] Created plan: #{plan.inspect}"
    else
      puts "Failed to create plan: #{plan.errors.full_messages.to_sentence}"
      exit 1
    end
  end

  desc "Update a plan. Usage: rake plans:update id=1 name=Starter credits=300 price=12"
  task update: :environment do
    id = ENV["id"]
    if id.blank?
      puts "Error: Missing plan id."
      puts "Usage: rake plans:update id=1 name=Starter credits=300 price=12"
      exit 1
    end

    plan = Plan.find_by(id: id)
    unless plan
      puts "Error: Plan not found with ID #{id}"
      exit 1
    end

    attributes = {}
    attributes[:name] = ENV["name"] if ENV["name"].present?
    attributes[:credits] = ENV["credits"] if ENV["credits"].present?
    attributes[:price] = ENV["price"] if ENV["price"].present?
    attributes[:billing_cycle] = ENV["billing_cycle"] if ENV["billing_cycle"].present?
    
    if ENV["active"].present?
      attributes[:active] = ENV["active"] == "true"
    end

    if plan.update(attributes)
      puts "Successfully updated plan ID #{plan.id}: #{plan.name} (#{plan.billing_cycle}) - #{plan.credits} credits at $#{plan.price}"
      Rails.logger.info "[Admin:Rake] Updated plan: #{plan.inspect}"
    else
      puts "Failed to update plan: #{plan.errors.full_messages.to_sentence}"
      exit 1
    end
  end

  desc "Soft delete a plan. Usage: rake plans:delete id=1"
  task delete: :environment do
    id = ENV["id"]
    if id.blank?
      puts "Error: Missing plan id."
      puts "Usage: rake plans:delete id=1"
      exit 1
    end

    plan = Plan.find_by(id: id)
    unless plan
      puts "Error: Plan not found with ID #{id}"
      exit 1
    end

    if plan.soft_delete!
      puts "Successfully soft deleted plan ID #{plan.id} (#{plan.name} - #{plan.billing_cycle})"
      Rails.logger.info "[Admin:Rake] Soft deleted plan ID #{plan.id}"
    else
      puts "Failed to delete plan: #{plan.errors.full_messages.to_sentence}"
      exit 1
    end
  end
end
