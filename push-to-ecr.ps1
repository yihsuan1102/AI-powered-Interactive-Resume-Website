# ECR Push Script for Resume Website (PowerShell)
# This script builds and pushes the Docker image to AWS ECR

param(
    [string]$EnvFile = ".env",
    [string]$AwsRegion = $env:AWS_REGION,
    [string]$EcrRepository = $env:ECR_REPOSITORY,
    [string]$ImageTag = $env:IMAGE_TAG,
    [string]$AwsAccountId = $env:AWS_ACCOUNT_ID
)

# Function to load environment variables from .env file
function Load-EnvFile {
    param([string]$FilePath)

    if (Test-Path $FilePath) {
        Write-Status "Loading environment variables from $FilePath"

        Get-Content $FilePath | ForEach-Object {
            $line = $_.Trim()

            # Skip empty lines and comments
            if ($line -and !$line.StartsWith('#')) {
                # Handle lines with = sign
                if ($line -match '^([^=]+)=(.*)$') {
                    $name = $matches[1].Trim()
                    $value = $matches[2].Trim()

                    # Remove quotes if present
                    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
                        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                        $value = $value.Substring(1, $value.Length - 2)
                    }

                    # Set environment variable for current session
                    Set-Item -Path "env:$name" -Value $value
                    Write-Host "  Loaded: $name" -ForegroundColor Cyan
                }
            }
        }
    } else {
        Write-Warning ".env file not found at $FilePath"
        Write-Host "Create a .env file with your AWS credentials. Example:" -ForegroundColor Yellow
        Write-Host "AWS_ACCOUNT_ID=123456789012" -ForegroundColor Yellow
        Write-Host "AWS_REGION=us-east-1" -ForegroundColor Yellow
        Write-Host "ECR_REPOSITORY=resume-website" -ForegroundColor Yellow
        Write-Host "IMAGE_TAG=latest" -ForegroundColor Yellow
    }
}

# Load .env file first
Load-EnvFile -FilePath $EnvFile

# Re-read environment variables after loading .env file
if (-not $AwsRegion) { $AwsRegion = $env:AWS_REGION }
if (-not $EcrRepository) { $EcrRepository = $env:ECR_REPOSITORY }
if (-not $ImageTag) { $ImageTag = $env:IMAGE_TAG }
if (-not $AwsAccountId) { $AwsAccountId = $env:AWS_ACCOUNT_ID }

# Set default values if still not provided
if (-not $AwsRegion) { $AwsRegion = "us-east-1" }
if (-not $EcrRepository) { $EcrRepository = "resume-website" }
if (-not $ImageTag) { $ImageTag = "latest" }

# Function to write colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if required variables are set
if (-not $AwsAccountId) {
    Write-Error "AWS_ACCOUNT_ID is required"
    Write-Host "Example: `$env:AWS_ACCOUNT_ID = '123456789012'" -ForegroundColor Cyan
    exit 1
}

# Construct ECR repository URI
$EcrUri = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/$EcrRepository"

Write-Status "Starting ECR push process..."
Write-Status "AWS Region: $AwsRegion"
Write-Status "ECR Repository: $EcrRepository"
Write-Status "Image Tag: $ImageTag"
Write-Status "ECR URI: $EcrUri"

# Check if AWS CLI is installed
try {
    $null = Get-Command aws -ErrorAction Stop
} catch {
    Write-Error "AWS CLI is not installed. Please install it first."
    exit 1
}

# Check if Docker is running
try {
    $null = docker info 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed"
    }
} catch {
    Write-Error "Docker is not running. Please start Docker first."
    exit 1
}

# Authenticate Docker to ECR
Write-Status "Authenticating Docker to ECR..."
try {
    $loginToken = aws ecr get-login-password --region $AwsRegion
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to get ECR login token"
    }

    $loginToken | docker login --username AWS --password-stdin $EcrUri
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to login to ECR"
    }
} catch {
    Write-Error "Failed to authenticate with ECR: $_"
    exit 1
}

# Check if ECR repository exists, create if it doesn't
Write-Status "Checking if ECR repository exists..."
try {
    $null = aws ecr describe-repositories --repository-names $EcrRepository --region $AwsRegion 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Repository $EcrRepository does not exist. Creating it..."
        aws ecr create-repository --repository-name $EcrRepository --region $AwsRegion
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create repository"
        }
        Write-Status "Repository $EcrRepository created successfully"
    } else {
        Write-Status "Repository $EcrRepository already exists"
    }
} catch {
    Write-Error "Failed to handle ECR repository: $_"
    exit 1
}

# Build the Docker image
Write-Status "Building Docker image..."
try {
    docker build -t "${EcrRepository}:${ImageTag}" .
    if ($LASTEXITCODE -ne 0) {
        throw "Docker build failed"
    }
} catch {
    Write-Error "Failed to build Docker image: $_"
    exit 1
}

# Tag the image for ECR
Write-Status "Tagging image for ECR..."
try {
    docker tag "${EcrRepository}:${ImageTag}" "${EcrUri}:${ImageTag}"
    if ($LASTEXITCODE -ne 0) {
        throw "Docker tag failed"
    }
} catch {
    Write-Error "Failed to tag image: $_"
    exit 1
}

# Push the image to ECR
Write-Status "Pushing image to ECR..."
try {
    docker push "${EcrUri}:${ImageTag}"
    if ($LASTEXITCODE -ne 0) {
        throw "Docker push failed"
    }
} catch {
    Write-Error "Failed to push image to ECR: $_"
    exit 1
}

Write-Status "✅ Successfully pushed image to ECR: ${EcrUri}:${ImageTag}"

# Optional: Clean up local images to save space
$cleanup = Read-Host "Do you want to remove local Docker images to save space? (y/n)"
if ($cleanup -eq 'y' -or $cleanup -eq 'Y') {
    Write-Status "Cleaning up local images..."
    try {
        docker rmi "${EcrRepository}:${ImageTag}" "${EcrUri}:${ImageTag}"
        Write-Status "Local images cleaned up"
    } catch {
        Write-Warning "Failed to clean up some local images"
    }
}

Write-Status "ECR push process completed!"