data "aws_iam_policy_document" "lambda_assume_role_policy_document" {
  statement {
    sid = "AssumeRole"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# Create a role for Lamba functions to assume when executing.
resource "aws_iam_role" "lambda_default_role" {
  name = "lambda_${var.fn_main_name}"
  assume_role_policy = "${data.aws_iam_policy_document.lambda_assume_role_policy_document.json}"
}

data "aws_iam_policy_document" "lambda_default_role_policy_document" {
  statement {
    sid = "AllowLogging"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["*"]
  }

  statement {
    sid = "AllowS3"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
    ]
    resources = "${formatlist("arn:aws:s3:::%s/*", var.bucket_names)}"
  }
}

# Grant access to resources needed by the Lambda functions in the inline policy for the role.
resource "aws_iam_role_policy" "lambda_default_role_policy" {
  role = "${aws_iam_role.lambda_default_role.id}"
  policy = "${data.aws_iam_policy_document.lambda_default_role_policy_document.json}"
}