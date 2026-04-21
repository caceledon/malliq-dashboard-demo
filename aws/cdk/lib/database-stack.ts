import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  stageName: string;
}

export class DatabaseStack extends cdk.Stack {
  public readonly cluster: rds.DatabaseCluster;
  public readonly dbProxy: rds.DatabaseProxy;
  public readonly dbSecret: secrets.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const credentials = rds.Credentials.fromGeneratedSecret('malliq_admin', {
      secretName: `malliq/${props.stageName}/db`,
    });

    const sg = new ec2.SecurityGroup(this, 'AuroraSg', {
      vpc: props.vpc,
      description: 'MallIQ Aurora cluster',
      allowAllOutbound: false,
    });

    this.cluster = new rds.DatabaseCluster(this, 'Aurora', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_4,
      }),
      credentials,
      writer: rds.ClusterInstance.serverlessV2('writer', {
        publiclyAccessible: false,
        enablePerformanceInsights: true,
      }),
      readers: [
        rds.ClusterInstance.serverlessV2('reader', {
          publiclyAccessible: false,
          enablePerformanceInsights: true,
          scaleWithWriter: true,
        }),
      ],
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 16,
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [sg],
      defaultDatabaseName: 'malliq',
      storageEncrypted: true,
      backup: { retention: cdk.Duration.days(14), preferredWindow: '06:00-07:00' },
      cloudwatchLogsExports: ['postgresql'],
      deletionProtection: props.stageName === 'prod',
      removalPolicy: props.stageName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.SNAPSHOT,
    });

    this.dbSecret = this.cluster.secret!;

    this.dbProxy = this.cluster.addProxy('Proxy', {
      secrets: [this.dbSecret],
      vpc: props.vpc,
      requireTLS: true,
      borrowTimeout: cdk.Duration.seconds(30),
      maxConnectionsPercent: 90,
      idleClientTimeout: cdk.Duration.minutes(30),
    });

    new cdk.CfnOutput(this, 'ProxyEndpoint', { value: this.dbProxy.endpoint });
    new cdk.CfnOutput(this, 'SecretArn', { value: this.dbSecret.secretArn });
  }
}
