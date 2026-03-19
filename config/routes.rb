Rails.application.routes.draw do
  devise_for :users
  root 'home#index'
  resources :entries, only: [:index, :show, :create, :new, :destroy]
  resources :gallery, only: [:index]
end