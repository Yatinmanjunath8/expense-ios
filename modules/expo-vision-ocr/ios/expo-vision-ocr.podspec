require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'expo-vision-ocr'
  s.version        = package['version']
  s.summary        = package['description'] || 'Expo Vision OCR'
  s.description    = package['description'] || 'Expo Vision OCR'
  s.license        = package['license'] || 'MIT'
  s.author         = package['author'] || 'Author'
  s.homepage       = package['homepage'] || 'https://github.com/expo/expo'
  s.platform       = :ios, '13.0'
  s.swift_version  = '5.4'
  s.source         = { git: 'https://github.com/expo/expo.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
