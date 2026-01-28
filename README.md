# AWS Lab Infrastructure Visualizer

A web application that provides visual representation of AWS infrastructure state, aggregating data from AWS APIs and Terraform state files.

![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![React](https://img.shields.io/badge/react-18+-61dafb.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

- **Real-time Infrastructure View**: See the current state of EC2 instances and RDS databases
- **Terraform Integration**: Aggregate multiple Terraform state files to identify managed resources
- **Status Visualization**: Color-coded status indicators (active, inactive, transitioning, error)
- **SSO Authentication**: Secure access via SAML/OIDC identity providers
- **Drift Detection**: Compare AWS state against Terraform state to identify configuration drift

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AWS APIs      │     │ Terraform State │     │   AWS CLI       │
│   (Boto3)       │     │   (S3 Backend)  │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   FastAPI Backend      │
                    │   • Data Collectors    │
                    │   • State Aggregator   │
                    │   • REST API           │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │   React Frontend       │
                    │   • Dashboard          │
                    │   • Resource Lists     │
                    │   • Status Indicators  │
                    └────────────────────────┘
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- AWS credentials configured

### Local Development

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
   cd frontend
   npm install
   cd ..
   ```
   > **Note**: This step is required to generate the `package-lock.json` file, which is needed for the Docker build process.

4. **Start with Docker Compose**
   ```bash
   docker-compose up -d
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
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_REGION` | Default AWS region | `us-east-1` |
| `AWS_ACCOUNT_ID` | Target AWS account | `123456789012` |
| `TF_STATE_BUCKET` | S3 bucket containing Terraform state | `my-tf-state` |
| `TF_STATE_CONFIG` | Path to terraform-states.yml | `config/terraform-states.yml` |
| `OIDC_ISSUER` | SSO identity provider URL | `https://your-idp.okta.com` |
| `OIDC_CLIENT_ID` | OIDC client ID | `0oa...` |
| `OIDC_CLIENT_SECRET` | OIDC client secret | (use secrets manager) |
| `SESSION_SECRET` | Session signing key | (generate random) |
| `DATABASE_URL` | SQLite database path | `sqlite:///./data/app.db` |
| `LOG_LEVEL` | Logging verbosity | `INFO` |

### Terraform State Configuration

Configure multiple Terraform state files in `config/terraform-states.yml`:

```yaml
terraform_states:
  - name: "Compute"
    key: "lab/compute/terraform.tfstate"
    description: "EC2 instances"
    
  - name: "Databases"
    key: "lab/databases/terraform.tfstate"
    description: "RDS instances"
```

See [config/terraform-states.yml](config/terraform-states.yml) for full configuration options.

## Project Structure

```
aws-infra-visualizer/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── api/            # REST API routes
│   │   ├── collectors/     # AWS data collectors
│   │   ├── parsers/        # Terraform state parser
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── tests/
│   └── requirements.txt
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── api/
│   └── package.json
├── infrastructure/         # Terraform IaC
│   ├── modules/
│   └── environments/
├── config/                 # Configuration files
├── docs/                   # Documentation
├── docker-compose.yml
└── README.md
```

## API Documentation

Once running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/status/summary` | Resource counts by status |
| `GET` | `/api/ec2` | List EC2 instances |
| `GET` | `/api/rds` | List RDS instances |
| `POST` | `/api/refresh` | Trigger data refresh |
| `GET` | `/api/terraform/states` | List configured state files |
| `GET` | `/api/terraform/drift` | Detect configuration drift |

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

## Development

### Running Tests

**Backend:**
```bash
cd backend
pytest
```

**Frontend:**
```bash
cd frontend
npm test
```

### Code Style

**Backend:** Uses `black`, `isort`, and `flake8`
```bash
cd backend
black app/
isort app/
flake8 app/
```

**Frontend:** Uses ESLint and Prettier
```bash
cd frontend
npm run lint
npm run format
```

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
        "rds:DescribeDBInstances",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": "*"
    }
  ]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://reactjs.org/) - Frontend library
- [Boto3](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html) - AWS SDK for Python
- [Terraform](https://www.terraform.io/) - Infrastructure as Code
