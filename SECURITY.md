# Security Policy

## Supported Versions

The following versions of AWS Lab Infrastructure Visualizer are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly. **Do not open a public GitHub issue for security vulnerabilities.**

### How to Report

1. **GitHub Private Vulnerability Reporting (Preferred)**: Use [GitHub's private vulnerability reporting](https://github.com/strick-j/lab-visualizer/security/advisories/new) to submit a report directly through the repository.

2. **Email**: If private vulnerability reporting is not available, contact the maintainers by opening a [blank issue](https://github.com/strick-j/lab-visualizer/issues/new) requesting a private security contact, without disclosing vulnerability details.

### What to Include

When reporting a vulnerability, please provide:

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Affected versions or components (backend, frontend, infrastructure)
- Any relevant logs, screenshots, or proof-of-concept code
- Suggested fix, if available

### What to Expect

- **Acknowledgment**: You will receive an acknowledgment within 72 hours of your report.
- **Assessment**: The maintainers will assess the severity and impact of the vulnerability.
- **Updates**: You will be kept informed of the progress toward a fix.
- **Resolution**: Once a fix is available, a security advisory will be published along with the patched release.
- **Credit**: Contributors who report valid vulnerabilities will be credited in the advisory, unless they prefer to remain anonymous.

## Security Best Practices for Deployment

This project interacts with AWS APIs and handles infrastructure state data. Follow these practices when deploying:

### Authentication & Secrets

- Never commit AWS credentials, API keys, or secrets to the repository
- Use IAM roles (not access keys) for AWS authentication in production
- Rotate the `SESSION_SECRET` environment variable and use a strong, random value
- Configure OIDC/SAML authentication for production environments

### Network & Access

- Restrict `CORS_ORIGINS` to only the specific domains that need access
- Deploy behind a load balancer with TLS termination
- Use private subnets for backend services in ECS Fargate deployments
- Limit IAM permissions to the minimum required (see README for required permissions)

### Data Protection

- Terraform state files may contain sensitive values; ensure S3 buckets have encryption enabled and appropriate access policies
- Use encrypted connections for database access in production
- Regularly audit access logs for the S3 buckets containing Terraform state

### Dependency Management

- Keep all dependencies up to date; this project runs automated dependency audits via CI
- Review security scanning results from Bandit, Semgrep, Trivy, and Gitleaks in the CI pipeline
- Run `pip-audit` and `npm audit` periodically to check for known vulnerabilities

## Scope

The following are considered in scope for security reports:

- Authentication and authorization bypasses
- Injection vulnerabilities (SQL, command, XSS)
- Exposure of sensitive data (credentials, Terraform state secrets)
- Server-side request forgery (SSRF)
- Insecure default configurations
- Dependency vulnerabilities with a feasible exploit path

The following are out of scope:

- Issues in third-party dependencies without a demonstrated exploit in this project's context
- Denial of service attacks
- Social engineering
- Issues requiring physical access to the server
