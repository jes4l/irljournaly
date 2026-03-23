class CreateCommunityPosts < ActiveRecord::Migration[7.2]
  def change
    create_table :community_posts do |t|
      t.references :user, null: false, foreign_key: true
      t.integer :original_image_id

      t.timestamps
    end
  end
end
