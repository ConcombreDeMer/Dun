require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'DunFoundationAI'
  s.version        = package['version']
  s.summary        = package['description'] || 'Dun local Foundation Models integration'
  s.description    = package['description'] || 'Local Expo module that wraps Apple Foundation Models for Dun.'
  s.license        = package['license'] || 'UNLICENSED'
  s.author         = package['author'] || 'Dun'
  s.homepage       = package['homepage'] || 'https://dun.app'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/dun/dun.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
