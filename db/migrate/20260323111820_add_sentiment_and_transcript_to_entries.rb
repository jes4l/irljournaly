class AddSentimentAndTranscriptToEntries < ActiveRecord::Migration[7.2]
  def change
    add_column :entries, :sentiment, :string
    add_column :entries, :transcript, :text
  end
end
