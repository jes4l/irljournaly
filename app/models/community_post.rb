class CommunityPost < ApplicationRecord
  belongs_to :user
  has_one_attached :image
  has_one_attached :splat
end