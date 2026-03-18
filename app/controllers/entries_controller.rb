class EntriesController < ApplicationController
  before_action :authenticate_user!

  def index
    @entries = Entry.all
  end

  def new
    @entry = Entry.new
  end

  def create
    @entry = Entry.new(entry_params)
    if @entry.save
      redirect_to entries_path
    else
      render :new
    end
  end

  def destroy
    Entry.find(params[:id]).destroy
    redirect_to entries_path
  end

  private

  def entry_params
    params.require(:entry).permit(:name, :link)
  end
end