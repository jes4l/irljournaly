class Entry < ApplicationRecord
  belongs_to :user
  has_many_attached :images
  has_many_attached :splats
end