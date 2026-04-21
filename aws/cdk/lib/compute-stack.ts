import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
import * as path from 'path';

interface ComputeStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  rawBucket: s3.Bucket;
  processedBucket: s3.Bucket;
  siteBucket: s3.Bucket;
  siteDistribution: cloudfront.Distribution;
  dbSecret: secrets.ISecret;
  dbProxy: rds.DatabaseProxy;
  autofillQueue: sqs.Queue;
  stageName: string;
}

export class ComputeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      containerInsights: true,
    });

    const apiService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'ApiService', {
      cluster,
      cpu: 1024,
      memoryLimitMiB: 2048,
      desiredCount: 2,
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      publicLoadBalancer: true,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.join(__dirname, '..', '..', '..', 'server')),
        containerPort: 3001,
        environment: {
          NODE_ENV: 'production',
          STAGE: props.stageName,
          DB_PROXY_ENDPOINT: props.dbProxy.endpoint,
          RAW_BUCKET: props.rawBucket.bucketName,
          PROCESSED_BUCKET: props.processedBucket.bucketName,
          AUTOFILL_QUEUE_URL: props.autofillQueue.queueUrl,
          ALLOWED_ORIGIN: `https://${props.siteDistribution.domainName}`,
        },
        secrets: {
          DB_SECRET_JSON: ecs.Secret.fromSecretsManager(props.dbSecret),
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'malliq-api',
          logRetention: logs.RetentionDays.ONE_MONTH,
        }),
      },
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      circuitBreaker: { rollback: true },
    });

    apiService.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(20),
      timeout: cdk.Duration.seconds(5),
    });

    apiService.targetGroup.setAttribute('stickiness.enabled', 'true');
    apiService.targetGroup.setAttribute('stickiness.type', 'lb_cookie');
    apiService.targetGroup.setAttribute('stickiness.lb_cookie.duration_seconds', '3600');
    apiService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');

    const scaling = apiService.service.autoScaleTaskCount({ minCapacity: 2, maxCapacity: 10 });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 65,
      scaleInCooldown: cdk.Duration.seconds(120),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });
    scaling.scaleOnRequestCount('RequestScaling', {
      requestsPerTarget: 1000,
      targetGroup: apiService.targetGroup,
    });

    props.dbSecret.grantRead(apiService.taskDefinition.taskRole);
    props.dbProxy.grantConnect(apiService.taskDefinition.taskRole, 'malliq_admin');
    props.rawBucket.grantPut(apiService.taskDefinition.taskRole);
    props.rawBucket.grantRead(apiService.taskDefinition.taskRole);
    props.processedBucket.grantRead(apiService.taskDefinition.taskRole);
    props.autofillQueue.grantSendMessages(apiService.taskDefinition.taskRole);

    new cdk.CfnOutput(this, 'ApiUrl', { value: `https://${apiService.loadBalancer.loadBalancerDnsName}` });
  }
}
