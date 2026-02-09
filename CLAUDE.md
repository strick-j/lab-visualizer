# AWS Infrastructure Visualizer - Claude Code Context

> This file provides context for AI assistants working with this codebase.

## Project Overview

AWS Lab Infrastructure Visualizer is a web application that provides visual representation of AWS infrastructure state. It aggregates data from AWS APIs and Terraform state files to give real-time insights into AWS resources.

**Key Features:**
- Real-time infrastructure monitoring (EC2, RDS, VPC, Subnets, IGW, NAT Gateway, EIP)
- Interactive infrastructure topology visualization
- Terraform state file integration from S3 backend
- Configuration drift detection
- SSO/OIDC authentication
- Color-coded status visualization
- RESTful API with OpenAPI documentation

## Technology Stack

### Backend (Python 3.11+)
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | FastAPI | 0.128.0 |
| Server | Uvicorn (ASGI) | 0.34.0 |
| AWS SDK | Boto3 | ≥1.35.0 |
| Database | SQLAlchemy + aiosqlite | 2.0.25 |
| Validation | Pydantic | ≥2.7.0 |
| Auth | Authlib (OIDC) | ≥1.3.0 |
| Testing | pytest + pytest-asyncio | 7.4.4 |
| Linting | black, isort, flake8, mypy | - |

### Frontend (Node.js 18+)
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React + TypeScript | 18.2 / 5.3 |
| Build Tool | Vite | 6.2.0 |
| Styling | TailwindCSS | 3.4 |
| State Management | TanStack Query | 5.17 |
| HTTP Client | Axios | 1.6.5 |
| Routing | React Router DOM | 6.21 |
| Visualization | React Flow | 11.11 |
| Testing | Vitest + Testing Library | 3.0.0 |
| Linting | ESLint 9 (flat config) | 9.0.0 |

### Infrastructure
- **IaC**: Terraform 1.6+
- **Container**: Docker + Docker Compose
- **Deployment Target**: AWS ECS Fargate

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

## Directory Structure

```
lab-visualizer/
├── backend/                      # Python FastAPI application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry point, route registration
│   │   ├── config.py            # Pydantic Settings configuration
│   │   ├── api/
│   │   │   └── routes/          # API endpoints
│   │   │       ├── health.py    # Health check (/api/health)
│   │   │       ├── ec2.py       # EC2 instances (/api/ec2)
│   │   │       ├── rds.py       # RDS instances (/api/rds)
│   │   │       ├── vpc.py       # VPCs (/api/vpcs)
│   │   │       ├── subnet.py    # Subnets (/api/subnets)
│   │   │       ├── igw.py       # Internet Gateways (/api/internet-gateways)
│   │   │       ├── nat_gateway.py # NAT Gateways (/api/nat-gateways)
│   │   │       ├── eip.py       # Elastic IPs (/api/elastic-ips)
│   │   │       ├── terraform.py # Terraform state (/api/terraform/*)
│   │   │       ├── topology.py  # Topology data (/api/topology)
│   │   │       └── resources.py # Generic resources (/api/resources)
│   │   ├── collectors/          # AWS data collection
│   │   │   ├── base.py          # Abstract base collector
│   │   │   ├── ec2.py           # EC2 data collector
│   │   │   ├── rds.py           # RDS data collector
│   │   │   ├── vpc.py           # VPC data collector
│   │   │   ├── subnet.py        # Subnet data collector
│   │   │   ├── igw.py           # Internet Gateway collector
│   │   │   ├── nat_gateway.py   # NAT Gateway collector
│   │   │   └── eip.py           # Elastic IP collector
│   │   ├── parsers/
│   │   │   └── terraform.py     # Terraform state parser
│   │   ├── models/
│   │   │   ├── database.py      # DB connection setup
│   │   │   └── resources.py     # SQLAlchemy models
│   │   ├── schemas/
│   │   │   └── resources.py     # Pydantic request/response schemas
│   │   └── services/            # Business logic (placeholder)
│   ├── scripts/                 # Database management scripts
│   │   ├── init_db.py
│   │   ├── reset_db.py
│   │   └── seed_db.py
│   ├── tests/                   # Backend tests
│   ├── requirements.txt         # Production dependencies
│   ├── requirements-dev.txt     # Development dependencies
│   ├── pyproject.toml           # Tool configuration (pytest, black, isort, mypy)
│   └── Dockerfile
│
├── frontend/                    # React TypeScript application
│   ├── src/
│   │   ├── main.tsx            # Application entry point
│   │   ├── App.tsx             # Root component with routing
│   │   ├── types/              # TypeScript type definitions
│   │   │   ├── index.ts
│   │   │   ├── resources.ts    # Resource types (EC2, RDS, etc.)
│   │   │   └── topology.ts     # Topology types
│   │   ├── api/                # API client
│   │   │   ├── client.ts       # Axios instance configuration
│   │   │   └── index.ts        # API functions
│   │   ├── hooks/              # Custom React hooks
│   │   │   └── useResources.ts # Data fetching hooks
│   │   ├── contexts/           # React contexts
│   │   │   └── ThemeContext.tsx
│   │   ├── lib/                # Utility functions
│   │   │   └── utils.ts
│   │   ├── pages/              # Page components
│   │   │   └── VPCPage.tsx
│   │   └── components/
│   │       ├── common/         # Reusable UI components
│   │       │   ├── Card.tsx
│   │       │   ├── Button.tsx
│   │       │   ├── Select.tsx
│   │       │   ├── StatusBadge.tsx
│   │       │   ├── TerraformBadge.tsx
│   │       │   ├── Loading.tsx
│   │       │   ├── EmptyState.tsx
│   │       │   ├── SearchInput.tsx
│   │       │   └── ThemeToggle.tsx
│   │       ├── layout/         # Layout components
│   │       │   ├── Layout.tsx
│   │       │   ├── Header.tsx
│   │       │   └── Sidebar.tsx
│   │       ├── dashboard/      # Dashboard components
│   │       │   ├── StatusCard.tsx
│   │       │   └── ResourceSummaryCard.tsx
│   │       ├── resources/      # Resource list components
│   │       │   ├── ResourceTable.tsx
│   │       │   ├── ResourceFilters.tsx
│   │       │   └── ResourceDetailPanel.tsx
│   │       ├── topology/       # Infrastructure visualization
│   │       │   ├── InfrastructureTopology.tsx
│   │       │   ├── TopologyCanvas.tsx
│   │       │   ├── TopologyLegend.tsx
│   │       │   ├── nodes/      # React Flow node components
│   │       │   │   ├── VPCNode.tsx
│   │       │   │   ├── SubnetNode.tsx
│   │       │   │   ├── EC2Node.tsx
│   │       │   │   ├── RDSNode.tsx
│   │       │   │   └── GatewayNode.tsx
│   │       │   └── utils/
│   │       │       └── layoutCalculator.ts
│   │       └── vpc/            # VPC-specific components
│   │           ├── VPCList.tsx
│   │           ├── VPCDetailPanel.tsx
│   │           ├── SubnetList.tsx
│   │           ├── SubnetDetailPanel.tsx
│   │           ├── IGWList.tsx
│   │           ├── IGWDetailPanel.tsx
│   │           ├── NATGatewayList.tsx
│   │           ├── NATGatewayDetailPanel.tsx
│   │           ├── ElasticIPList.tsx
│   │           ├── ElasticIPDetailPanel.tsx
│   │           ├── VPCTabNavigation.tsx
│   │           └── SubnetTypeBadge.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.js        # ESLint 9 flat config
│   ├── tailwind.config.js
│   ├── Dockerfile              # Production build
│   ├── Dockerfile.dev          # Development with hot reload
│   └── nginx.conf              # Production nginx config
│
├── infrastructure/             # Terraform IaC
│   ├── modules/               # Reusable modules
│   │   ├── alb/               # Application Load Balancer
│   │   ├── ecr/               # Elastic Container Registry
│   │   ├── ecs/               # ECS Fargate service
│   │   ├── networking/        # VPC, subnets, etc.
│   │   └── secrets/           # AWS Secrets Manager
│   └── environments/
│       ├── dev/               # Development environment
│       └── prod/              # Production environment
│
├── config/
│   └── terraform-states.yml   # Terraform state file configuration
│
├── .github/workflows/         # CI/CD pipelines
│   ├── backend-tests.yml      # Backend lint, type-check, test, build
│   ├── security-scan.yml      # Security scanning (SAST, deps, secrets)
│   └── infrastructure.yml     # Terraform validation
│
├── docker-compose.yml         # Local development setup
├── Makefile                   # Task automation
├── README.md                  # User documentation
├── CLAUDE.md                  # This file (AI assistant context)
└── .env.example               # Environment variable template
```

## Development Commands

### Quick Start
```bash
# Start all services with Docker
docker-compose up -d

# Or use Makefile
make docker-up
```

### Backend Development
```bash
cd backend

# Install dependencies
pip install -r requirements.txt -r requirements-dev.txt

# Run development server
uvicorn app.main:app --reload --port 8000

# Run tests
pytest -v
pytest --cov=app tests/

# Linting & formatting
black app/ tests/          # Format code
isort app/ tests/          # Sort imports
flake8 app/ tests/         # Lint
mypy app --ignore-missing-imports  # Type check
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Run tests
npm test

# Linting & formatting
npm run lint              # ESLint
npm run format            # Prettier
npm run type-check        # TypeScript
```

### Database Management
```bash
make db-init    # Initialize database
make db-seed    # Seed with sample data
make db-reset   # Reset database
make db-setup   # Init + seed
```

### Infrastructure (Terraform)
```bash
# Set environment (dev or prod)
export ENV=dev

make tf-init    # terraform init
make tf-plan    # terraform plan
make tf-apply   # terraform apply
```

## API Endpoints

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
| `GET` | `/api/topology` | Get topology data for visualization |
| `POST` | `/api/refresh` | Trigger data refresh from AWS |
| `GET` | `/api/terraform/states` | List Terraform state files |
| `GET` | `/api/terraform/drift` | Detect configuration drift |

**API Documentation**: http://localhost:8000/docs (Swagger UI) or http://localhost:8000/redoc

## Environment Variables

See `.env.example` for complete list. Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_ACCOUNT_ID` | Target AWS account | - |
| `TF_STATE_BUCKET` | S3 bucket for Terraform state | - |
| `DATABASE_URL` | Database connection | `sqlite:///./data/app.db` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000,http://localhost:5173` |
| `SESSION_SECRET` | Session signing key | (change in production) |
| `OIDC_ISSUER` | SSO identity provider URL | - |

## CI/CD Pipelines

### Backend Tests (`.github/workflows/backend-tests.yml`)
- **Lint & Format**: black, isort, flake8
- **Type Check**: mypy
- **Unit Tests**: pytest with coverage
- **Docker Build**: Build validation

### Security Scanning (`.github/workflows/security-scan.yml`)
- **Dependency Audit**: pip-audit, npm audit
- **SAST**: Bandit (Python), Semgrep
- **Container Scan**: Trivy
- **Secret Detection**: Gitleaks
- **CodeQL**: JavaScript/TypeScript, Python

### Infrastructure (`.github/workflows/infrastructure.yml`)
- **Format Check**: terraform fmt
- **Validation**: terraform validate
- **Linting**: TFLint
- **Security**: Checkov, tfsec
- **Cost Estimation**: Infracost (PRs only)

## Patterns & Conventions

### Backend Patterns
1. **Collector Pattern**: Each AWS service has a dedicated collector class in `collectors/`
2. **Schema Separation**: Pydantic schemas (API) separate from SQLAlchemy models (DB)
3. **Dependency Injection**: FastAPI's DI for database sessions
4. **Async/Await**: All endpoints and DB operations are async
5. **Configuration**: Pydantic Settings with validation

### Frontend Patterns
1. **Component Organization**: `common/`, `layout/`, feature-specific (`vpc/`, `topology/`)
2. **Type Safety**: Full TypeScript with strict mode
3. **Data Fetching**: TanStack Query for caching and state
4. **Styling**: TailwindCSS utility classes with `tailwind-merge` and `clsx`
5. **Custom Hooks**: Encapsulate data fetching logic in `hooks/`

### Naming Conventions

**Backend (Python):**
- Files: `snake_case.py`
- Functions/Variables: `snake_case`
- Classes: `PascalCase`
- Constants: `ALL_CAPS`

**Frontend (TypeScript/React):**
- Components: `PascalCase.tsx`
- Utilities/Hooks: `camelCase.ts`
- Types/Interfaces: `PascalCase`
- Variables/Functions: `camelCase`
- CSS Classes: `kebab-case` (via Tailwind)

### Test File Conventions
- Backend: `tests/test_*.py`
- Frontend: Co-located as `*.test.tsx` or `*.test.ts`

## Adding New AWS Resource Types

1. **Backend Collector** (`backend/app/collectors/`):
   ```python
   from app.collectors.base import BaseCollector

   class NewResourceCollector(BaseCollector):
       async def collect(self) -> list:
           # Implement AWS API calls
           pass
   ```

2. **Database Model** (`backend/app/models/resources.py`)

3. **Pydantic Schema** (`backend/app/schemas/resources.py`)

4. **API Route** (`backend/app/api/routes/`):
   - Create route file
   - Register in `backend/app/main.py`

5. **Frontend Types** (`frontend/src/types/`)

6. **Frontend Components** (`frontend/src/components/`)

7. **Update API client** (`frontend/src/api/`)

## Important Notes for AI Assistants

### Code Style
- Backend uses 88-char line length (Black default)
- Frontend uses Prettier defaults
- ESLint 9 flat config (not legacy `.eslintrc`)
- All code should pass lint/format checks before committing

### Security Considerations
- Never commit secrets or credentials
- AWS credentials via IAM roles in production
- Session secret must be randomized in production
- CORS origins must be explicitly configured
- Use parameterized queries (SQLAlchemy handles this)

### Testing Requirements
- Backend: pytest with async support (`pytest-asyncio`)
- Frontend: Vitest with React Testing Library
- Tests should be co-located in frontend
- Mocking: `moto` for AWS, vitest mocks for frontend

### Database Notes
- SQLite for development, PostgreSQL for production
- Use async SQLAlchemy operations
- Database file stored in `backend/data/app.db`

### Docker Development
- Backend mounts `app/` for hot reload
- Frontend mounts `src/` for Vite HMR
- AWS credentials mounted from `~/.aws`
- Use `docker-compose logs -f` for debugging

### Common Issues
1. **AWS credentials**: Ensure `~/.aws/credentials` is configured
2. **Frontend build**: Run `npm install` before `docker-compose build`
3. **Database errors**: Run `make db-init` if tables don't exist
4. **CORS errors**: Check `CORS_ORIGINS` includes frontend URL
5. **Type errors**: Run `npm run type-check` before committing

## IAM Permissions Required

The backend application task role is managed by the standalone `iam` module
(`infrastructure/modules/iam/`), decoupled from the ECS module so that it
persists independently of the deployment mechanism.

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

## Quick Reference

| Task | Command |
|------|---------|
| Start all services | `make docker-up` |
| Stop all services | `make docker-down` |
| Run backend tests | `cd backend && pytest` |
| Run frontend tests | `cd frontend && npm test` |
| Format backend | `cd backend && black app/ && isort app/` |
| Format frontend | `cd frontend && npm run format` |
| Check types (backend) | `cd backend && mypy app` |
| Check types (frontend) | `cd frontend && npm run type-check` |
| View logs | `docker-compose logs -f` |
| API docs | http://localhost:8000/docs |
| Frontend | http://localhost:3000 |
