Rails.application.routes.draw do
  devise_for :users
  root 'home#index'
  resources :entries, only: [:index, :create, :new, :destroy]
end