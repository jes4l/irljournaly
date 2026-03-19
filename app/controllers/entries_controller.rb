class EntriesController < ApplicationController
  before_action :authenticate_user!

  def index
    @current_date = params[:date] ? Date.parse(params[:date]) : Date.today
    start_date = @current_date.beginning_of_month.beginning_of_week(:sunday)
    end_date = @current_date.end_of_month.end_of_week(:sunday)
    
    @entries_by_date = current_user.entries
                                   .where(created_at: start_date.beginning_of_day..end_date.end_of_day)
                                   .index_by { |e| e.created_at.to_date }
  end

  def show
    @entry = current_user.entries.find(params[:id])
  end

  def new
    @entry = current_user.entries.where(created_at: Time.zone.now.beginning_of_day..Time.zone.now.end_of_day).first_or_initialize
  end

  def create
    @entry = current_user.entries.where(created_at: Time.zone.now.beginning_of_day..Time.zone.now.end_of_day).first_or_initialize
    
    if @entry.update(entry_params)
      if @entry.images.attached?
        @entry.images.each do |image|
          GenerateSplatJob.perform_later(@entry.id, image.blob_id)
        end
      end
      
      redirect_to entries_path, notice: "Journal saved successfully!"
    else
      render :new
    end
  end

  def destroy
    @entry = current_user.entries.find(params[:id])
    @entry.destroy    
    redirect_to entries_path, notice: "Entry deleted."
  end

  private

  def entry_params
    params.require(:entry).permit(:name, :link, :content, images: [])
  end
end