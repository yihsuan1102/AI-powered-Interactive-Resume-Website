# ECR Push Scripts Usage Guide

This directory contains three scripts to automatically build and push your Docker image to AWS ECR:

## Prerequisites

1. **AWS CLI** installed and configured with appropriate permissions
2. **Docker** installed and running
3. **AWS Account ID** - you need to know your 12-digit AWS account ID

## Required Permissions

Your AWS user/role needs these ECR permissions:
- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`
- `ecr:GetDownloadUrlForLayer`
- `ecr:BatchGetImage`
- `ecr:DescribeRepositories`
- `ecr:CreateRepository`
- `ecr:InitiateLayerUpload`
- `ecr:UploadLayerPart`
- `ecr:CompleteLayerUpload`
- `ecr:PutImage`

## Script Options

### 1. Bash Script (Linux/macOS/WSL)
```bash
# Set required environment variable
export AWS_ACCOUNT_ID=123456789012

# Optional: customize these
export AWS_REGION=us-east-1
export ECR_REPOSITORY=resume-website
export IMAGE_TAG=latest

# Run the script
chmod +x push-to-ecr.sh
./push-to-ecr.sh
```

### 2. Windows Batch Script
```cmd
# Set required environment variable
set AWS_ACCOUNT_ID=123456789012

# Optional: customize these
set AWS_REGION=us-east-1
set ECR_REPOSITORY=resume-website
set IMAGE_TAG=latest

# Run the script
push-to-ecr.bat
```

### 3. PowerShell Script (Recommended for Windows)

#### Option A: Using .env file (Recommended)
```powershell
# 1. Copy the example env file
copy .env.example .env

# 2. Edit .env file with your AWS credentials
# notepad .env

# 3. Run the script (it will automatically load .env)
.\push-to-ecr.ps1
```

#### Option B: Using environment variables
```powershell
# Set required environment variable
$env:AWS_ACCOUNT_ID = "123456789012"

# Optional: customize these
$env:AWS_REGION = "us-east-1"
$env:ECR_REPOSITORY = "resume-website"
$env:IMAGE_TAG = "latest"

# Run the script
.\push-to-ecr.ps1
```

#### Option C: Using parameters directly
```powershell
.\push-to-ecr.ps1 -AwsAccountId "123456789012" -AwsRegion "us-east-1" -EcrRepository "my-app" -ImageTag "v1.0"
```

#### Option D: Using custom .env file
```powershell
.\push-to-ecr.ps1 -EnvFile "production.env"
```

## What the Scripts Do

1. **Authenticate** Docker with AWS ECR
2. **Check/Create** ECR repository if it doesn't exist
3. **Build** Docker image using your Dockerfile
4. **Tag** the image for ECR
5. **Push** the image to ECR
6. **Optional cleanup** of local images to save disk space

## Example Output

```
[INFO] Starting ECR push process...
[INFO] AWS Region: us-east-1
[INFO] ECR Repository: resume-website
[INFO] Image Tag: latest
[INFO] ECR URI: 123456789012.dkr.ecr.us-east-1.amazonaws.com/resume-website
[INFO] Authenticating Docker to ECR...
[INFO] Repository resume-website already exists
[INFO] Building Docker image...
[INFO] Tagging image for ECR...
[INFO] Pushing image to ECR...
[INFO] ✅ Successfully pushed image to ECR: 123456789012.dkr.ecr.us-east-1.amazonaws.com/resume-website:latest
```

## Troubleshooting

### Common Issues:

1. **"AWS_ACCOUNT_ID environment variable is required"**
   - Set your AWS account ID as shown above

2. **"AWS CLI is not installed"**
   - Install AWS CLI from https://aws.amazon.com/cli/

3. **"Docker is not running"**
   - Start Docker Desktop or Docker daemon

4. **Authentication failures**
   - Run `aws configure` to set up your credentials
   - Ensure your user has ECR permissions

5. **Repository creation fails**
   - Check if you have `ecr:CreateRepository` permission
   - Verify the repository name doesn't already exist in a different region

## Using with CI/CD

For automated deployments, you can use these scripts in your CI/CD pipeline by setting the environment variables in your pipeline configuration.