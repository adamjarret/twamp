// lambda runtime environment
//  see https://docs.aws.amazon.com/lambda/latest/dg/API_CreateFunction.html#SSS-CreateFunction-request-Runtime
variable "runtime" {
  type = "string"
  default = "nodejs6.10"
}

// directory where compressed lambda source payload is output
variable "output_prefix" {
  type = "string"
  default = "./build/"
}

// path to main function source code file
//  %MODULE_PATH% is replaced by the real ${path.module} value when processing (use optional)
variable "fn_main_src" {
  type = "string"
  default = "%MODULE_PATH%/../dist/index.js"
}

// display name for deployed lambda function
variable "fn_main_name" {
  type = "string"
  default = "twamp"
}

// stop running after x seconds
variable "lambda_timeout" {
  type = "string"
  default = "20"
}

// this value will be used to create the cloudwatch scheduled trigger for the lambda
//  see https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
variable "frequency_minutes" {
  type = "string"
  default = "15"
}

// names of S3 buckets to which the lambda function will be granted GetObject and PutObject permissions
variable "bucket_names" {
  type = "list"
}

##
# Lambda Environment Variables

// twitter app consumer key
variable "consumer_key" {
  type = "string"
}

// twitter app consumer secret
variable "consumer_secret" {
  type = "string"
}

// twitter application-only access token
variable "bearer_token" {
  type = "string"
}

// twitter screen name
variable "screen_name" {
  type = "string"
}

// truncate user information
variable "trim_user" {
  type = "string"
  default = "0"
}

// how many tweets to fetch
variable "count" {
  type = "string"
  default = "1"
}

// how many URIs to process in parallel
variable "concurrency" {
  type = "string"
  default = "10"
}

// uris to process (S3 uris or local paths) separated by uri_separator
variable "uris" {
  type = "string"
}

// split uris string using this character
variable "uri_separator" {
  type = "string"
  default = " "
}

// format to use when outputting .tweet-created_at values (see http://momentjs.com/docs/#/displaying/format/)
variable "date_format" {
  type = "string"
  default = "h:mm A [UTC] - MMM D, YYYY"
}

// indentation level when outputting JSON files (default: "0", recommend "2" for human-readable JSON)
variable "json_indent" {
  type = "string"
  default = "0"
}
