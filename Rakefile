abort "Please use Ruby 1.9!" if RUBY_VERSION !~ /^1\.9/

require "bundler/setup"
require "erb"
require 'rake-pipeline'
require "colored"

def pipeline
  Rake::Pipeline::Project.new("Assetfile")
end

desc "Build cabernet.js"
task :dist => :clean do
  puts "Building Cabernet..."
  pipeline.invoke
  puts "Done"
end

desc "Clean build artifacts"
task :clean do
  puts "Cleaning build..."
  pipeline.clean
  puts "Done"
end

desc "Run tests with phantomjs"
task :test, [:suite] => :dist do |t, args|
  unless system("which phantomjs > /dev/null 2>&1")
    abort "PhantomJS is not installed. Download from http://phantomjs.org"
  end

  cmd = "phantomjs tests/vendor/qunit/run-qunit.js \"file://localhost#{File.dirname(__FILE__)}/tests/index.html\""

  # Run the tests
  puts "Running tests"
  success = system(cmd)

  if success
    puts "Tests Passed".green
  else
    puts "Tests Failed".red
    exit(1)
  end
end

task :default => :test
