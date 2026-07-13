#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FashionAiStack } from '../lib/fashion-ai-stack';
import { getStageConfig, stageNames } from '../lib/stage-config';

const app = new cdk.App();

for (const stageName of stageNames) {
  const config = getStageConfig(stageName, app);
  new FashionAiStack(app, `FashionAi-${stageName}`, {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: config.region
    },
    config
  });
}
