class CommunityPostsController < ApplicationController
  before_action :authenticate_user!

  def index
    @posts = CommunityPost.includes(:user, image_attachment: :blob, splat_attachment: :blob).order(created_at: :desc)
  end

  def show
    @post = CommunityPost.find(params[:id])
  end

  def create
    img_attachment = ActiveStorage::Attachment.find_by(id: params[:image_id])
    
    if img_attachment
      if CommunityPost.exists?(original_image_id: img_attachment.id)
        render json: { success: false, error: "This image has already been posted to the community." }, status: :unprocessable_entity
        return
      end

      entry = img_attachment.record
      splat_attachment = entry.splats.attachments.find { |s| s.filename.to_s == "#{img_attachment.id}.splat" }

      post = current_user.community_posts.create!(original_image_id: img_attachment.id)
      
      post.image.attach(img_attachment.blob)
      post.splat.attach(splat_attachment.blob) if splat_attachment
      
      render json: { success: true }
    else
      render json: { success: false, error: "Image not found" }, status: :not_found
    end
  end

  def destroy
    @post = current_user.community_posts.find(params[:id])
    @post.destroy
    redirect_to community_posts_path, notice: "Post deleted from Community Gallery."
  end
end