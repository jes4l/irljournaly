require "test_helper"
require "tempfile"

class EntriesControllerTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @user = User.create!(
      email: "test_upload#{Time.now.to_i}@example.com", 
      password: "Password1!", 
      first_name: "Test", 
      last_name: "User"
    )
    sign_in @user
  end

  test "should successfully upload an image, schedule a job, and clean up the file" do
    temp_img = Tempfile.new(['test_image', '.png'])
    temp_img.write("fake image data")
    temp_img.rewind
    file_upload = Rack::Test::UploadedFile.new(temp_img.path, 'image/png')

    assert_enqueued_with(job: GenerateSplatJob) do
      post upload_image_entries_url, params: { image: file_upload }
    end

    assert_response :success
    json_response = JSON.parse(response.body)
    
    assert json_response["success"], "Expected successful JSON response"
    assert_not_nil json_response["image_id"], "Expected an image_id to be returned"

    temp_img.close
    temp_img.unlink
  end
end