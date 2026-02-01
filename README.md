# AWS Lab Infrastructure Visualizer

A web application that provides visual representation of AWS infrastructure state, aggregating data from AWS APIs and Terraform state files to give real-time insights into your cloud resources.

![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![React](https://img.shields.io/badge/react-18.2-61dafb.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.3-3178c6.svg)
![FastAPI](https://img.shields.io/badge/fastapi-0.128-009688.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

- **Real-time Infrastructure View**: Monitor EC2 instances, RDS databases, VPCs, Subnets, Internet Gateways, NAT Gateways, and Elastic IPs
- **Interactive Topology Visualization**: Visual network topology with React Flow showing VPC → Subnet → Resource relationships
- **Terraform Integration**: Aggregate multiple Terraform state files from S3 backend to identify managed resources
- **Status Visualization**: Color-coded status indicators (running, stopped, pending, error)
- **Configuration Drift Detection**: Compare live AWS state against Terraform state to identify drift
- **SSO Authentication**: Secure access via SAML/OIDC identity providers
- **Dark/Light Theme**: Toggle between themes for comfortable viewing

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Frontend (React + TypeScript)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────┐ │
│  │   Pages     │  │  Components  │  │  Topology Visualization     │ │
│  │  VPCPage    │  │  common/     │  │  (React Flow)               │ │
│  │             │  │  dashboard/  │  │  VPC → Subnet → EC2/RDS     │ │
│  └─────────────┘  │  vpc/        │  └─────────────────────────────┘ │
│                   │  topology/   │                                   │
│                   │  resources/  │                                   │
│                   │  layout/     │                                   │
│                   └──────────────┘                                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       FastAPI Backend                                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │  API Routes  │  │   Services   │  │      Collectors            │ │
│  │  /api/*      │→ │   Business   │→ │  EC2, RDS, VPC, Subnet     │ │
│  │              │  │   Logic      │  │  IGW, NAT Gateway, EIP     │ │
│  └──────────────┘  └──────────────┘  └──────────┬─────────────────┘ │
│                                                  │                   │
│  ┌──────────────┐  ┌──────────────┐              │                   │
│  │   Parsers    │  │   Models     │              │                   │
│  │  Terraform   │  │  SQLAlchemy  │              │                   │
│  │  State       │  │  Database    │              │                   │
│  └──────────────┘  └──────────────┘              │                   │
└──────────────────────────────────────────────────┼───────────────────┘
                                                   │
        ┌──────────────────────────────────────────┼──────────────────┐
        │                                          │                  │
        ▼                                          ▼                  │
┌──────────────────┐                   ┌──────────────────────┐       │
│  Terraform State │                   │      AWS APIs        │       │
│  (S3 Backend)    │                   │  EC2, RDS, VPC, etc. │       │
└──────────────────┘                   └──────────────────────┘       │
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
| `OIDC_ISSUER` | SSO identity provider URL | - |
| `OIDC_CLIENT_ID` | OIDC client ID | - |
| `OIDC_CLIENT_SECRET` | OIDC client secret | - |

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
│   │   ├── api/routes/          # API endpoints
│   │   │   ├── health.py        # Health check
│   │   │   ├── ec2.py           # EC2 instances
│   │   │   ├── rds.py           # RDS instances
│   │   │   ├── vpc.py           # VPCs
│   │   │   ├── subnet.py        # Subnets
│   │   │   ├── igw.py           # Internet Gateways
│   │   │   ├── nat_gateway.py   # NAT Gateways
│   │   │   ├── eip.py           # Elastic IPs
│   │   │   ├── topology.py      # Topology data
│   │   │   └── terraform.py     # Terraform state
│   │   ├── collectors/          # AWS data collectors
│   │   ├── parsers/             # Terraform state parser
│   │   ├── models/              # SQLAlchemy models
│   │   └── schemas/             # Pydantic schemas
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
│   │   │   ├── topology/        # React Flow visualization
│   │   │   └── vpc/             # VPC-specific components
│   │   ├── pages/               # Page components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── api/                 # API client
│   │   ├── types/               # TypeScript types
│   │   └── contexts/            # React contexts
│   ├── eslint.config.js         # ESLint 9 flat config
│   └── package.json
│
├── infrastructure/              # Terraform IaC
│   ├── modules/                 # Reusable modules
│   │   ├── alb/                 # Application Load Balancer
│   │   ├── ecr/                 # Container Registry
│   │   ├── ecs/                 # ECS Fargate
│   │   ├── networking/          # VPC, Subnets
│   │   └── secrets/             # Secrets Manager
│   └── environments/
│       ├── dev/
│       └── prod/
│
├── config/                      # Configuration files
│   └── terraform-states.yml
├── .github/workflows/           # CI/CD pipelines
│   ├── backend-tests.yml
│   ├── security-scan.yml
│   └── infrastructure.yml
├── docker-compose.yml
├── Makefile                     # Task automation
├── CLAUDE.md                    # AI assistant context
└── README.md
```

## API Documentation

Access interactive API documentation at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/status/summary` | Resource counts by status |
| `GET` | `/api/ec2` | List EC2 instances |
| `GET` | `/api/ec2/{instance_id}` | EC2 instance details |
| `GET` | `/api/rds` | List RDS instances |
| `GET` | `/api/rds/{instance_id}` | RDS instance details |
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

# Terraform operations
make tf-init          # terraform init
make tf-plan          # terraform plan
make tf-apply         # terraform apply
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

### Security Scanning (`.github/workflows/security-scan.yml`)
- Dependency audit (pip-audit, npm audit)
- SAST (Bandit, Semgrep)
- Container scanning (Trivy)
- Secret detection (Gitleaks)
- CodeQL analysis

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

## IAM Permissions

The application requires the following AWS permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeInternetGateways",
        "ec2:DescribeNatGateways",
        "ec2:DescribeAddresses",
        "rds:DescribeDBInstances",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": "*"
    }
  ]
}
```

## Tech Stack

### Backend
- **Framework**: FastAPI 0.128
- **Server**: Uvicorn (ASGI)
- **AWS SDK**: Boto3
- **Database**: SQLAlchemy + aiosqlite
- **Validation**: Pydantic v2
- **Auth**: Authlib (OIDC/SAML)

### Frontend
- **Framework**: React 18.2 + TypeScript 5.3
- **Build**: Vite 6.2
- **Styling**: TailwindCSS 3.4
- **State**: TanStack Query 5.17
- **Visualization**: React Flow 11.11
- **Testing**: Vitest 3.0 + Testing Library

### Infrastructure
- **IaC**: Terraform 1.6+
- **Container**: Docker + Docker Compose
- **Target**: AWS ECS Fargate

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests and linting before committing
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

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
