class GalleryController < ApplicationController
  before_action :authenticate_user!

  def index
    @entries = current_user.entries.includes(images_attachments: :blob, splats_attachments: :blob)
  end
end