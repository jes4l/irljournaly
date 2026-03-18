class EntriesController < ApplicationController
  before_action :authenticate_user!

  def index
    @entries = current_user.entries.with_attached_images
  end

  def new
    @entry = Entry.new
  end

  def create
    @entry = current_user.entries.build(entry_params)
    
    if @entry.save
      redirect_to entries_path
    else
      render :new
    end
  end

  def destroy
    @entry = current_user.entries.find(params[:id])
    @entry.destroy    
    redirect_to entries_path
  end

  private

  def entry_params
    params.require(:entry).permit(:name, :link, images: [])
  end
end