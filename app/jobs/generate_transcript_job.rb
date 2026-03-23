require 'net/http'
require 'uri'
require 'json'

class GenerateTranscriptJob < ApplicationJob
  queue_as :default

  def perform(entry_id)
    entry = Entry.find_by(id: entry_id)
    return unless entry && entry.content.present?

    plain_text = ActionController::Base.helpers.strip_tags(entry.content.to_s).gsub("&nbsp;", " ").strip
    return if plain_text.blank? || ENV["GROQ_API_KEY"].blank?

    date_str = entry.created_at.strftime("%-d of %B today")
    prefix = "It is the #{date_str}, and I "

    uri = URI("https://api.groq.com/openai/v1/chat/completions")
    request = Net::HTTP::Post.new(uri)
    request["Authorization"] = "Bearer #{ENV['GROQ_API_KEY']}"
    request["Content-Type"] = "application/json"
    request.body = {
      model: "llama-3.1-8b-instant",
      messages: [
        { 
          role: "system", 
          content: "You are a warm, reflective human writing in your personal diary. Your only job is to connect the user's rough, fragmented notes into a smooth, cohesive, naturally flowing first-person paragraph. CRITICAL RULES: 1. Do absolutely NOT invent, hallucinate, or add ANY fake events, objects, locations, or details that are not explicitly mentioned in the notes. 2. If the notes are simple contradictions (e.g., 'having a good day' followed by 'having a terrible day'), just smoothly explain the transition (e.g., 'started off having a good day, but then things took a turn for the worse...'). 3. Fix spelling and grammar. 4. Start your response directly with the action or feeling (e.g., 'woke up feeling great...' or 'spilled my drink...'). Do NOT start with the word 'I'." 
        },
        { 
          role: "user", 
          content: "Here are my rough notes. Please turn them into my journal entry, connecting the thoughts smoothly without adding any fake details: #{plain_text}" 
        }
      ],
      temperature: 0.3
    }.to_json

    response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
      http.request(request)
    end

    if response.is_a?(Net::HTTPSuccess)
      json_resp = JSON.parse(response.body)
      raw_transcript = json_resp.dig("choices", 0, "message", "content").to_s.strip
      raw_transcript = raw_transcript.gsub(/^(I\s+|It is.*?and I\s+)/i, '').strip
      raw_transcript = raw_transcript[0].downcase + raw_transcript[1..-1] if raw_transcript.length > 0
      final_transcript = "#{prefix}#{raw_transcript}"
      entry.update_column(:transcript, final_transcript)
    end
  end
end