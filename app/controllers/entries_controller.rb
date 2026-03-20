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
    
    if @entry.update(entry_params.except(:images))
      redirect_to entries_path, notice: "Journal saved!"
    else
      render :new
    end
  end

  def upload_image
    @entry = current_user.entries.where(created_at: Time.zone.now.beginning_of_day..Time.zone.now.end_of_day).first_or_create!(name: "Journal #{Date.today}")
    
    image = params[:image]
    if image
      @entry.images.attach(image)
      latest_blob = @entry.images.last.blob
      
      GenerateSplatJob.perform_later(@entry.id, latest_blob.id)
      
      render json: { 
        success: true, 
        image_url: rails_blob_path(latest_blob, only_path: true), 
        image_id: @entry.images.last.id 
      }
    else
      render json: { success: false }, status: :unprocessable_entity
    end
  end

  def delete_image
    image = ActiveStorage::Attachment.find_by(id: params[:image_id])
    
    if image
      filename = image.blob.filename.to_s
      system("pkill -f '#{filename}'")
      splat = image.record.splats.find { |s| s.filename.to_s.start_with?(image.filename.base) }
      splat&.purge
      image.purge
    end
    
    render json: { success: true }
  end

  def destroy
    @entry = current_user.entries.find(params[:id])
    @entry.destroy    
    redirect_to entries_path, notice: "Entry deleted."
  end

  private

  def entry_params
    params.require(:entry).permit(:name, :link, :content)
  end
end