.PHONY: help install dev build test lint clean docker-up docker-down

# Default target
help:
	@echo "AWS Infrastructure Visualizer - Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  install      Install all dependencies (backend + frontend)"
	@echo "  dev          Start development servers (backend + frontend)"
	@echo "  build        Build production artifacts"
	@echo "  test         Run all tests"
	@echo "  lint         Run linters"
	@echo "  clean        Remove build artifacts and caches"
	@echo ""
	@echo "Docker:"
	@echo "  docker-up    Start all services with Docker Compose"
	@echo "  docker-down  Stop all Docker services"
	@echo "  docker-build Build Docker images"
	@echo ""
	@echo "Backend:"
	@echo "  backend-install  Install backend dependencies"
	@echo "  backend-dev      Start backend dev server"
	@echo "  backend-test     Run backend tests"
	@echo "  backend-lint     Lint backend code"
	@echo ""
	@echo "Frontend:"
	@echo "  frontend-install Install frontend dependencies"
	@echo "  frontend-dev     Start frontend dev server"
	@echo "  frontend-test    Run frontend tests"
	@echo "  frontend-lint    Lint frontend code"
	@echo ""
	@echo "Database:"
	@echo "  db-init      Initialize database and create tables"
	@echo "  db-reset     Reset database (drops all data)"
	@echo "  db-seed      Seed database with sample data"
	@echo "  db-setup     Initialize and seed database"

# =============================================================================
# Combined Commands
# =============================================================================

install: backend-install frontend-install
	@echo "All dependencies installed"

dev:
	@echo "Starting development servers..."
	@make -j2 backend-dev frontend-dev

build: backend-build frontend-build
	@echo "Build complete"

test: backend-test frontend-test
	@echo "All tests passed"

lint: backend-lint frontend-lint
	@echo "Linting complete"

clean:
	@echo "Cleaning build artifacts..."
	rm -rf backend/__pycache__ backend/.pytest_cache backend/.coverage
	rm -rf frontend/dist frontend/node_modules/.cache
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@echo "Clean complete"

# =============================================================================
# Docker Commands
# =============================================================================

docker-up:
	docker-compose up -d
	@echo "Services started. API: http://localhost:8000, Frontend: http://localhost:3000"

docker-down:
	docker-compose down

docker-build:
	docker-compose build

docker-logs:
	docker-compose logs -f

# =============================================================================
# Backend Commands
# =============================================================================

backend-install:
	cd backend && pip install -r requirements.txt -r requirements-dev.txt

backend-dev:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

backend-test:
	cd backend && pytest -v

backend-lint:
	cd backend && black --check app/ tests/
	cd backend && isort --check-only app/ tests/
	cd backend && flake8 app/ tests/

backend-format:
	cd backend && black app/ tests/
	cd backend && isort app/ tests/

backend-build:
	cd backend && docker build -t aws-infra-visualizer-backend .

# =============================================================================
# Frontend Commands
# =============================================================================

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-test:
	cd frontend && npm test

frontend-lint:
	cd frontend && npm run lint

frontend-format:
	cd frontend && npm run format

frontend-build:
	cd frontend && npm run build

# =============================================================================
# Database Commands
# =============================================================================

db-init:
	@echo "Initializing database..."
	cd backend && python -m scripts.init_db

db-reset:
	@echo "Resetting database..."
	cd backend && python -m scripts.reset_db

db-seed:
	@echo "Seeding database with sample data..."
	cd backend && python -m scripts.seed_db

db-setup: db-init db-seed
	@echo "Database setup complete"

# =============================================================================
# Infrastructure Commands
# =============================================================================

tf-init:
	cd infrastructure/environments/$(ENV) && terraform init

tf-plan:
	cd infrastructure/environments/$(ENV) && terraform plan

tf-apply:
	cd infrastructure/environments/$(ENV) && terraform apply

tf-destroy:
	cd infrastructure/environments/$(ENV) && terraform destroy
