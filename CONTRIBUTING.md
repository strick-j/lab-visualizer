# Contributing to AWS Lab Infrastructure Visualizer

We appreciate your contributions! To ensure a smooth process, please follow these guidelines.

## Branching Strategy

All features and bug fixes should be developed on feature branches off of the `develop` branch.

### Setting Your Default Branch Locally

To make `develop` the default branch when working on your local machine, use the following Git command in your repository's root directory:

```bash
git remote set-head origin develop
```

This ensures that `git clone` and other operations reference `develop` by default.

## Pull Requests

- **Always target the `develop` branch.** Do not open pull requests against `main`. The `main` branch is reserved for stable, production-ready releases.
- Your pull request description should clearly outline the changes made and link to any relevant issues.
- Ensure all CI checks pass before requesting review (linting, type checking, tests, security scans).

## Versioning

This project follows [Semantic Versioning](https://semver.org/) (SemVer) with the format **MAJOR.MINOR.PATCH**:

- **MAJOR** — Incompatible API or infrastructure changes
- **MINOR** — New features added in a backward-compatible manner
- **PATCH** — Backward-compatible bug fixes and security patches

### Current Version Locations

Version numbers are maintained in the following locations and must be kept in sync:

| File | Field |
|------|-------|
| `frontend/package.json` | `"version"` |
| `backend/app/main.py` | `version` parameter in FastAPI app initialization |

### Release Process

1. The `develop` branch is the integration branch for all in-progress work.
2. When a release is ready, `develop` is merged into `main`.
3. Releases are tagged on `main` using the format `vMAJOR.MINOR.PATCH` (e.g., `v1.1.0`).
4. Docker images are tagged automatically by CI using the git commit SHA and branch metadata. The `latest` tag is applied to builds from the `main` branch.

### Support Policy

Only the latest released version receives security updates and bug fixes. See [SECURITY.md](SECURITY.md) for details on reporting vulnerabilities.

## Development Setup

### Backend (Python)

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (React/TypeScript)

```bash
cd frontend
npm install
npm run dev
```

### Docker (Full Stack)

```bash
docker-compose up -d
```

## Code Quality

All contributions must pass the existing CI checks before merge.

### Backend

```bash
cd backend
black app/ tests/          # Format code
isort app/ tests/          # Sort imports
flake8 app/ tests/         # Lint
mypy app --ignore-missing-imports  # Type check
pytest -v                  # Run tests
```

### Frontend

```bash
cd frontend
npm run lint              # ESLint
npm run format            # Prettier
npm run type-check        # TypeScript
npm test                  # Vitest
```

## Coding Standards

- **Backend**: Python code follows Black formatting (88-char line length) with isort import sorting.
- **Frontend**: TypeScript/React code follows Prettier defaults with ESLint 9 flat config rules.
- Write tests for new functionality. Backend tests use pytest; frontend tests use Vitest with React Testing Library.
- Never commit secrets, credentials, or API keys. Use environment variables for configuration.

## Reporting Issues

If you find a bug or have a feature request, please open an issue on GitHub with:

- A clear description of the problem or proposed feature
- Steps to reproduce (for bugs)
- Expected vs. actual behavior
- Relevant environment details (OS, browser, Node/Python version)

For security vulnerabilities, follow the process described in [SECURITY.md](SECURITY.md).
