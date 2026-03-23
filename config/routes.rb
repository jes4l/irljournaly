Rails.application.routes.draw do
  devise_for :users
  root 'home#index'

  get '/build/three.module.js', to: redirect('https://unpkg.com/three/build/three.module.js')
  get '/examples/jsm/loaders/PLYLoader.js', to: redirect('https://unpkg.com/three/examples/jsm/loaders/PLYLoader.js')
  get '/build/gaussian-splats-3d.module.js', to: redirect('https://unpkg.com/@mkkellogg/gaussian-splats-3d/build/gaussian-splats-3d.module.js')
  get '/lib/index.js', to: redirect('https://unpkg.com/@mkkellogg/gaussian-splats-3d/lib/index.js')
  
  resources :entries, only: [:index, :show, :create, :new, :destroy] do
    member do
      get :transcript
    end
    collection do
      post :upload_image
    end
  end
  
  delete 'entries/delete_image/:image_id', to: 'entries#delete_image', as: :delete_image_entry
  post 'analyse/sentiment', to: 'analyse#sentiment'
  resources :community_posts, only: [:index, :show, :create, :destroy] 
end