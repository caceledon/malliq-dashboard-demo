import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import * as path from 'path';

interface AsyncStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  rawBucket: s3.Bucket;
  processedBucket: s3.Bucket;
  dbSecret: secrets.ISecret;
  dbProxy: rds.DatabaseProxy;
  stageName: string;
}

export class AsyncStack extends cdk.Stack {
  public readonly autofillQueue: sqs.Queue;
  public readonly broadcastTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: AsyncStackProps) {
    super(scope, id, props);

    this.broadcastTopic = new sns.Topic(this, 'BroadcastTopic', {
      displayName: `malliq-broadcast-${props.stageName}`,
    });

    const autofillDlq = new sqs.Queue(this, 'AutofillDlq', {
      retentionPeriod: cdk.Duration.days(14),
    });

    this.autofillQueue = new sqs.Queue(this, 'AutofillQueue', {
      visibilityTimeout: cdk.Duration.minutes(16),
      deadLetterQueue: { queue: autofillDlq, maxReceiveCount: 3 },
    });

    props.rawBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(this.autofillQueue),
      { prefix: 'contratos/' }
    );

    const autofillFn = new nodejs.NodejsFunction(this, 'AutofillFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '..', '..', 'lambda', 'autofill', 'src', 'handler.ts'),
      handler: 'handler',
      timeout: cdk.Duration.minutes(15),
      memorySize: 2048,
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      environment: {
        DB_SECRET_ARN: props.dbSecret.secretArn,
        DB_PROXY_ENDPOINT: props.dbProxy.endpoint,
        PROCESSED_BUCKET: props.processedBucket.bucketName,
        BROADCAST_TOPIC_ARN: this.broadcastTopic.topicArn,
        OPENAI_SECRET_NAME: `malliq/${props.stageName}/openai`,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node20',
        externalModules: ['aws-sdk'],
      },
      reservedConcurrentExecutions: 20,
    });

    autofillFn.addEventSource(new SqsEventSource(this.autofillQueue, { batchSize: 1 }));
    props.rawBucket.grantRead(autofillFn);
    props.processedBucket.grantWrite(autofillFn);
    props.dbSecret.grantRead(autofillFn);
    props.dbProxy.grantConnect(autofillFn, 'malliq_admin');
    this.broadcastTopic.grantPublish(autofillFn);

    const healthFn = new nodejs.NodejsFunction(this, 'HealthScoreFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '..', '..', 'lambda', 'health-score', 'src', 'handler.ts'),
      handler: 'handler',
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      environment: {
        DB_SECRET_ARN: props.dbSecret.secretArn,
        DB_PROXY_ENDPOINT: props.dbProxy.endpoint,
      },
      bundling: { minify: true, target: 'node20' },
    });
    props.dbSecret.grantRead(healthFn);
    props.dbProxy.grantConnect(healthFn, 'malliq_admin');

    new events.Rule(this, 'HealthScoreSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.hours(6)),
      targets: [new targets.LambdaFunction(healthFn)],
    });

    new cdk.CfnOutput(this, 'AutofillQueueUrl', { value: this.autofillQueue.queueUrl });
    new cdk.CfnOutput(this, 'BroadcastTopicArn', { value: this.broadcastTopic.topicArn });
  }
}
