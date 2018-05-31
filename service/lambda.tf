# Create a payload zip file from the Login function source code file
data "archive_file" "af_main" {
  type = "zip"
  source_file = "${replace(var.fn_main_src, "%MODULE_PATH%", path.module)}"
  output_path = "${var.output_prefix}${var.fn_main_name}.zip"
}

# Define the Login Lambda function
resource "aws_lambda_function" "fn_main" {
  function_name = "${var.fn_main_name}"
  handler = "${replace(basename(var.fn_main_src), ".js", "")}.handler"
  runtime = "${var.runtime}"
  filename = "${data.archive_file.af_main.output_path}"
  source_code_hash = "${base64sha256(file("${data.archive_file.af_main.output_path}"))}"
  role = "${aws_iam_role.lambda_default_role.arn}"
  timeout = "${var.lambda_timeout}"

  environment {
    variables = {
      consumer_key = "${var.consumer_key}"
      consumer_secret = "${var.consumer_secret}"
      bearer_token = "${var.bearer_token}"
      screen_name = "${var.screen_name}"
      trim_user = "${var.trim_user}"
      count = "${var.count}"
      uris = "${var.uris}"
      uri_separator = "${var.uri_separator}"
      concurrency = "${var.concurrency}"
      frequency_minutes = "${var.frequency_minutes}"
      date_format = "${var.date_format}"
      json_indent = "${var.json_indent}"
    }
  }
}

resource "aws_cloudwatch_event_rule" "every_x_minutes" {
  name = "trigger_${var.fn_main_name}"
  description = "Fires every ${var.frequency_minutes} minutes"
  schedule_expression = "rate(${var.frequency_minutes} minutes)"
}

resource "aws_cloudwatch_event_target" "invoke_main_every_x_minutes" {
  rule = "${aws_cloudwatch_event_rule.every_x_minutes.name}"
  target_id = "fn_main"
  arn = "${aws_lambda_function.fn_main.arn}"
}

resource "aws_lambda_permission" "allow_cloudwatch_to_invoke_main" {
  statement_id = "AllowExecutionFromCloudWatch"
  action = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.fn_main.function_name}"
  principal = "events.amazonaws.com"
  source_arn = "${aws_cloudwatch_event_rule.every_x_minutes.arn}"
}