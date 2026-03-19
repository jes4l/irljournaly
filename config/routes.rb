Rails.application.routes.draw do
  devise_for :users
  root 'home#index'
  resources :entries, only: [:index, :show, :create, :new, :destroy] do
    collection do
      post :upload_image
    end
  end
  
  delete 'entries/delete_image/:image_id', to: 'entries#delete_image', as: :delete_image_entry
end