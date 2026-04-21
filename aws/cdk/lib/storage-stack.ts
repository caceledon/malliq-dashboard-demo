import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

interface StorageStackProps extends cdk.StackProps {
  stageName: string;
}

export class StorageStack extends cdk.Stack {
  public readonly rawDocsBucket: s3.Bucket;
  public readonly processedDocsBucket: s3.Bucket;
  public readonly thumbnailsBucket: s3.Bucket;
  public readonly siteBucket: s3.Bucket;
  public readonly siteDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const lifecycle: s3.LifecycleRule[] = [
      {
        id: 'archive-old',
        enabled: true,
        transitions: [
          { storageClass: s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: cdk.Duration.days(30) },
          { storageClass: s3.StorageClass.GLACIER, transitionAfter: cdk.Duration.days(180) },
          { storageClass: s3.StorageClass.DEEP_ARCHIVE, transitionAfter: cdk.Duration.days(365) },
        ],
      },
    ];

    this.rawDocsBucket = new s3.Bucket(this, 'RawDocs', {
      bucketName: `malliq-${props.stageName}-docs-raw`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      enforceSSL: true,
      lifecycleRules: lifecycle,
      removalPolicy: props.stageName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      eventBridgeEnabled: true,
    });

    this.processedDocsBucket = new s3.Bucket(this, 'ProcessedDocs', {
      bucketName: `malliq-${props.stageName}-docs-processed`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: lifecycle,
      removalPolicy: props.stageName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    this.thumbnailsBucket = new s3.Bucket(this, 'Thumbnails', {
      bucketName: `malliq-${props.stageName}-docs-thumbs`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.siteBucket = new s3.Bucket(this, 'Site', {
      bucketName: `malliq-${props.stageName}-site`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: props.stageName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
    });

    this.siteDistribution = new cloudfront.Distribution(this, 'SiteCdn', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    new cdk.CfnOutput(this, 'CdnDomain', { value: this.siteDistribution.domainName });
    new cdk.CfnOutput(this, 'RawDocsBucket', { value: this.rawDocsBucket.bucketName });
  }
}
