# AWS Infrastructure Visualizer - Terraform Infrastructure

This directory contains Terraform modules and environment configurations for deploying the AWS Infrastructure Visualizer to AWS ECS Fargate.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              AWS Cloud                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                             VPC                                   │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────┐    ┌─────────────────────────────┐  │  │
│  │  │     Public Subnets      │    │      Private Subnets        │  │  │
│  │  │                         │    │                             │  │  │
│  │  │  ┌───────────────────┐  │    │  ┌───────────────────────┐  │  │  │
│  │  │  │        ALB        │  │    │  │    ECS Fargate        │  │  │  │
│  │  │  │   (HTTPS:443)     │──┼────┼─▶│    (App Container)    │  │  │  │
│  │  │  └───────────────────┘  │    │  └───────────────────────┘  │  │  │
│  │  │                         │    │                             │  │  │
│  │  │  ┌───────────────────┐  │    │                             │  │  │
│  │  │  │    NAT Gateway    │◀─┼────┼──(Outbound traffic)        │  │  │
│  │  │  └───────────────────┘  │    │                             │  │  │
│  │  └─────────────────────────┘    └─────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │     ECR      │  │   Secrets    │  │  CloudWatch  │  │   Route53  │  │
│  │  (Images)    │  │   Manager    │  │   (Logs)     │  │   (DNS)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Modules

| Module | Description |
|--------|-------------|
| `networking` | VPC, subnets, NAT gateway, security groups |
| `ecr` | Elastic Container Registry for Docker images |
| `alb` | Application Load Balancer with HTTPS |
| `ecs` | ECS Fargate cluster, service, and task definition |
| `secrets` | AWS Secrets Manager for sensitive configuration |

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.5.0
3. **Domain name** (optional, for custom domain with HTTPS)
4. **ACM Certificate** (created automatically if domain provided)

## Quick Start

### 1. Initialize the environment

```bash
cd environments/dev
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### 2. Deploy infrastructure

```bash
terraform init
terraform plan
terraform apply
```

### 3. Build and push Docker image

After infrastructure is deployed:

```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account_id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push
cd ../../backend
docker build -t aws-infra-visualizer .
docker tag aws-infra-visualizer:latest <ecr_repository_url>:latest
docker push <ecr_repository_url>:latest
```

### 4. Access the application

- **Without custom domain**: Use the ALB DNS name from Terraform outputs
- **With custom domain**: Access via your configured domain

## Environment Configuration

### Development (`environments/dev`)

- Single NAT Gateway (cost optimization)
- Smaller Fargate tasks (0.5 vCPU, 1GB RAM)
- HTTP only (no HTTPS) unless domain configured

### Production (`environments/prod`)

- NAT Gateway per AZ (high availability)
- Larger Fargate tasks (1 vCPU, 2GB RAM)
- HTTPS required with ACM certificate
- Multi-AZ deployment

## Estimated Costs (Monthly)

| Resource | Dev | Prod |
|----------|-----|------|
| ECS Fargate | ~$15 | ~$30 |
| ALB | ~$20 | ~$20 |
| NAT Gateway | ~$35 | ~$100 |
| CloudWatch | ~$3 | ~$10 |
| ECR | ~$1 | ~$1 |
| Secrets Manager | ~$1 | ~$1 |
| **Total** | **~$75** | **~$162** |

## Outputs

After deployment, Terraform provides these outputs:

| Output | Description |
|--------|-------------|
| `alb_dns_name` | ALB DNS name for accessing the app |
| `ecr_repository_url` | ECR URL for pushing Docker images |
| `ecs_cluster_name` | ECS cluster name |
| `ecs_service_name` | ECS service name |

## Destroying Infrastructure

```bash
cd environments/dev  # or prod
terraform destroy
```

**Note**: ECR repository must be empty before destruction. Delete images first:

```bash
aws ecr batch-delete-image --repository-name aws-infra-visualizer --image-ids imageTag=latest
```
