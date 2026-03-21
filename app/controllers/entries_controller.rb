class EntriesController < ApplicationController
  before_action :authenticate_user!
  
  rescue_from ActiveRecord::RecordNotFound, with: :record_not_found

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
    
    if params[:image]
      blob = ActiveStorage::Blob.create_and_upload!(
        io: params[:image].open,
        filename: params[:image].original_filename,
        content_type: params[:image].content_type
      )
      
      @entry.images.attach(blob)
      attachment = @entry.images.attachments.find_by(blob_id: blob.id)
      
      GenerateSplatJob.perform_later(attachment.id)
      
      render json: { 
        success: true, 
        image_url: rails_blob_path(blob, only_path: true), 
        image_id: attachment.id 
      }
    else
      render json: { success: false }, status: :unprocessable_entity
    end
  end

  def delete_image
    image_attachment = ActiveStorage::Attachment.find_by(id: params[:image_id])
    
    if image_attachment
      filename = image_attachment.blob.filename.to_s
      system("pkill -f '#{filename}'")
      
      splat = image_attachment.record.splats.attachments.find { |s| s.filename.to_s == "#{image_attachment.id}.ply" }
      splat&.purge
      
      image_attachment.purge
    end
    
    render json: { success: true }
  end

  def destroy
    @entry = current_user.entries.find(params[:id])
    @entry.destroy    
    redirect_to entries_path, notice: "Entry deleted."
  end

  private

  def record_not_found
    redirect_to entries_path, alert: "Journal entry not found. It may have been deleted or doesn't exist yet."
  end

  def entry_params
    params.require(:entry).permit(:name, :link, :content)
  end
end