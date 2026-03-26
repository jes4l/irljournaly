require "test_helper"

class AnalyseControllerTest < ActionDispatch::IntegrationTest
  test "should return Good mood for extremely positive text" do
    post "/analyse/sentiment", params: { text: "I am so incredibly happy and everything is amazing today!" }, as: :json
    
    assert_response :success
    json_response = JSON.parse(response.body)
    
    assert_equal "Good", json_response["mood"]
    assert json_response["score"] >= 0.05
  end

  test "should return Bad mood for heavily negative text" do
    post "/analyse/sentiment", params: { text: "I am furious, sad, and having a terrible day." }, as: :json
    
    assert_response :success
    json_response = JSON.parse(response.body)
    
    assert_equal "Bad", json_response["mood"]
    assert json_response["score"] <= -0.05
  end
end