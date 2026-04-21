#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { StorageStack } from '../lib/storage-stack';
import { AsyncStack } from '../lib/async-stack';
import { ComputeStack } from '../lib/compute-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

const stageName = app.node.tryGetContext('stage') ?? 'prod';
const prefix = `MallIq-${stageName}`;

const network = new NetworkStack(app, `${prefix}-Network`, { env });

const storage = new StorageStack(app, `${prefix}-Storage`, { env, stageName });

const database = new DatabaseStack(app, `${prefix}-Database`, {
  env,
  vpc: network.vpc,
  stageName,
});

const async_ = new AsyncStack(app, `${prefix}-Async`, {
  env,
  vpc: network.vpc,
  rawBucket: storage.rawDocsBucket,
  processedBucket: storage.processedDocsBucket,
  dbSecret: database.dbSecret,
  dbProxy: database.dbProxy,
  stageName,
});

new ComputeStack(app, `${prefix}-Compute`, {
  env,
  vpc: network.vpc,
  rawBucket: storage.rawDocsBucket,
  processedBucket: storage.processedDocsBucket,
  siteBucket: storage.siteBucket,
  siteDistribution: storage.siteDistribution,
  dbSecret: database.dbSecret,
  dbProxy: database.dbProxy,
  autofillQueue: async_.autofillQueue,
  stageName,
});

app.synth();
