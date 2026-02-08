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

### 4. ECS Deployment

**Automated (CI/CD):** The `ECS Build & Deploy` GitHub Actions workflow automatically triggers
`force-new-deployment` on both backend and frontend ECS services after pushing images to ECR.
It then polls until services reach a steady state. See [CI/CD Deployment](#cicd-deployment) for setup details.

**Manual:** If you need to trigger a deployment manually (e.g., after a local image push):

```bash
aws ecs update-service --cluster <ecs_cluster_name> --service <ecs_service_name> --force-new-deployment
aws ecs update-service --cluster <ecs_cluster_name> --service <ecs_frontend_service_name> --force-new-deployment

# Wait for services to stabilize
aws ecs wait services-stable --cluster <ecs_cluster_name> --services <ecs_service_name>
aws ecs wait services-stable --cluster <ecs_cluster_name> --services <ecs_frontend_service_name>
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

## CI/CD Deployment

The `ECS Build & Deploy` workflow (`.github/workflows/ecs-build.yml`) automates the full
build-push-deploy pipeline. After pushing images to ECR, it triggers `force-new-deployment` on the
ECS services and waits for them to reach a steady state (healthy tasks).

### GitHub Repository Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS region for ECR and ECS | `us-east-2` |
| `PROJECT_NAME` | Project name for ECR repository naming | `lab-visualizer` |
| `TF_PROJECT_NAME` | Terraform `project_name` variable (used to derive ECS cluster/service names) | `aws-infra-visualizer` |

### GitHub Repository Secrets

| Secret | Description |
|--------|-------------|
| `AWS_OIDC_ROLE_ARN` | ARN of the IAM role assumed via OIDC for GitHub Actions |

### Required IAM Permissions for GitHub Actions OIDC Role

The role referenced by `AWS_OIDC_ROLE_ARN` requires the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRAuthentication",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECRPushPull",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": [
        "arn:aws:ecr:<region>:<account_id>:repository/lab-visualizer-*-backend",
        "arn:aws:ecr:<region>:<account_id>:repository/lab-visualizer-*-frontend"
      ]
    },
    {
      "Sid": "ECSDeployment",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTasks",
        "ecs:DescribeTaskDefinition",
        "ecs:ListTasks"
      ],
      "Resource": [
        "arn:aws:ecs:<region>:<account_id>:service/aws-infra-visualizer-*/*",
        "arn:aws:ecs:<region>:<account_id>:task/aws-infra-visualizer-*/*",
        "arn:aws:ecs:<region>:<account_id>:task-definition/aws-infra-visualizer-*:*"
      ]
    },
    {
      "Sid": "ECSClusterRead",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeClusters"
      ],
      "Resource": [
        "arn:aws:ecs:<region>:<account_id>:cluster/aws-infra-visualizer-*"
      ]
    }
  ]
}
```

> **Note:** Replace `<region>` and `<account_id>` with your actual values. The wildcard patterns
> cover both `dev` and `prod` environments. Tighten the resource ARNs if you need stricter
> environment separation.

### Deployment Flow

```
Push to main/develop
  → GitHub Actions: Detect changes (backend/frontend)
  → Build Docker images (parallel)
  → Push to ECR with tags (SHA, branch, latest)
  → Force new deployment on ECS services
  → Wait for services to stabilize (healthy tasks)
  → Generate deployment summary
```

### Workflow Dispatch Options

When triggering the workflow manually, these options are available:

| Input | Description | Default |
|-------|-------------|---------|
| `push_to_ecr` | Push images to ECR | `false` |
| `deploy_to_ecs` | Deploy to ECS after pushing | `true` |
| `environment` | Target environment (dev/prod) | `dev` |
