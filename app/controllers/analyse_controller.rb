class AnalyseController < ApplicationController
  def sentiment
    text = params[:text].to_s

    sentiment_result = VaderSentimentRuby.polarity_scores(text)
    compound = sentiment_result[:compound]
    
    mood = if compound >= 0.05
             'Good'
           elsif compound <= -0.05
             'Bad'
           else
             'Neutral'
           end
           
    render json: { mood: mood, score: compound }
  end
end