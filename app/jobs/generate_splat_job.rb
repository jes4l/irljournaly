require 'tmpdir'
require 'fileutils'

class GenerateSplatJob < ApplicationJob
  queue_as :default

  def perform(entry_id, image_blob_id)
    entry = Entry.find(entry_id)
    image = ActiveStorage::Blob.find(image_blob_id)

    Dir.mktmpdir do |tmp_dir|
      input_dir = File.join(tmp_dir, 'input_images')
      output_dir = File.join(tmp_dir, 'output_gaussians')
      FileUtils.mkdir_p(input_dir)
      FileUtils.mkdir_p(output_dir)

      input_file_path = File.join(input_dir, image.filename.to_s)
      File.binwrite(input_file_path, image.download)

      # Run your exact local ml-sharp pipeline
      ml_sharp_path = "/Users/jesal.vadgama/Desktop/ml-sharp"
      command = "bash -c 'cd #{ml_sharp_path} && source venv/bin/activate && sharp predict -i #{input_dir} -o #{output_dir}'"
      
      system(command)

      # Find the generated .ply file (ml-sharp usually names it after the input stem)
      ply_file = Dir.glob(File.join(output_dir, "*.ply")).first

      if ply_file
        # Attach the generated Gaussian Splat to the entry
        entry.splats.attach(
          io: File.open(ply_file),
          filename: "#{image.filename.base}.ply",
          content_type: 'application/octet-stream'
        )
      else
        Rails.logger.error("ML Sharp failed to generate a PLY file for #{image.filename}")
      end
    end
  end
end