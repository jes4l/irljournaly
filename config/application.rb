require_relative "boot"

require "rails/all"

Bundler.require(*Rails.groups)

module Irljournaly
  class Application < Rails::Application
    config.load_defaults 7.2

    config.autoload_lib(ignore: %w[assets tasks])

    config.action_dispatch.default_headers.merge!(
      'Cross-Origin-Opener-Policy' => 'same-origin',
      'Cross-Origin-Embedder-Policy' => 'require-corp'
    )
  end
end