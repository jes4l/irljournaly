class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
  
  has_many :entries, dependent: :destroy
  has_many :community_posts, dependent: :destroy

  validate :password_complexity

  def password_complexity
    return if password.blank? || password =~ /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,70}$/
    errors.add :password, "complexity requirement not met. Please use: 1 uppercase, 1 lowercase, 1 digit and 1 special character"
  end
end