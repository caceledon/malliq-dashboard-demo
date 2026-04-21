# MallIQ AWS

Infraestructura como código (AWS CDK en TypeScript) + funciones Lambda para el pipeline asíncrono.

## Estructura
```
aws/
├── cdk/
│   ├── bin/malliq.ts            Entry point
│   ├── lib/
│   │   ├── network-stack.ts     VPC + endpoints privados
│   │   ├── database-stack.ts    Aurora PostgreSQL Serverless v2 + RDS Proxy
│   │   ├── storage-stack.ts     S3 (raw/processed/thumbs/site) + CloudFront
│   │   ├── async-stack.ts       SQS + Lambdas (autofill, health-score)
│   │   └── compute-stack.ts     ECS Fargate + ALB + Auto-scaling
│   └── cdk.json / tsconfig.json / package.json
└── lambda/
    ├── autofill/                PDF → LLM → campos estructurados
    └── health-score/             Feature engineering + scoring predictivo
```

## Deploy inicial
```bash
cd aws/cdk
npm install
npm run synth
npx cdk bootstrap aws://<account>/<region>
npm run deploy -- --context stage=prod
```

## Tras el primer deploy
1. Crear secret `malliq/prod/openai` en Secrets Manager con
   `{"apiKey":"sk-...", "baseURL":"https://api.moonshot.cn/v1"}`.
2. Desde una instancia en el VPC (o via bastion/Session Manager), conectar a la DB y
   correr las migraciones bajo `server/db/migrations/`.
3. Subir el bundle del SPA compilado (`npm run build`) al bucket `malliq-<stage>-site` y
   crear una invalidación en CloudFront.

## Seguridad
- Aurora y RDS Proxy viven en subnets aisladas; solo ECS y Lambdas acceden.
- S3 buckets con BlockPublicAccess total; acceso vía URLs prefirmadas.
- Lambdas pueden llegar a internet vía NAT Gateway (LLM calls).
- Secrets rotados automáticamente cada 30 días.
