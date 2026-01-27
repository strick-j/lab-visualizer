# AWS Infrastructure Visualizer - Project Context

## Project Overview

This is an AWS Infrastructure Visualizer web application that provides visual representation of AWS infrastructure state. It aggregates data from AWS APIs and Terraform state files to give real-time insights into EC2 instances, RDS databases, and other AWS resources.

**Key Features:**
- Real-time infrastructure monitoring (EC2, RDS)
- Terraform state file integration from S3 backend
- Configuration drift detection
- SSO/OIDC authentication
- Color-coded status visualization
- RESTful API with OpenAPI documentation

## Technology Stack

### Backend (Python)
- **Framework**: FastAPI 0.109.0
- **Server**: Uvicorn (ASGI)
- **AWS SDK**: Boto3 1.34.25
- **Database**: SQLAlchemy 2.0.25 with SQLite (aiosqlite)
- **Validation**: Pydantic 2.5.3
- **Auth**: Authlib 1.3.0 (OIDC/SAML)
- **Config**: PyYAML, python-dotenv

### Frontend (React/TypeScript)
- **Framework**: React 18.2 with TypeScript 5.3
- **Build Tool**: Vite 5.0
- **Styling**: TailwindCSS 3.4
- **State Management**: TanStack Query (React Query) 5.17
- **HTTP Client**: Axios 1.6.5
- **Routing**: React Router DOM 6.21
- **Icons**: Lucide React
- **Date Handling**: date-fns 3.2
- **Testing**: Vitest

### Infrastructure
- **IaC**: Terraform
- **Container**: Docker + Docker Compose
- **Deployment Target**: AWS ECS Fargate (planned)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  Components: Dashboard, ResourceTable, StatusBadges          │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API Routes  │  │   Services   │  │  Collectors  │      │
│  │  /api/*      │→ │   Business   │→ │  AWS Data    │      │
│  │              │  │   Logic      │  │  Retrieval   │      │
│  └──────────────┘  └──────────────┘  └──────┬───────┘      │
│                                              │               │
│  ┌──────────────┐  ┌──────────────┐         │               │
│  │   Parsers    │  │   Models     │         │               │
│  │  Terraform   │  │  SQLAlchemy  │         │               │
│  │  State       │  │  Database    │         │               │
│  └──────────────┘  └──────────────┘         │               │
└───────────────────────────────────────────┬─┘               │
                                            │                  │
        ┌───────────────────────────────────┼──────────────────┘
        │                                   │
        ▼                                   ▼
┌──────────────────┐            ┌──────────────────────┐
│  Terraform State │            │      AWS APIs        │
│  (S3 Backend)    │            │  EC2, RDS, etc.      │
└──────────────────┘            └──────────────────────┘
```

## Directory Structure

```
lab-visualizer/
├── backend/                    # Python FastAPI application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── config.py          # Configuration management
│   │   ├── api/               # API layer
│   │   │   ├── __init__.py
│   │   │   └── routes/        # Route handlers
│   │   │       ├── health.py  # Health check endpoint
│   │   │       ├── ec2.py     # EC2 instance routes
│   │   │       ├── rds.py     # RDS instance routes
│   │   │       ├── terraform.py # Terraform state routes
│   │   │       └── resources.py # Generic resource routes
│   │   ├── collectors/        # AWS data collection
│   │   │   ├── base.py        # Base collector class
│   │   │   ├── ec2.py         # EC2 data collector
│   │   │   └── rds.py         # RDS data collector
│   │   ├── parsers/           # Data parsers
│   │   │   └── terraform.py   # Terraform state parser
│   │   ├── models/            # Database models
│   │   │   ├── database.py    # DB connection setup
│   │   │   └── resources.py   # Resource models
│   │   └── schemas/           # Pydantic schemas
│   │       └── resources.py   # Request/response schemas
│   ├── tests/                 # Backend tests
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile             # Backend container
│
├── frontend/                  # React TypeScript application
│   ├── src/
│   │   ├── main.tsx          # Application entry point
│   │   ├── App.tsx           # Root component
│   │   ├── types/            # TypeScript types
│   │   │   ├── index.ts
│   │   │   └── resources.ts  # Resource type definitions
│   │   ├── components/       # React components
│   │   │   ├── common/       # Shared components
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── TerraformBadge.tsx
│   │   │   │   └── Loading.tsx
│   │   │   ├── layout/       # Layout components
│   │   │   │   ├── Layout.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── dashboard/    # Dashboard components
│   │   │   │   ├── StatusCard.tsx
│   │   │   │   └── ResourceSummaryCard.tsx
│   │   │   └── resources/    # Resource list components
│   │   │       ├── ResourceTable.tsx
│   │   │       ├── ResourceFilters.tsx
│   │   │       └── ResourceDetailPanel.tsx
│   │   ├── pages/            # Page components (likely)
│   │   ├── hooks/            # Custom React hooks
│   │   └── api/              # API client functions
│   ├── public/               # Static assets
│   ├── package.json          # Node dependencies
│   ├── vite.config.ts        # Vite configuration
│   ├── tailwind.config.js    # Tailwind configuration
│   ├── tsconfig.json         # TypeScript configuration
│   └── Dockerfile.dev        # Frontend dev container
│
├── infrastructure/           # Terraform IaC
│   ├── modules/             # Reusable Terraform modules
│   └── environments/        # Environment-specific configs
│
├── config/                  # Application configuration
│   └── terraform-states.yml # Terraform state file configs
│
├── docker-compose.yml       # Local development setup
├── Makefile                 # Common task automation
├── README.md               # Project documentation
├── .gitignore              # Git ignore rules
└── claude.md               # This file

```

## Key Components

### Backend Components

#### 1. API Routes (`backend/app/api/routes/`)
- **health.py**: Health check and readiness endpoints
- **ec2.py**: EC2 instance listing, filtering, detail retrieval
- **rds.py**: RDS instance listing and details
- **terraform.py**: Terraform state file listing and drift detection
- **resources.py**: Generic resource operations, status summaries

#### 2. Collectors (`backend/app/collectors/`)
- **base.py**: Abstract base class for all collectors
- **ec2.py**: Fetches EC2 instance data via Boto3
- **rds.py**: Fetches RDS instance data via Boto3
- Pattern: Each collector implements standard interface for data retrieval

#### 3. Parsers (`backend/app/parsers/`)
- **terraform.py**: Parses Terraform state files from S3
- Extracts resource information and metadata
- Maps Terraform resources to database models

#### 4. Models & Schemas
- **models/resources.py**: SQLAlchemy database models
- **schemas/resources.py**: Pydantic schemas for API validation
- Separation of concerns: DB layer vs API layer

### Frontend Components

#### 1. Common Components (`frontend/src/components/common/`)
- **Card.tsx**: Reusable card container
- **StatusBadge.tsx**: Color-coded status indicators (active/inactive/error)
- **TerraformBadge.tsx**: Indicates Terraform-managed resources
- **Loading.tsx**: Loading state UI

#### 2. Layout Components (`frontend/src/components/layout/`)
- **Layout.tsx**: Main application layout wrapper
- **Header.tsx**: Top navigation bar
- **Sidebar.tsx**: Side navigation menu

#### 3. Dashboard Components (`frontend/src/components/dashboard/`)
- **StatusCard.tsx**: Status summary cards
- **ResourceSummaryCard.tsx**: Resource count cards

#### 4. Resource Components (`frontend/src/components/resources/`)
- **ResourceTable.tsx**: Paginated resource listing
- **ResourceFilters.tsx**: Filter controls
- **ResourceDetailPanel.tsx**: Detailed resource view

## Configuration

### Environment Variables

**Backend** (used in docker-compose.yml and deployment):
- `AWS_REGION`: AWS region (default: us-east-1)
- `AWS_ACCOUNT_ID`: Target AWS account ID
- `TF_STATE_BUCKET`: S3 bucket for Terraform state files
- `TF_STATE_CONFIG`: Path to terraform-states.yml config
- `DATABASE_URL`: SQLite database path
- `LOG_LEVEL`: Logging level (DEBUG/INFO/WARNING/ERROR)
- `DEBUG`: Enable debug mode (true/false)
- `CORS_ORIGINS`: Allowed CORS origins
- `SESSION_SECRET`: Session signing secret
- `OIDC_ISSUER`: OIDC identity provider URL
- `OIDC_CLIENT_ID`: OIDC client ID
- `OIDC_CLIENT_SECRET`: OIDC client secret

**Frontend**:
- `VITE_API_URL`: Backend API URL (default: http://localhost:8000)

### Terraform States Configuration

Located at `config/terraform-states.yml`:
```yaml
terraform_states:
  - name: "Compute"
    key: "lab/compute/terraform.tfstate"
    description: "EC2 instances"
  - name: "Databases"
    key: "lab/databases/terraform.tfstate"
    description: "RDS instances"
```

## Development Workflow

### Local Development Setup

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **Backend only** (without Docker):
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

3. **Frontend only** (without Docker):
   ```bash
   cd frontend
   npm install
   npm run dev  # Starts on port 3000
   ```

### Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs (Swagger UI)
- API Documentation: http://localhost:8000/redoc (ReDoc)

### Testing

**Backend**:
```bash
cd backend
pytest
pytest --cov=app tests/  # With coverage
```

**Frontend**:
```bash
cd frontend
npm test          # Run Vitest
npm run type-check  # TypeScript check
```

### Code Quality

**Backend**:
```bash
cd backend
black app/        # Format code
isort app/        # Sort imports
flake8 app/       # Lint
```

**Frontend**:
```bash
cd frontend
npm run lint      # ESLint
npm run format    # Prettier
```

## API Endpoints

### Core Endpoints
- `GET /api/health` - Health check
- `GET /api/status/summary` - Resource status summary
- `GET /api/ec2` - List EC2 instances
- `GET /api/ec2/{instance_id}` - Get EC2 instance details
- `GET /api/rds` - List RDS instances
- `GET /api/rds/{instance_id}` - Get RDS instance details
- `POST /api/refresh` - Trigger data refresh from AWS
- `GET /api/terraform/states` - List configured Terraform state files
- `GET /api/terraform/drift` - Detect configuration drift

### Response Format
All API responses follow standard JSON format with Pydantic validation.

## Patterns & Conventions

### Backend Patterns
1. **Collector Pattern**: Each AWS service has a dedicated collector class
2. **Schema Separation**: Pydantic schemas separate from SQLAlchemy models
3. **Dependency Injection**: FastAPI's DI system for database sessions
4. **Async/Await**: Async endpoints with aiosqlite for non-blocking I/O
5. **Configuration**: Pydantic Settings for environment variable management

### Frontend Patterns
1. **Component Organization**: Common, Layout, Feature-specific directories
2. **Type Safety**: Full TypeScript with strict mode
3. **Data Fetching**: TanStack Query for caching and state management
4. **Styling**: TailwindCSS utility classes
5. **Code Splitting**: React Router for route-based splitting

### Naming Conventions
- **Backend**:
  - snake_case for files, functions, variables
  - PascalCase for classes
  - ALL_CAPS for constants
- **Frontend**:
  - PascalCase for components and types
  - camelCase for functions and variables
  - kebab-case for CSS classes

## Database Schema

SQLite database with SQLAlchemy ORM. Key models:
- **Resources**: Generic resource model (EC2, RDS, etc.)
- **TerraformStates**: Terraform state file metadata
- Relationships track which resources are Terraform-managed

## Authentication & Security

- SSO via OIDC/SAML (configurable)
- Session-based authentication with secure cookies
- CORS configuration for frontend-backend communication
- AWS credentials via IAM roles (in production) or local credentials (dev)

## Deployment

### Docker Compose (Development)
- Mounts code volumes for hot-reload
- Uses local AWS credentials
- SQLite database in named volume

### AWS ECS Fargate (Production - Planned)
- Terraform modules in `infrastructure/`
- Container images pushed to ECR
- Task IAM roles for AWS API access
- RDS instead of SQLite (likely)
- ALB for load balancing

## IAM Permissions Required

The application needs the following AWS permissions:
- `ec2:DescribeInstances`
- `ec2:DescribeInstanceStatus`
- `rds:DescribeDBInstances`
- `s3:GetObject` (for Terraform state files)
- `s3:ListBucket` (for Terraform state bucket)

## Common Tasks

### Adding a New AWS Resource Type
1. Create collector in `backend/app/collectors/`
2. Add database model in `backend/app/models/resources.py`
3. Create Pydantic schema in `backend/app/schemas/`
4. Add API routes in `backend/app/api/routes/`
5. Create frontend components in `frontend/src/components/`
6. Add TypeScript types in `frontend/src/types/`

### Adding a New Terraform State File
1. Update `config/terraform-states.yml`
2. Restart backend service
3. Trigger refresh via API

### Troubleshooting
- Check backend logs: `docker-compose logs backend`
- Check frontend logs: `docker-compose logs frontend`
- API health: `curl http://localhost:8000/api/health`
- AWS credentials: Ensure `~/.aws/credentials` is properly configured

## Important Notes

- SQLite is used for development; production should use PostgreSQL/RDS
- AWS credentials mounted from `~/.aws` in development
- Terraform state files must be in S3 (not local)
- CORS origins must include frontend URL
- Session secret must be changed in production
- Frontend uses Vite proxy for API calls in development

## Future Enhancements (Potential)

- Additional AWS services (Lambda, ECS, S3, etc.)
- Real-time updates via WebSockets
- Historical state tracking
- Cost analysis integration
- Resource tagging and organization
- Multi-account support
- Advanced filtering and search
- Export capabilities (CSV, PDF)
