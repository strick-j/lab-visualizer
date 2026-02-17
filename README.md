# AWS Lab Infrastructure Visualizer

A web application that provides visual representation of AWS infrastructure and CyberArk privileged access state, aggregating data from AWS APIs, CyberArk APIs, and Terraform state files to give real-time insights into your cloud resources and access controls.

![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![React](https://img.shields.io/badge/react-18.2-61dafb.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.3-3178c6.svg)
![FastAPI](https://img.shields.io/badge/fastapi-0.128-009688.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

### AWS Infrastructure
- **Real-time Infrastructure View**: Monitor EC2 instances, RDS databases, ECS containers, VPCs, Subnets, Internet Gateways, NAT Gateways, and Elastic IPs
- **Interactive Topology Visualization**: Visual network topology with React Flow showing VPC → Subnet → Resource relationships (including ECS containers), with filtering controls
- **Status Visualization**: Color-coded status indicators (running, stopped, pending, error)

### CyberArk Integration
- **Privilege Cloud**: Collect and display safes, privileged accounts, and safe memberships
- **Identity (SCIM)**: Sync users and roles from CyberArk Identity via SCIM API
- **Secure Infrastructure Access (SIA)**: Collect VM and database access policies with target criteria matching
- **Access Mapping Visualization**: Interactive React Flow graph showing user-to-target access paths through standing access (User → Role → Safe → Account → Target) and JIT access (User → SIA Policy → Target)
- **CyberArk Dashboard**: Dedicated resource views for safes, roles, and SIA policies
- **Tenant Discovery**: Automatic URL discovery from CyberArk subdomain name

### Infrastructure as Code
- **Terraform Integration**: Aggregate multiple Terraform state files from S3 backend to identify managed resources (AWS and CyberArk), with admin UI for managing buckets and paths
- **Configuration Drift Detection**: Compare live AWS and CyberArk state against Terraform state to identify unmanaged and orphaned resources

### Platform
- **Authentication**: Local username/password login and SSO via OIDC identity providers with token-based sessions
- **User Management**: Admin panel for managing users, roles, and account status
- **Settings Management**: Admin UI for configuring OIDC providers, Terraform state buckets, and CyberArk integration
- **Dark/Light Theme**: Toggle between themes for comfortable viewing

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Frontend (React + TypeScript)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────┐ │
│  │   Pages     │  │  Components  │  │  Visualizations (React Flow)│ │
│  │  VPCPage    │  │  common/     │  │  Infrastructure Topology    │ │
│  │  ECSList    │  │  dashboard/  │  │  VPC → Subnet → EC2/RDS/ECS│ │
│  │  CyberArk   │  │  vpc/        │  │  Access Mapping            │ │
│  │  AccessMap  │  │  topology/   │  │  User → Role → Safe → Tgt  │ │
│  │  Settings   │  │  cyberark/   │  └─────────────────────────────┘ │
│  │  Login      │  │  access-map/ │                                  │
│  └─────────────┘  │  settings/   │                                  │
│                   │  layout/     │                                  │
│                   └──────────────┘                                  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FastAPI Backend                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │  API Routes  │  │   Services   │  │      Collectors            │ │
│  │  /api/*      │→ │   Business   │→ │  AWS: EC2, RDS, ECS, VPC   │ │
│  │              │  │   Logic      │  │  Subnet, IGW, NAT GW, EIP  │ │
│  └──────────────┘  └──────────────┘  │  CyberArk: Safes, Accounts │ │
│                                      │  Roles, Users, SIA Policies │ │
│  ┌──────────────┐  ┌──────────────┐  └──────────┬─────────────────┘ │
│  │   Parsers    │  │   Models     │             │                   │
│  │  Terraform   │  │  SQLAlchemy  │             │                   │
│  │  State       │  │  Database    │             │                   │
│  └──────┬───────┘  └──────────────┘             │                   │
└─────────┼───────────────────────────────────────┼───────────────────┘
          │                                       │
          ▼                                       ▼
┌──────────────────┐       ┌───────────────────────────────────────┐
│  Terraform State │       │           External APIs               │
│  (S3 Backend)    │       │  AWS: EC2, RDS, ECS, VPC, etc.        │
└──────────────────┘       │  CyberArk: Privilege Cloud, Identity  │
                           │           SIA (UAP), SCIM             │
                           └───────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- AWS credentials configured (`~/.aws/credentials`)

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/strick-j/lab-visualizer.git
   cd lab-visualizer
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your AWS and SSO configuration
   ```

3. **Initialize frontend dependencies**
   ```bash
   cd frontend && npm install && cd ..
   ```
   > **Note**: Required to generate `package-lock.json` for Docker build.

4. **Start services**
   ```bash
   docker-compose up -d
   # Or use: make docker-up
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Manual Setup (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_ACCOUNT_ID` | Target AWS account | - |
| `TF_STATE_BUCKET` | S3 bucket for Terraform state | - |
| `TF_STATE_CONFIG` | Path to terraform-states.yml | `config/terraform-states.yml` |
| `DATABASE_URL` | Database connection string | `sqlite:///./data/app.db` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000,http://localhost:5173` |
| `SESSION_SECRET` | Session signing key | (change in production) |
| `LOCAL_AUTH_ENABLED` | Enable local username/password auth | `true` |
| `ADMIN_USERNAME` | Auto-provision admin on startup | - |
| `ADMIN_PASSWORD` | Admin password (use Secrets Manager in prod) | - |
| `OIDC_ISSUER` | SSO identity provider URL | - |
| `OIDC_CLIENT_ID` | OIDC client ID | - |
| `OIDC_CLIENT_SECRET` | OIDC client secret | - |
| `FRONTEND_URL` | Frontend URL for SSO callback redirects | - |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL in minutes | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL in days | `7` |
| `CYBERARK_ENABLED` | Enable CyberArk integration | `false` |
| `CYBERARK_BASE_URL` | Privilege Cloud URL | - |
| `CYBERARK_IDENTITY_URL` | CyberArk Identity tenant URL | - |
| `CYBERARK_CLIENT_ID` | CyberArk OAuth2 client ID | - |
| `CYBERARK_CLIENT_SECRET` | CyberArk OAuth2 client secret | - |

### Terraform State Configuration

Configure multiple Terraform state files in `config/terraform-states.yml`:

```yaml
terraform_states:
  - name: "Networking"
    key: "lab/networking/terraform.tfstate"
    description: "VPCs, Subnets, Gateways"

  - name: "Compute"
    key: "lab/compute/terraform.tfstate"
    description: "EC2 instances"

  - name: "Databases"
    key: "lab/databases/terraform.tfstate"
    description: "RDS instances"
```

## Project Structure

```
lab-visualizer/
├── backend/                      # Python FastAPI application
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Pydantic Settings
│   │   ├── version.py           # Version management
│   │   ├── api/
│   │   │   ├── deps.py          # Auth dependency injection
│   │   │   └── routes/          # API endpoints
│   │   │       ├── health.py    # Health check
│   │   │       ├── info.py      # App version/build info
│   │   │       ├── auth.py      # Authentication (local + OIDC)
│   │   │       ├── users.py     # User management
│   │   │       ├── settings.py  # Admin settings (OIDC, TF, CyberArk)
│   │   │       ├── ec2.py       # EC2 instances
│   │   │       ├── rds.py       # RDS instances
│   │   │       ├── ecs.py       # ECS containers
│   │   │       ├── vpc.py       # VPCs
│   │   │       ├── subnet.py    # Subnets
│   │   │       ├── igw.py       # Internet Gateways
│   │   │       ├── nat_gateway.py # NAT Gateways
│   │   │       ├── eip.py       # Elastic IPs
│   │   │       ├── topology.py  # Topology data
│   │   │       ├── terraform.py # Terraform state
│   │   │       ├── cyberark.py  # CyberArk resources (safes, roles, SIA)
│   │   │       ├── access_mapping.py # Access mapping visualization
│   │   │       └── resources.py # Generic resources
│   │   ├── collectors/          # Data collectors
│   │   │   ├── ec2.py, rds.py, ecs.py, vpc.py, ...  # AWS collectors
│   │   │   ├── cyberark_base.py     # CyberArk OAuth2 base collector
│   │   │   ├── cyberark_scim.py     # SCIM API base collector
│   │   │   ├── cyberark_safes.py    # Privilege Cloud safes
│   │   │   ├── cyberark_accounts.py # Privileged accounts
│   │   │   ├── cyberark_roles.py    # Identity roles (SCIM)
│   │   │   ├── cyberark_users.py    # Identity users (SCIM)
│   │   │   └── cyberark_sia.py      # SIA access policies
│   │   ├── parsers/             # Terraform state parser
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── resources.py     # AWS resources + TF buckets
│   │   │   ├── auth.py          # Users, sessions, auth settings
│   │   │   └── cyberark.py      # CyberArk resources + settings
│   │   ├── schemas/             # Pydantic schemas
│   │   │   ├── resources.py     # AWS resource schemas
│   │   │   ├── auth.py          # Auth schemas
│   │   │   ├── settings.py      # Settings schemas
│   │   │   └── cyberark.py      # CyberArk + access mapping schemas
│   │   └── services/            # Business logic
│   │       ├── auth.py          # Authentication service
│   │       ├── settings.py      # Settings service
│   │       └── access_mapping.py # Access path computation
│   ├── scripts/                 # DB management scripts
│   ├── tests/                   # Backend tests
│   └── requirements.txt
│
├── frontend/                    # React TypeScript application
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # Reusable UI components
│   │   │   ├── layout/          # Layout (Header, Sidebar)
│   │   │   ├── dashboard/       # Dashboard widgets
│   │   │   ├── resources/       # Resource tables
│   │   │   ├── topology/        # Infrastructure topology (React Flow)
│   │   │   ├── vpc/             # VPC-specific components
│   │   │   ├── cyberark/        # CyberArk resource views (safes, roles, SIA)
│   │   │   ├── access-mapping/  # Access mapping visualization (React Flow)
│   │   │   ├── settings/        # Settings management UI
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pages/               # Page components (VPC, ECS, CyberArk, AccessMapping, Login, Setup, Settings)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── api/                 # API client
│   │   ├── types/               # TypeScript types (resources, topology, auth, cyberark)
│   │   └── contexts/            # React contexts (Theme, Auth)
│   ├── eslint.config.js         # ESLint 9 flat config
│   └── package.json
│
├── infrastructure/              # Terraform IaC
│   ├── modules/                 # Reusable modules
│   │   ├── alb/                 # Application Load Balancer
│   │   ├── ecr/                 # Container Registry
│   │   ├── ecs/                 # ECS Fargate
│   │   ├── iam/                 # IAM roles and policies
│   │   ├── networking/          # VPC, Subnets
│   │   └── secrets/             # Secrets Manager
│   └── environments/
│       ├── dev/
│       └── prod/
│
├── config/                      # Configuration files
│   └── terraform-states.yml
├── .github/workflows/           # CI/CD pipelines
│   ├── backend-tests.yml        # Backend lint, type-check, test
│   ├── frontend-tests.yml       # Frontend lint, type-check, test
│   ├── security-scan.yml        # Security scanning
│   ├── infrastructure.yml       # Terraform validation
│   └── ecs-build.yml            # ECS build & deploy
├── docker-compose.yml
├── Makefile                     # Task automation
├── VERSION                      # Application version
├── CLAUDE.md                    # AI assistant context
├── CONTRIBUTING.md              # Contributing guidelines
├── SECURITY.md                  # Security guidelines
└── README.md
```

## API Documentation

Access interactive API documentation at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Endpoints

**Public (no auth required):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/info` | App version and build info |
| `GET` | `/api/auth/config` | Auth configuration for frontend |
| `GET` | `/api/auth/setup-status` | Check if initial setup is needed |
| `POST` | `/api/auth/setup` | Create initial admin user |
| `POST` | `/api/auth/login` | Local username/password login |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `POST` | `/api/auth/logout` | Logout and revoke session |
| `GET` | `/api/auth/me` | Get current authenticated user |
| `GET` | `/api/auth/oidc/login` | Initiate OIDC login flow |
| `GET` | `/api/auth/oidc/callback` | OIDC callback handler |

**Protected (auth required):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/status/summary` | Resource counts by status |
| `GET` | `/api/ec2` | List EC2 instances |
| `GET` | `/api/ec2/{instance_id}` | EC2 instance details |
| `GET` | `/api/rds` | List RDS instances |
| `GET` | `/api/rds/{instance_id}` | RDS instance details |
| `GET` | `/api/ecs` | List ECS containers |
| `GET` | `/api/ecs/clusters` | List ECS clusters with containers |
| `GET` | `/api/ecs/{task_id}` | ECS container details |
| `GET` | `/api/vpcs` | List VPCs |
| `GET` | `/api/vpcs/{vpc_id}` | VPC details |
| `GET` | `/api/subnets` | List subnets |
| `GET` | `/api/internet-gateways` | List Internet Gateways |
| `GET` | `/api/nat-gateways` | List NAT Gateways |
| `GET` | `/api/elastic-ips` | List Elastic IPs |
| `GET` | `/api/topology` | Get topology visualization data |
| `POST` | `/api/refresh` | Trigger data refresh from AWS |
| `GET` | `/api/terraform/states` | List Terraform state files |
| `GET` | `/api/terraform/drift` | Detect configuration drift |

**User Management (auth required):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users (admin only) |
| `PUT` | `/api/users/{id}/password` | Change user password |
| `PATCH` | `/api/users/{id}/status` | Enable/disable user (admin only) |
| `PATCH` | `/api/users/{id}/role` | Update user role (admin only) |

**CyberArk Resources (auth required):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/cyberark/safes` | List Privilege Cloud safes |
| `GET` | `/api/cyberark/safes/{safe_name}` | Safe details with members and accounts |
| `GET` | `/api/cyberark/roles` | List CyberArk Identity roles |
| `GET` | `/api/cyberark/roles/{role_id}` | Role details with members |
| `GET` | `/api/cyberark/sia-policies` | List SIA access policies |
| `GET` | `/api/cyberark/sia-policies/{policy_id}` | SIA policy details with principals |
| `GET` | `/api/cyberark/drift` | Detect CyberArk configuration drift |
| `GET` | `/api/access-mapping` | Compute user-to-target access paths |
| `GET` | `/api/access-mapping/users` | List users for access mapping |
| `GET` | `/api/access-mapping/targets` | List targets for access mapping |

**Settings (admin only):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get auth settings |
| `GET` | `/api/settings/oidc` | Get OIDC settings |
| `PUT` | `/api/settings/oidc` | Update OIDC settings |
| `POST` | `/api/settings/oidc/test` | Test OIDC provider connection |
| `GET` | `/api/settings/terraform/buckets` | List Terraform state buckets |
| `POST` | `/api/settings/terraform/buckets` | Add Terraform state bucket |
| `PUT` | `/api/settings/terraform/buckets/{id}` | Update bucket config |
| `DELETE` | `/api/settings/terraform/buckets/{id}` | Remove bucket config |
| `POST` | `/api/settings/terraform/buckets/{id}/paths` | Add state path to bucket |
| `PUT` | `/api/settings/terraform/paths/{id}` | Update state path |
| `DELETE` | `/api/settings/terraform/paths/{id}` | Remove state path |
| `POST` | `/api/settings/terraform/buckets/test` | Test S3 bucket access |
| `POST` | `/api/settings/terraform/buckets/list-objects` | Browse S3 bucket objects |
| `GET` | `/api/settings/cyberark` | Get CyberArk integration settings |
| `PUT` | `/api/settings/cyberark` | Update CyberArk settings |
| `POST` | `/api/settings/cyberark/test` | Test CyberArk API connection |
| `POST` | `/api/settings/cyberark/discover` | Discover tenant URLs from subdomain |
| `GET` | `/api/settings/cyberark/status` | CyberArk sync diagnostic status |
| `GET` | `/api/settings/cyberark/scim` | Get SCIM integration settings |
| `PUT` | `/api/settings/cyberark/scim` | Update SCIM settings |
| `POST` | `/api/settings/cyberark/scim/test` | Test SCIM OAuth2 connection |

## Development

### Using Makefile

```bash
# Docker operations
make docker-up        # Start all services
make docker-down      # Stop all services
make docker-logs      # View logs

# Database operations
make db-init          # Initialize database
make db-seed          # Seed sample data
make db-reset         # Reset database
make db-setup         # Init + seed

# Code formatting
make backend-format   # Format backend (black + isort)
make frontend-format  # Format frontend (Prettier)

# Terraform operations
make tf-init          # terraform init
make tf-plan          # terraform plan
make tf-apply         # terraform apply
make tf-destroy       # terraform destroy
```

### Running Tests

**Backend:**
```bash
cd backend
pytest -v
pytest --cov=app tests/  # With coverage
```

**Frontend:**
```bash
cd frontend
npm test
npm run test:coverage  # With coverage
```

### Code Style

**Backend:** Uses `black`, `isort`, `flake8`, and `mypy`
```bash
cd backend
black app/ tests/
isort app/ tests/
flake8 app/ tests/
mypy app --ignore-missing-imports
```

**Frontend:** Uses ESLint 9 (flat config) and Prettier
```bash
cd frontend
npm run lint
npm run format
npm run type-check
```

## CI/CD Pipelines

### Backend Tests (`.github/workflows/backend-tests.yml`)
- Lint & format checking (black, isort, flake8)
- Type checking (mypy)
- Unit tests with coverage (pytest)
- Docker build validation

### Frontend Tests (`.github/workflows/frontend-tests.yml`)
- Lint & format checking (ESLint, Prettier)
- Type checking (TypeScript)
- Unit tests with coverage (Vitest)

### Security Scanning (`.github/workflows/security-scan.yml`)
- Dependency audit (pip-audit, npm audit)
- SAST (Bandit, Semgrep)
- Container scanning (Trivy)
- Secret detection (Gitleaks)
- CodeQL analysis

### ECS Build & Deploy (`.github/workflows/ecs-build.yml`)
- Docker image build for backend and frontend
- Push to ECR on main/develop branch
- ECS Fargate deployment

### Infrastructure (`.github/workflows/infrastructure.yml`)
- Terraform format & validation
- TFLint
- Security scanning (Checkov, tfsec)
- Cost estimation (Infracost)

## Deployment

### AWS ECS Fargate

Deploy using Terraform:

```bash
cd infrastructure/environments/prod
terraform init
terraform plan
terraform apply
```

See [infrastructure/README.md](infrastructure/README.md) for detailed deployment instructions.

## Required Permissions

### AWS IAM Permissions

The application task role is managed by the standalone `iam` module (`infrastructure/modules/iam/`), decoupled from the ECS module so that it persists independently of the deployment mechanism. The required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EC2ReadAccess",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ec2:DescribeTags",
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeRouteTables",
        "ec2:DescribeInternetGateways",
        "ec2:DescribeNatGateways",
        "ec2:DescribeAddresses"
      ],
      "Resource": "*"
    },
    {
      "Sid": "RDSReadAccess",
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters",
        "rds:ListTagsForResource"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECSReadAccess",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeClusters",
        "ecs:ListClusters",
        "ecs:DescribeServices",
        "ecs:ListServices",
        "ecs:DescribeTasks",
        "ecs:ListTasks",
        "ecs:DescribeTaskDefinition",
        "ecs:DescribeContainerInstances"
      ],
      "Resource": "*"
    },
    {
      "Sid": "S3TerraformStateAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "*"
    }
  ]
}
```

### CyberArk Service Account Permissions

When CyberArk integration is enabled (`CYBERARK_ENABLED=true`), the application requires two dedicated service users in CyberArk with the following minimum permissions.

#### SCIM Service User (Identity User/Role Sync)

Used to collect users and roles from CyberArk Identity via the SCIM API. Configured via the SCIM settings in the admin UI (`/api/settings/cyberark/scim`).

| Resource | Permission | Purpose |
|----------|------------|---------|
| Users | Read | Enumerate Identity users for access mapping |
| Groups / Roles | Read | Enumerate Identity roles and role memberships |

#### Platform API Service User (Privilege Cloud + SIA)

Used to collect safes, privileged accounts, safe memberships, and Secure Infrastructure Access (SIA) policies from Privilege Cloud. Configured via the CyberArk settings in the admin UI (`/api/settings/cyberark`).

| Resource | Permission | Purpose |
|----------|------------|---------|
| Safes | List / Read (or **Privilege Cloud Auditors** role) | Enumerate safes and safe members |
| Accounts | List Accounts (or **Privilege Cloud Auditors** role) | Enumerate privileged accounts within safes |
| Safe Members | Read (or **Privilege Cloud Auditors** role) | Enumerate safe membership for access mapping |
| UAP Policies | Read | Read Secure Infrastructure Access (SIA) policies for JIT access mapping |

> **Tip**: Assigning the built-in **Privilege Cloud Auditors** role to the Platform API service user grants read-only access to safes, accounts, and safe members in a single step. If a more restrictive approach is preferred, grant individual permissions to only the desired safes.

## Tech Stack

### Backend
- **Framework**: FastAPI 0.128
- **Server**: Uvicorn (ASGI)
- **AWS SDK**: Boto3
- **HTTP Client**: httpx (CyberArk API calls)
- **Database**: SQLAlchemy + aiosqlite
- **Validation**: Pydantic v2
- **Auth**: Authlib (OIDC)

### Frontend
- **Framework**: React 18.2 + TypeScript 5.3
- **Build**: Vite 6.2
- **Styling**: TailwindCSS 3.4
- **State**: TanStack Query 5.17
- **Visualization**: React Flow 11.11 (topology + access mapping)
- **Testing**: Vitest 3.0 + Testing Library

### Infrastructure
- **IaC**: Terraform 1.6+
- **Container**: Docker + Docker Compose
- **Target**: AWS ECS Fargate

### Integrations
- **AWS**: EC2, RDS, ECS, VPC, Subnets, IGW, NAT GW, EIP, S3
- **CyberArk**: Privilege Cloud, Identity (SCIM), Secure Infrastructure Access (SIA)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines. In brief:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests and linting before committing
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

For security-related issues, see [SECURITY.md](SECURITY.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://reactjs.org/) - Frontend library
- [React Flow](https://reactflow.dev/) - Node-based graph visualization
- [TanStack Query](https://tanstack.com/query) - Data fetching and caching
- [Boto3](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html) - AWS SDK for Python
- [Terraform](https://www.terraform.io/) - Infrastructure as Code
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
