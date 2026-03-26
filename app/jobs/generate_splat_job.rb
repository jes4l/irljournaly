require 'tmpdir'
require 'fileutils'
require 'timeout'

class GenerateSplatJob < ApplicationJob
  queue_as :default
  
  retry_on Timeout::Error, wait: :exponentially_longer, attempts: 3

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
      
      pid = nil
      begin
        Timeout.timeout(1800) do
          pid = Process.spawn(command, pgroup: true)
          Process.wait(pid)
        end
      rescue Timeout::Error
        Rails.logger.error("ML Sharp timed out for #{image_blob.filename} after 30 minutes")
        if pid
          begin
            Process.kill("-TERM", Process.getpgid(pid))
          rescue
            nil
          end
        end
        raise Timeout::Error
      end

      ply_file = Dir.glob(File.join(output_dir, "*.ply")).first
      splat_file = File.join(output_dir, "output.splat")

      if ply_file
        conversion_script = Rails.root.join("lib", "ply_to_splat.py")
        conversion_command = "bash -c 'cd #{ml_sharp_path} && source venv/bin/activate && python #{conversion_script} #{ply_file} #{splat_file}'"
        system(conversion_command)
      end

      if File.exist?(splat_file) && entry.reload && ActiveStorage::Attachment.exists?(id: attachment.id)
        entry.splats.attach(
          io: File.open(splat_file),
          filename: "#{attachment.id}.splat",
          content_type: 'application/octet-stream'
        )
      else
        Rails.logger.error("ML Sharp or conversion failed for #{image_blob.filename}")
        
        if entry.reload && ActiveStorage::Attachment.exists?(id: attachment.id)
          dummy_file_path = File.join(output_dir, "failed.txt")
          File.write(dummy_file_path, "failed")
          entry.splats.attach(
            io: File.open(dummy_file_path),
            filename: "#{attachment.id}.failed",
            content_type: 'text/plain'
          )
        end
      end
    end
  end
end