# twamp

Fetch a user timeline from Twitter and process the tweets. Built-in mechanisms for:

* writing the JSON response to S3 or the local file system
* parsing and updating HTML files in place on S3 or the local file system

Runs on the command line with node.js or as an AWS Lambda function.

## What It's For

At it's core, twamp is designed to take a twitter screen name and a list of file paths (and/or S3 URIs)
and replace existing file contents with the content of the latest tweets from the provided screen name.

Updating a JSON file in an S3 bucket with static web hosting enabled is an effective way of providing an
API endpoint that responds with a twitter user timeline in JSON format without authentication or rate limits.
[Configure CORS](https://docs.aws.amazon.com/AmazonS3/latest/user-guide/add-cors-configuration.html)
on the S3 bucket to allow cross-domain ajax requests.

Updating HTML files in an S3 bucket with static web hosting enabled is an effective way of embedding the latest tweet(s)
in a static page. This is particularly useful for AMP-compatible static sites that prohibit custom JavaScript.
The process is compatible with the
[`<amp-twitter>` element](https://www.ampproject.org/docs/reference/components/amp-twitter)
but does not require it to be used.

## Behavior

When deployed, the Lambda function is triggered by a scheduled CloudWatch event that runs every 15 minutes by default.

When the Lambda function (or `twamp handle` command) is run, the latest tweets for the configured user are fetched
from Twitter and the specified files are processed in parallel (with a configurable concurrency limit).

When a JSON file is processed, the array of tweet objects is written to the file in JSON format
(with customizable indentation).

When an HTML file is processed, elements with the class `tweet-X` (where `X` is an integer, ex. `tweet-0`)
are updated to reflect the latest tweet(s).
The elements with class `tweet-0` are populated with data from the newest tweet.
The elements with class `tweet-1` are populated with data from the second newest tweet and so on.

* `.tweet-X` elements are given a `data-tweetid` value
* child elements with class `tweet-href` have their `href` attribute set to the tweet url
* child elements with class `tweet-text` have their `innerHTML` set to the tweet text
* child elements with class `tweet-screen_name` have their `innerHTML` set to the screen name that posted the tweet
* child elements with class `tweet-created_at` have their `innerHTML` set to the formatted date/time the tweet was posted

Files written to S3 have the `Cache-Control maxage` header set to the `frequency_minutes` option (converted to seconds)
so that browsers and CDNs do not keep stale versions.

## Examples

### Replace-In-Place

***index.html** before*

```html
<div class="tweet-0">
  <p class="tweet-text"></p>
  <p>@<span class="tweet-screen_name"></span></p>
</div>
```

*process **index.html** with twamp cli*

	twamp run --screen_name NASAGoddardPix --count 1 index.html

***index.html** after*

```html
<div class="tweet-0" data-tweetid="978966154080342016Z">
  <p class="tweet-text">&#x2018;Oumuamua is the first object we&#x2019;ve ever seen that entered from outside our solar system. Astrophysicists are using&#x2026; https://t.co/CyuV86yNgG</p>
  <p>@<span class="tweet-screen_name">NASAGoddardPix</span></p>
</div>
```

### Hugo

When generating an AMP-compatible static site with [hugo](https://gohugo.io),
you can use the following snippet to embed tweets: 

	{{ range $index, $tweet := $.Site.Data.tweets }}
	<amp-twitter class="tweet-{{ $index }}" width="384" height="256" layout="responsive" data-tweetid="{{ $tweet.id_str }}">
	  <blockquote placeholder>
	    <p class="tweet-text">{{ $tweet.text }}</p>
	    <p>
          &mdash; @<span class="tweet-screen_name">{{ $tweet.user.screen_name }}</span>
          <a href="https://twitter.com/{{ $tweet.user.screen_name }}/status/{{ $tweet.id_str }}" class="tweet-href">
          <small class="tweet-created_at">{{ dateFormat "3:04 PM UTC - Jan 2, 2006" $tweet.created_at }}</small>
          </a>
        </p>
      </blockquote>
    </amp-twitter>
	{{ end }}
                
Generate the **data/tweets.json** file:

	twamp run ./data/tweets.json

Upload the built site (the contents of the public folder) to S3 and deploy an instance of the twamp
AWS Lambda function to keep tweet values up to date in specified files without regenerating the entire hugo site.

## Getting Started

### Prerequisites

* [node.js](http://nodejs.org)
* [terraform](https://www.terraform.io) (to deploy AWS Lambda function)

### Installing

	npm install -g twamp

## Usage

Create a new directory for your project and `cd` into it from the command line.

### Configuration

A _consumer key_ and _consumer secret_ are required.
[Create a new app on Twitter](https://apps.twitter.com/) to generate these if needed.

An [application-only access token](https://developer.twitter.com/en/docs/basics/authentication/overview/application-only#issuing-application-only-requests)
(aka bearer token) is used to authorize requests to the Twitter API.

The `twamp` command provides the `bear` action to request an application-only access token:

    twamp bear --consumer_key YOUR_CONSUMER_KEY --consumer_secret YOUR_CONSUMER_SECRET > twamp.config.json

The configuration JSON is written to stdout (and in this case redirected to **twamp.config.json**).
Any additional command line arguments (`--screen_name`, etc) will be included in the output.

Note: The above command will overwrite any existing **twamp.config.json** file.
Use `sponge` from [moreutils](https://joeyh.name/code/moreutils/) to merge an existing **twamp.config.json** file
with any command line arguments and the requested `bearer_token`:

    twamp bear | sponge twamp.config.json

An example configuration file looks like this:

```js
{
  "consumer_key": "YOUR_CONSUMER_KEY",         // twitter app consumer key
  "consumer_secret": "YOUR_CONSUMER_SECRET",   // twitter app consumer secret
  "bearer_token": "YOUR_BEARER_TOKEN",         // twitter application-only access token
  "screen_name": "NASAGoddardPix",             // twitter screen name
  "count": "1",                                // how many tweets to fetch
  "concurrency": "10",                         // how many uris to process in parallel (default: 10)
  "json_indent": "0",                          // how many spaces to indent JSON content (default: 0)
  "frequency_minutes": "15",                   // how often to process uris, also sets Cache-Control maxage=frequency_minutes*60 (default: 15)
  "uri_separator": " ",                        // split uris string using this character (default: space)
  "uris": "s3://yourbucket.com/index.html",    // uris to process (s3 uris or local paths) separated by uri_separator
  "bucket_names": ["yourbucket.com"],          // names of S3 buckets to which the lambda function will be granted GetObject and PutObject permissions
  "date_format": "h:mm A [UTC] - MMM D, YYYY"  // format to use when outputting .tweet-created_at values (see http://momentjs.com/docs/#/displaying/format/)
}
```

See **variables.tf** for all supported options.

### CLI

The `twamp` command can be used to process files from the command line and dump output from Twitter to stdout.
Default option values are loaded from the from the **twamp.config.json** file in the current working directory
(if it exists) and may be overridden with command line arguments.

Use the `--cfg` argument with the `twamp` command to specify an alternate path to the **twamp.config.json** file.

Process uris defined in **twamp.config.json**:

	twamp handle

Process provided uris:
	
	twamp run ./index.html s3://yourbucket/foo.html
	
Fetch latest tweets for configured `screen_name` and print JSON to stdout:

	twamp fetch

Request bearer token using application credentials (see [Configuration](#configuration)):

	twamp bear --consumer_key YOUR_CONSUMER_KEY --consumer_secret YOUR_CONSUMER_SECRET

Output path to terraform module:

	twamp path

### Lambda

Create a file called **twamp.tf** using the following example contents as a guide.
Use `twamp path` to get the `source` value.
	
	provider "aws" {
	  region = "us-east-1"
	}
	
	module "twamp" {
	  source  = "/path/to/terraform/module"
	  bucket_names = "${var.bucket_names}"
	  consumer_key = "${var.consumer_key}"
	  consumer_secret = "${var.consumer_secret}"
	  bearer_token = "${var.bearer_token}"
	  screen_name = "${var.screen_name}"
	  count = "${var.count}"
	  concurrency = "${var.concurrency}"
	  uris = "${var.uris}"
	}
		
	variable "bucket_names" {
	  type = "list"
	}
	
	variable "consumer_key" {
	  type = "string"
	}
	
	variable "consumer_secret" {
	  type = "string"
	}
	
	variable "bearer_token" {
	  type = "string"
	}
	
	variable "screen_name" {
	  type = "string"
	}
	
	variable "count" {
	  type = "string"
	}
	
	variable "concurrency" {
	  type = "string"
	}
	
	variable "uris" {
	  type = "string"
	}

A `variable` definition must exist for every key in your **twamp.config.json** file.
Each variable value must be explicitly relayed to the module.
If you're not interested in sharing configuration options with the CLI, you can skip the `variable` definitions
and use literal values in the `twamp` module definition.

#### Deploy

The `terraform` command uses the default profile configured in **~/.aws/credentials**
unless the `--profile` parameter is used to specify another.
See [AWS CLI Getting Started](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)
if you've never run `aws configure`.

The following policies are sufficient to run the `terraform apply` and `terraform destroy` commands.
They should be attached to the default profile (or a group the default profile is in).
These can be made more restrictive by specifying specific resources.

* AmazonS3FullAccess
* CloudWatchEventsFullAccess
* Custom Policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "IAMStatement",
            "Effect": "Allow",
            "Action": [
                "iam:CreatePolicy",
                "iam:GetRole",
                "iam:ListInstanceProfilesForRole",
                "iam:PassRole",
                "iam:GetPolicy",
                "iam:DeleteRolePolicy",
                "iam:CreateRole",
                "iam:DeleteRole",
                "iam:PutRolePolicy",
                "iam:GetRolePolicy"
            ],
            "Resource": "*"
        },
        {
            "Sid": "LambdaStatement",
            "Effect": "Allow",
            "Action": [
                "lambda:*"
            ],
            "Resource": [
                "*"
            ]
        }
    ]
}
```

To deploy the code to AWS, run:

	terraform plan -var-file=twamp.config.json -out=terraform.tfplan    # create terraform plan 
   	terraform apply terraform.tfplan                                    # apply terraform plan

## Development

Follow these instructions to get a copy of the twamp source code for development.

1. Clone the repository and install the dependencies:

		git clone https://github.com/adamjarret/twamp.git
		cd twamp
		npm install   # installs package dependencies
    
2. Enable the `twamp` command globally (optional):

	* For node.js 8+ (npm 5+): `npm install -g file://.`
	* For node.js 6 (npm 3): `ln -s "$(pwd)/cli.js" /usr/local/bin/twamp && chmod +x /usr/local/bin/twamp`

At this point you should be able to run the `twamp` command.

Run `npm run build` to bundle Lambda function source code with webpack.

## Contributing

Fork the repo and submit a pull request.


## Author

[Adam Jarret](https://atj.me)


## License

This project is licensed under the MIT License. See the **LICENSE.txt** file for details.
