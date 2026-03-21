require 'tmpdir'
require 'fileutils'

class GenerateSplatJob < ApplicationJob
  queue_as :default

  def perform(attachment_id)
    attachment = ActiveStorage::Attachment.find_by(id: attachment_id)
    return unless attachment

    entry = attachment.record
    image_blob = attachment.blob

    Dir.mktmpdir do |tmp_dir|
      input_dir = File.join(tmp_dir, 'input_images')
      output_dir = File.join(tmp_dir, 'output_gaussians')
      FileUtils.mkdir_p(input_dir)
      FileUtils.mkdir_p(output_dir)

      input_file_path = File.join(input_dir, image_blob.filename.to_s)
      File.binwrite(input_file_path, image_blob.download)

      ml_sharp_path = "/Users/jesal.vadgama/Desktop/ml-sharp"
      command = "bash -c 'cd #{ml_sharp_path} && source venv/bin/activate && sharp predict -i #{input_dir} -o #{output_dir}'"
      
      system(command)

      ply_file = Dir.glob(File.join(output_dir, "*.ply")).first

      if ply_file && entry.reload && ActiveStorage::Attachment.exists?(id: attachment.id)
        entry.splats.attach(
          io: File.open(ply_file),
          filename: "#{attachment.id}.ply",
          content_type: 'application/octet-stream'
        )
      else
        Rails.logger.error("ML Sharp failed or image was deleted for #{image_blob.filename}")
      end
    end
  end
end