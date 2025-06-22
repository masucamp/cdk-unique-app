#!/bin/bash

# Exit on error
set -e

echo "Deploying GeoTimeTracker application..."

# Install CDK dependencies
echo "Installing CDK dependencies..."
cd cdk
npm install

# Build CDK project
echo "Building CDK project..."
npm run build

# Deploy CDK stack
echo "Deploying CDK stack..."
npx cdk deploy --require-approval never

# Get outputs from CDK deployment
APPSYNC_URL=$(aws cloudformation describe-stacks --stack-name GeoTimeTrackerStack --query "Stacks[0].Outputs[?OutputKey=='GraphQLApiUrl'].OutputValue" --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name GeoTimeTrackerStack --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name GeoTimeTrackerStack --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)
MAP_NAME=$(aws cloudformation describe-stacks --stack-name GeoTimeTrackerStack --query "Stacks[0].Outputs[?OutputKey=='MapName'].OutputValue" --output text)
REGION=$(aws configure get region)

# Create .env file for React app
cd ../frontend
echo "Creating .env file for React app..."
cat > .env << EOL
REACT_APP_APPSYNC_URL=${APPSYNC_URL}
REACT_APP_APPSYNC_REGION=${REGION}
REACT_APP_USER_POOL_ID=${USER_POOL_ID}
REACT_APP_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}
REACT_APP_MAP_NAME=${MAP_NAME}
EOL

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Build frontend
echo "Building frontend..."
npm run build

echo "Deployment completed successfully!"
echo "You can now access your application through the Amplify URL provided in the CDK outputs."
echo "To run the device simulator, use the AWS Lambda console to invoke the SimulatorFunction."