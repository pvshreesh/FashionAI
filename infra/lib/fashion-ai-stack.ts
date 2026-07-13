import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { StageConfig } from './stage-config';

export interface FashionAiStackProps extends cdk.StackProps {
  config: StageConfig;
}

export class FashionAiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FashionAiStackProps) {
    super(scope, id, props);

    const { config } = props;
    const prefix = `${config.projectName}-${config.stageName}`;
    const retainInProd = config.stageName === 'prod';

    cdk.Tags.of(this).add('Project', config.projectName);
    cdk.Tags.of(this).add('Stage', config.stageName);

    const imageBucket = new s3.Bucket(this, 'ImagesBucket', {
      bucketName: `${prefix}-images-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      cors: [{
        allowedHeaders: ['*'],
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.HEAD],
        allowedOrigins: ['*'],
        exposedHeaders: ['ETag']
      }],
      removalPolicy: retainInProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !retainInProd
    });

    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `${prefix}-users`,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: retainInProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    const wardrobeTable = new dynamodb.Table(this, 'WardrobeTable', {
      tableName: `${prefix}-wardrobe`,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'itemId',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: retainInProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    const ecrRepository = new ecr.Repository(this, 'BackendRepository', {
      repositoryName: `${prefix}-backend`,
      imageScanOnPush: true,
      removalPolicy: retainInProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: !retainInProd
    });

    const backendRuntimeSecretName = `${prefix}/backend/runtime`;
    const appSecret = secretsmanager.Secret.fromSecretNameV2(this, 'BackendSecret', backendRuntimeSecretName);
    const githubTokenSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GitHubTokenSecret', config.githubTokenSecretName);

    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${prefix}-users`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true }
      },
      passwordPolicy: {
        minLength: 8,
        requireSymbols: false
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: retainInProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    const userPoolClient = userPool.addClient('AppClient', {
      userPoolClientName: `${prefix}-web-client`,
      authFlows: {
        userPassword: true,
        userSrp: true
      },
      generateSecret: false
    });

    const appRunnerAccessRole = new iam.Role(this, 'AppRunnerEcrAccessRole', {
      assumedBy: new iam.ServicePrincipal('build.apprunner.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSAppRunnerServicePolicyForECRAccess')
      ]
    });

    const appRunnerInstanceRole = new iam.Role(this, 'AppRunnerInstanceRole', {
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com')
    });

    imageBucket.grantReadWrite(appRunnerInstanceRole);
    usersTable.grantReadWriteData(appRunnerInstanceRole);
    wardrobeTable.grantReadWriteData(appRunnerInstanceRole);
    appSecret.grantRead(appRunnerInstanceRole);

    const appRunnerService = new apprunner.CfnService(this, 'BackendService', {
      serviceName: `${prefix}-api`,
      sourceConfiguration: {
        authenticationConfiguration: {
          accessRoleArn: appRunnerAccessRole.roleArn
        },
        autoDeploymentsEnabled: false,
        imageRepository: {
          imageIdentifier: `${ecrRepository.repositoryUri}:${config.backendImageTag}`,
          imageRepositoryType: 'ECR',
          imageConfiguration: {
            port: '3000',
            runtimeEnvironmentVariables: [
              { name: 'NODE_ENV', value: 'production' },
              { name: 'PORT', value: '3000' },
              { name: 'AUTH_PROVIDER', value: 'cognito' },
              { name: 'DATABASE_PROVIDER', value: 'dynamodb' },
              { name: 'STORAGE_PROVIDER', value: 's3' },
              { name: 'WARDROBE_MODE', value: 'per-user' },
              { name: 'AWS_REGION', value: config.region },
              { name: 'COGNITO_REGION', value: config.region },
              { name: 'COGNITO_USER_POOL_ID', value: userPool.userPoolId },
              { name: 'COGNITO_APP_CLIENT_ID', value: userPoolClient.userPoolClientId },
              { name: 'S3_BUCKET_NAME', value: imageBucket.bucketName },
              { name: 'DYNAMODB_USERS_TABLE', value: usersTable.tableName },
              { name: 'DYNAMODB_WARDROBE_TABLE', value: wardrobeTable.tableName }
            ],
            runtimeEnvironmentSecrets: [
              {
                name: 'GEMINI_API_KEY',
                value: `${appSecret.secretArn}:GEMINI_API_KEY::`
              }
            ]
          }
        }
      },
      instanceConfiguration: {
        cpu: config.appRunnerCpu,
        memory: config.appRunnerMemory,
        instanceRoleArn: appRunnerInstanceRole.roleArn
      },
      networkConfiguration: {
        ingressConfiguration: {
          isPubliclyAccessible: true
        }
      },
      healthCheckConfiguration: {
        protocol: 'HTTP',
        path: '/health',
        healthyThreshold: 1,
        unhealthyThreshold: 5,
        interval: 10,
        timeout: 5
      }
    });

    const amplifyApp = new amplify.CfnApp(this, 'FrontendApp', {
      name: `${prefix}-frontend`,
      repository: `https://github.com/${config.repoOwner}/${config.repoName}`,
      accessToken: githubTokenSecret.secretValueFromJson('token').unsafeUnwrap(),
      platform: 'WEB',
      buildSpec: [
        'version: 1',
        'frontend:',
        '  phases:',
        '    build:',
        '      commands:',
        '        - mkdir -p dist',
        '        - cp -r code/app/* dist/',
        '        - printf "window.__FASHION_CONFIG__ = { apiBaseUrl: \\"%s\\" };\\n" "$API_BASE_URL" > dist/config.js',
        '  artifacts:',
        '    baseDirectory: dist',
        '    files:',
        "      - '**/*'"
      ].join('\n'),
      environmentVariables: [
        {
          name: 'API_BASE_URL',
          value: `https://${appRunnerService.attrServiceUrl}`
        }
      ]
    });

    const amplifyBranch = new amplify.CfnBranch(this, 'FrontendBranch', {
      appId: amplifyApp.attrAppId,
      branchName: config.repoBranch,
      stage: config.stageName === 'prod' ? 'PRODUCTION' : config.stageName === 'staging' ? 'BETA' : 'DEVELOPMENT',
      enableAutoBuild: true
    });

    new cdk.CfnOutput(this, 'ImagesBucketNameOutput', { value: imageBucket.bucketName });
    new cdk.CfnOutput(this, 'UsersTableNameOutput', { value: usersTable.tableName });
    new cdk.CfnOutput(this, 'WardrobeTableNameOutput', { value: wardrobeTable.tableName });
    new cdk.CfnOutput(this, 'BackendRepositoryUriOutput', { value: ecrRepository.repositoryUri });
    new cdk.CfnOutput(this, 'BackendSecretNameOutput', { value: backendRuntimeSecretName });
    new cdk.CfnOutput(this, 'CognitoUserPoolIdOutput', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'CognitoAppClientIdOutput', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'BackendServiceUrlOutput', { value: `https://${appRunnerService.attrServiceUrl}` });
    new cdk.CfnOutput(this, 'FrontendAmplifyAppIdOutput', { value: amplifyApp.attrAppId });
    new cdk.CfnOutput(this, 'FrontendBranchOutput', { value: amplifyBranch.branchName });
  }
}
