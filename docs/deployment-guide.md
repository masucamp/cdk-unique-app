# Deployment Guide

This guide provides step-by-step instructions for deploying the Content Recommendation System using AWS CDK.

## Prerequisites

Before you begin, ensure you have the following:

1. **AWS Account**: You need an AWS account with permissions to create resources.

2. **AWS CLI**: Install and configure the AWS CLI with credentials that have appropriate permissions.
   ```bash
   aws configure
   ```

3. **Node.js and npm**: Install Node.js (version 14.x or later) and npm.
   ```bash
   # Check versions
   node --version
   npm --version
   ```

4. **AWS CDK**: Install the AWS CDK toolkit globally.
   ```bash
   npm install -g aws-cdk
   cdk --version
   ```

## Deployment Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd aws-maniac-services-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Bootstrap CDK (First-time only)

If you haven't used CDK in your AWS account/region before, you need to bootstrap it:

```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

### 4. Update the Web Frontend Configuration

Before deploying, you need to update the frontend configuration after deployment to use the actual AppSync API URL and API key.

### 5. Deploy the Stack

```bash
cdk deploy
```

This command will:
- Create a VPC for Neptune
- Deploy a Neptune cluster and instance
- Create a Lambda function for text analysis
- Set up an AppSync GraphQL API
- Deploy a website to S3 with CloudFront distribution

The deployment may take 20-30 minutes, primarily due to the Neptune cluster creation.

### 6. Note the Outputs

After deployment completes, CDK will output important information:

- **GraphQLAPIURL**: The URL of your GraphQL API
- **GraphQLAPIKey**: The API key for authentication
- **WebsiteURL**: The URL of your deployed website

### 7. Update the Web Frontend

After deployment, you need to update the frontend with the actual API URL and key:

1. Download the `index.html` file from the S3 bucket
2. Update these lines with the actual values from the CDK output:
   ```javascript
   const API_URL = 'API_URL_PLACEHOLDER';
   const API_KEY = 'API_KEY_PLACEHOLDER';
   ```
3. Upload the updated file back to the S3 bucket

## Testing the Deployment

1. Open the WebsiteURL in your browser
2. Enter some text in the text area and click "Analyze Text"
3. View the extracted entities and sentiment analysis
4. Select an entity type and click "Get Recommendations" to see related content

## Cleanup

To avoid incurring charges, delete the resources when you're done:

```bash
cdk destroy
```

Note: This will delete all resources created by the stack, including the Neptune database and any stored data.

## Troubleshooting

### Common Issues

1. **VPC Limits**: If you encounter VPC-related errors, you might have reached your VPC limit. Delete unused VPCs or request a limit increase.

2. **Neptune Connectivity**: If the Lambda function can't connect to Neptune, check the security group rules and VPC configuration.

3. **CORS Issues**: If you encounter CORS errors when calling the API from the frontend, ensure the AppSync API has the appropriate CORS configuration.

4. **Lambda Timeout**: If text analysis times out, consider increasing the Lambda function timeout or breaking the text into smaller chunks.

### Logs and Debugging

- **Lambda Logs**: Check CloudWatch Logs for the Lambda function
- **AppSync Logs**: Enable logging for AppSync and check CloudWatch Logs
- **Neptune Audit Logs**: Enable audit logging for Neptune if needed

## Cost Considerations

The main cost drivers in this architecture are:

1. **Neptune**: The Neptune cluster and instance (~$0.35/hour for db.t3.medium)
2. **Lambda**: Charged based on invocations and execution time
3. **Comprehend**: Charged per unit of text analyzed
4. **AppSync**: Charged per query and real-time operations
5. **CloudFront**: Charged for data transfer

To minimize costs:
- Use the smallest Neptune instance size that meets your needs
- Consider deleting the stack when not in use for development/testing
- Monitor usage and set up AWS Budgets alerts