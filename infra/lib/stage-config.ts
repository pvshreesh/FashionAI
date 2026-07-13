import * as cdk from 'aws-cdk-lib';

export type StageName = 'dev' | 'staging' | 'prod';

export interface StageConfig {
  stageName: StageName;
  region: string;
  projectName: string;
  repoOwner: string;
  repoName: string;
  repoBranch: string;
  githubTokenSecretName: string;
  backendImageTag: string;
  appRunnerCpu: string;
  appRunnerMemory: string;
}

export const stageNames: StageName[] = ['dev', 'staging', 'prod'];

function contextValue(app: cdk.App, key: string, fallback: string): string {
  const value = app.node.tryGetContext(key);
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function getStageConfig(stageName: StageName, app: cdk.App): StageConfig {
  const projectName = contextValue(app, 'projectName', 'fashion-ai');

  return {
    stageName,
    region: contextValue(app, `${stageName}:region`, contextValue(app, 'region', 'us-east-1')),
    projectName,
    repoOwner: contextValue(app, 'repoOwner', 'your-github-user'),
    repoName: contextValue(app, 'repoName', 'fashion-ai'),
    repoBranch: contextValue(app, `${stageName}:repoBranch`, stageName === 'prod' ? 'main' : stageName),
    githubTokenSecretName: contextValue(app, 'githubTokenSecretName', 'fashion-ai/github-token'),
    backendImageTag: contextValue(app, `${stageName}:backendImageTag`, 'latest'),
    appRunnerCpu: contextValue(app, `${stageName}:appRunnerCpu`, stageName === 'prod' ? '1024' : '512'),
    appRunnerMemory: contextValue(app, `${stageName}:appRunnerMemory`, stageName === 'prod' ? '2048' : '1024')
  };
}
