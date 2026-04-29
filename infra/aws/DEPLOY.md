# Deploy Malliq to AWS (EC2 + Docker + Caddy)

Single-VM deploy: one EC2 instance running the unified app container behind Caddy for auto-HTTPS. Domain: `do-up.cl`.

## What you'll create

| Resource | Detail | Approx. cost |
|---|---|---|
| EC2 t3.small | Amazon Linux 2023, 30 GB gp3 | ~$20/mo |
| EBS gp3 30 GB | Persistent (sqlite + uploads) | ~$2.40/mo |
| Elastic IP | Free while attached to running instance | $0 |
| Egress | First 100 GB/mo free, then ~$0.09/GB | varies |

Total: ~$22–25/mo at idle. Region default: `sa-east-1` (São Paulo).

## Prerequisites

- AWS CLI configured (`aws sts get-caller-identity` works).
- A bash shell (Git Bash on Windows works fine).
- Access to your `do-up.cl` DNS at the registrar.
- A Moonshot or OpenAI API key.

## 1. Launch the EC2 instance

From the repo root:

```bash
bash infra/aws/launch.sh
```

This creates: an SSH key (saved to `infra/aws/malliq-key.pem`), a security group (22/80/443), an EC2 instance, and an Elastic IP. It prints the public IP at the end.

Tweak via env vars if needed:

```bash
AWS_REGION=us-east-1 INSTANCE_TYPE=t3.medium bash infra/aws/launch.sh
```

## 2. Point DNS at the EIP

At your domain registrar (`do-up.cl`), create two A records:

```
do-up.cl       A   <PUBLIC_IP>
www.do-up.cl   A   <PUBLIC_IP>
```

TTL 300 is fine. Verify with `dig do-up.cl +short` once it propagates (usually < 10 min).

**Caddy will not get a Let's Encrypt cert until DNS resolves to the box.** Don't `docker compose up` until you've confirmed propagation.

## 3. SSH to the box

```bash
ssh -i infra/aws/malliq-key.pem ec2-user@<PUBLIC_IP>
```

Wait until cloud-init has finished (file present):

```bash
test -f /var/log/malliq-bootstrap.done && echo READY
```

## 4. Get the code onto the box

If your GitHub repo is public:

```bash
sudo chown ec2-user:ec2-user /opt/malliq
git clone https://github.com/caceledon/malliq-dashboard-demo.git /opt/malliq
cd /opt/malliq
```

If the repo is private, use a [GitHub deploy key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys) or `scp` a zip from your laptop.

## 5. Create the production env file

```bash
cp .env.production.example .env.production
nano .env.production
```

Fill in:
- `MALLIQ_JWT_SECRET` — generate with `openssl rand -hex 48`
- `MOONSHOT_API_KEY` — your key
- (Anything else specific to your setup)

Lock it down:

```bash
chmod 600 .env.production
```

## 6. Build and start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

First-boot Caddy will request a Let's Encrypt cert (HTTP-01 challenge on port 80). Watch logs:

```bash
docker compose -f docker-compose.prod.yml logs -f caddy
```

You should see `certificate obtained successfully`. Visit `https://do-up.cl` — you should get the app, served over HTTPS.

## 7. Create the first user

The app boots with no users; the first signup is allowed by default. Hit the signup endpoint or use the UI's signup screen, then re-check `MALLIQ_REQUIRE_AUTH=1` is in `.env.production` (it is, in the example).

## Operations

**Update to a new commit:**

```bash
cd /opt/malliq
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

**Tail logs:**

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

**Backup the data dir** (sqlite + uploads):

```bash
tar czf malliq-backup-$(date +%F).tar.gz data/
# scp it off the box, or push to S3
```

**Restart everything:**

```bash
docker compose -f docker-compose.prod.yml restart
```

## Tearing it down

```bash
INSTANCE_ID=$(aws ec2 describe-instances --region sa-east-1 \
  --filters "Name=tag:Name,Values=malliq" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
aws ec2 terminate-instances --region sa-east-1 --instance-ids "$INSTANCE_ID"

ALLOC_ID=$(aws ec2 describe-addresses --region sa-east-1 \
  --filters "Name=tag:Name,Values=malliq" \
  --query 'Addresses[0].AllocationId' --output text)
aws ec2 release-address --region sa-east-1 --allocation-id "$ALLOC_ID"
```

(Security group and key pair stay; clean those up separately if you want.)
