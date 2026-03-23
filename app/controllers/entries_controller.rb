require 'net/http'
require 'uri'
require 'json'

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
                                   
    @entries_by_date.values.each { |entry| cleanup_orphaned_images(entry) }
  end

  def show
    @entry = current_user.entries.find(params[:id])
    cleanup_orphaned_images(@entry)
  end

  def new
    @entry = current_user.entries.where(created_at: Time.zone.now.beginning_of_day..Time.zone.now.end_of_day).first_or_initialize
    cleanup_orphaned_images(@entry) unless @entry.new_record?
  end

  def create
    @entry = current_user.entries.where(created_at: Time.zone.now.beginning_of_day..Time.zone.now.end_of_day).first_or_initialize
    @entry.assign_attributes(entry_params.except(:images))
    
    plain_text = ActionController::Base.helpers.strip_tags(@entry.content.to_s).gsub("&nbsp;", " ").strip
    
    if plain_text.present?
      sentiment_result = VaderSentimentRuby.polarity_scores(plain_text)
      compound = sentiment_result[:compound]
      @entry.sentiment = if compound >= 0.05
                           'Good'
                         elsif compound <= -0.05
                           'Bad'
                         else
                           'Neutral'
                         end
    else
      @entry.sentiment = 'Neutral'
    end

    if @entry.save
      cleanup_orphaned_images(@entry)
      GenerateTranscriptJob.perform_later(@entry.id) if plain_text.present?
      redirect_to entries_path, notice: "Journal saved!"
    else
      render :new
    end
  end

  def transcript
    @entry = current_user.entries.find(params[:id])
    render json: { transcript: @entry.transcript }
  end

  def upload_image
    @entry = current_user.entries.where(created_at: Time.zone.now.beginning_of_day..Time.zone.now.end_of_day).first_or_create!(name: "Journal #{Date.today}")
    
    pending_count = @entry.images.count - @entry.splats.count
    if pending_count >= 5
      render json: { success: false, error: "You can only process a maximum of 5 images at a time. Please wait for the current ones to finish processing." }, status: :too_many_requests
      return
    end

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
      
      failed_splat = image_attachment.record.splats.attachments.find { |s| s.filename.to_s == "#{image_attachment.id}.failed" }
      failed_splat&.purge

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

  def cleanup_orphaned_images(entry)
    return if entry.new_record?
    
    active_image_ids = entry.content.to_s.scan(/data-image-id=["']?(\d+)["']?/).flatten.map(&:to_i)
    
    entry.images.each do |img|
      unless active_image_ids.include?(img.id)
        filename = img.blob.filename.to_s
        system("pkill -f '#{filename}'")
        splat = entry.splats.attachments.find { |s| s.filename.to_s == "#{img.id}.ply" }
        splat&.purge
        
        failed_splat = entry.splats.attachments.find { |s| s.filename.to_s == "#{img.id}.failed" }
        failed_splat&.purge
        
        img.purge
      end
    end
  end
end