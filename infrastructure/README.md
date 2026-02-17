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
│  │  │  │        ALB        │  │    │  │  Backend ECS Service   │  │  │  │
│  │  │  │  (HTTP:80/443)    │──┼────┼─▶│  FastAPI (port 8000)   │  │  │  │
│  │  │  │                   │  │    │  └───────────────────────┘  │  │  │
│  │  │  │  /api/* ──▶ :8000 │  │    │                             │  │  │
│  │  │  │  /*     ──▶ :3000 │──┼────┼─▶┌───────────────────────┐  │  │  │
│  │  │  └───────────────────┘  │    │  │  Frontend ECS Service  │  │  │  │
│  │  │                         │    │  │  Nginx (port 3000)     │  │  │  │
│  │  │  ┌───────────────────┐  │    │  └───────────────────────┘  │  │  │
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

### Traffic Routing

The ALB uses **path-based routing** to direct traffic to the appropriate service:

| Path Pattern | Target | Port | Service |
|-------------|--------|------|---------|
| `/api/*` | Backend target group | 8000 | FastAPI backend |
| `/*` (default) | Frontend target group | 3000 | Nginx serving React SPA |

## Modules

| Module | Description |
|--------|-------------|
| `networking` | VPC, subnets, NAT gateway, security groups |
| `ecr` | Elastic Container Registry for Docker images |
| `alb` | Application Load Balancer with HTTPS |
| `ecs` | ECS Fargate cluster, service, and task definition (used for both backend and frontend) |
| `iam` | IAM roles and policies for the application task role (decoupled from ECS for independent lifecycle) |
| `secrets` | AWS Secrets Manager for sensitive configuration |

### IAM Module

The `iam` module is intentionally separate from the `ecs` module so that the application task role and its policies persist independently of the deployment mechanism. It creates:

- **Application task role**: Assumed by ECS tasks via `ecs-tasks.amazonaws.com`
- **EC2 read-only policy**: `DescribeInstances`, `DescribeVpcs`, `DescribeSubnets`, `DescribeRouteTables`, `DescribeInternetGateways`, `DescribeNatGateways`, `DescribeAddresses`, etc.
- **RDS read-only policy**: `DescribeDBInstances`, `DescribeDBClusters`, `ListTagsForResource`
- **ECS read-only policy**: `DescribeClusters`, `ListClusters`, `DescribeServices`, `ListServices`, `DescribeTasks`, `ListTasks`, `DescribeTaskDefinition`, `DescribeContainerInstances`
- **S3 Terraform state policy**: `GetObject`, `ListBucket`, `GetBucketLocation` scoped to the current AWS account

### CyberArk Service Account Permissions

When CyberArk integration is enabled, the application requires two dedicated service users with the following minimum permissions.

**SCIM Service User** (Identity User/Role Sync):

| Resource | Permission | Purpose |
|----------|------------|---------|
| Users | Read | Enumerate Identity users for access mapping |
| Groups / Roles | Read | Enumerate Identity roles and role memberships |

**Platform API Service User** (Privilege Cloud + SIA):

| Resource | Permission | Purpose |
|----------|------------|---------|
| Safes | List / Read (or **Privilege Cloud Auditors** role) | Enumerate safes and safe members |
| Accounts | List Accounts (or **Privilege Cloud Auditors** role) | Enumerate privileged accounts within safes |
| Safe Members | Read (or **Privilege Cloud Auditors** role) | Enumerate safe membership for access mapping |
| UAP Policies | Read | Read SIA policies for JIT access mapping |

> **Tip**: Assigning the built-in **Privilege Cloud Auditors** role to the Platform API service user grants read-only access to safes, accounts, and safe members in a single step.

### Secrets Module

The `secrets` module manages AWS Secrets Manager secrets for sensitive configuration that persists across ECS task redeployments:

- **Session secret**: Auto-generated 64-character random key for JWT session signing (or uses a provided value)
- **OIDC client secret**: Conditionally created when OIDC SSO is configured
- **Admin password**: Conditionally created for auto-provisioning admin accounts on startup
- **App secrets**: Optional key-value pairs for additional application secrets

Secrets are injected into ECS task definitions as secret environment variables (resolved at container launch from Secrets Manager ARNs).

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

### 3. Build and push Docker images

After infrastructure is deployed, build and push both the backend and frontend images:

```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account_id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend (FastAPI on port 8000)
cd ../../backend
docker build -t <ecr_backend_repository_url>:latest .
docker push <ecr_backend_repository_url>:latest

# Build and push frontend (Nginx on port 3000)
cd ../frontend
docker build -t <ecr_frontend_repository_url>:latest .
docker push <ecr_frontend_repository_url>:latest
```

Replace `<ecr_backend_repository_url>` and `<ecr_frontend_repository_url>` with the values from `terraform output`.

### 4. Force new deployments

After pushing new images, trigger ECS to pull the latest:

```bash
aws ecs update-service --cluster <ecs_cluster_name> --service <ecs_service_name> --force-new-deployment
aws ecs update-service --cluster <ecs_cluster_name> --service <ecs_frontend_service_name> --force-new-deployment
```

### 5. Access the application

- **Without custom domain**: Use the ALB DNS name from Terraform outputs
- **With custom domain**: Access via your configured domain

The frontend (React SPA) is served at the root URL. API requests to `/api/*` are routed to the backend.

## Environment Configuration

### Development (`environments/dev`)

- Single NAT Gateway (cost optimization)
- Backend: 0.5 vCPU, 1 GB RAM, 1 task
- Frontend: 0.25 vCPU, 512 MB RAM, 1 task
- Fargate Spot for cost savings
- HTTP only (no HTTPS) unless domain configured

### Production (`environments/prod`)

- NAT Gateway per AZ (high availability)
- Backend: 1 vCPU, 2 GB RAM, 2 tasks with auto-scaling (2-4)
- Frontend: 0.5 vCPU, 1 GB RAM, 2 tasks with auto-scaling (2-4)
- Standard Fargate (no Spot) for reliability
- HTTPS required with ACM certificate
- Multi-AZ deployment

## Estimated Costs (Monthly)

| Resource | Dev | Prod |
|----------|-----|------|
| ECS Fargate (backend) | ~$15 | ~$30 |
| ECS Fargate (frontend) | ~$8 | ~$15 |
| ALB | ~$20 | ~$20 |
| NAT Gateway | ~$35 | ~$100 |
| CloudWatch | ~$3 | ~$10 |
| ECR | ~$1 | ~$2 |
| Secrets Manager | ~$1 | ~$1 |
| **Total** | **~$83** | **~$178** |

## Outputs

After deployment, Terraform provides these outputs:

| Output | Description |
|--------|-------------|
| `alb_dns_name` | ALB DNS name for accessing the app |
| `app_url` | Full URL to access the application |
| `ecr_backend_repository_url` | ECR URL for pushing backend Docker images |
| `ecr_frontend_repository_url` | ECR URL for pushing frontend Docker images |
| `app_task_role_arn` | ARN of the backend application IAM task role |
| `ecs_cluster_name` | ECS cluster name |
| `ecs_service_name` | Backend ECS service name |
| `ecs_frontend_service_name` | Frontend ECS service name |
| `cloudwatch_log_group` | Backend CloudWatch log group |
| `frontend_log_group` | Frontend CloudWatch log group |

## Destroying Infrastructure

```bash
cd environments/dev  # or prod
terraform destroy
```

**Note**: ECR repositories must be empty before destruction. Delete images first:

```bash
aws ecr batch-delete-image --repository-name aws-infra-visualizer-dev-backend --image-ids imageTag=latest
aws ecr batch-delete-image --repository-name aws-infra-visualizer-dev-frontend --image-ids imageTag=latest
```

## Service Details

### Backend Service

- **Image source**: `backend/Dockerfile`
- **Port**: 8000
- **Health check**: `GET /api/health`
- **Routes**: Receives all `/api/*` requests from ALB
- **Runtime**: FastAPI + Uvicorn

### Frontend Service

- **Image source**: `frontend/Dockerfile` (multi-stage build: Node.js build + Nginx)
- **Port**: 3000
- **Health check**: `GET /health`
- **Routes**: Receives all non-API requests (default ALB rule)
- **Runtime**: Nginx serving static React SPA assets
- **SPA routing**: Nginx `try_files` falls back to `index.html` for client-side routes
