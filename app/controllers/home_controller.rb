class HomeController < ApplicationController
  def index
    if user_signed_in?
      redirect_to entries_path
    end
  end
end