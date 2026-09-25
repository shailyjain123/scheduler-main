class ChangeEventsConstraints < ActiveRecord::Migration[8.1]
  def change
    change_column_null :events, :title, false
    change_column_null :events, :start_time, false
    change_column_null :events, :end_time, false
    change_column_default :events, :status, 'scheduled'
    change_column_null :events, :status, false
  end
end
