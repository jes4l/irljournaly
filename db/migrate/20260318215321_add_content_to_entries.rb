class AddContentToEntries < ActiveRecord::Migration[7.2]
  def change
    add_column :entries, :content, :text
  end
end
