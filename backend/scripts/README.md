# Database Utility Scripts

This directory contains utility scripts for managing the SQLite database during development and testing.

## Scripts

### init_db.py

Initialize the database and create all tables without starting the full application.

**Usage:**
```bash
# From backend directory
python -m scripts.init_db

# Or directly
python scripts/init_db.py
```

**What it does:**
- Creates the SQLite database file if it doesn't exist
- Creates all tables based on SQLAlchemy models
- Lists all created tables

**When to use:**
- First time setup
- After pulling schema changes
- Testing database structure

---

### reset_db.py

Drop all tables and recreate them, resetting the database to a clean state.

⚠️ **WARNING:** This will delete all data in the database!

**Usage:**
```bash
# From backend directory
python -m scripts.reset_db

# Or directly
python scripts/reset_db.py
```

**What it does:**
- Drops all existing tables (requires confirmation)
- Recreates all tables from scratch
- Lists all created tables

**When to use:**
- Schema migrations during development
- Corrupted database recovery
- Clean slate for testing

---

### seed_db.py

Populate the database with sample data for development and testing.

**Usage:**
```bash
# From backend directory
python -m scripts.seed_db

# Or directly
python scripts/seed_db.py
```

**What it does:**
- Creates 3 AWS regions (us-east-1, us-west-2, eu-west-1)
- Creates 5 sample EC2 instances (mix of running/stopped/pending)
- Creates 4 sample RDS instances (mix of PostgreSQL/MySQL)
- Creates sync status entries
- Some resources marked as Terraform-managed for testing

**Sample data includes:**
- **Regions:** us-east-1, us-west-2, eu-west-1
- **EC2 Instances:**
  - web-server-01 (running, Terraform-managed)
  - api-server-01 (running, Terraform-managed)
  - worker-01 (stopped, not managed)
  - web-server-west-01 (running, Terraform-managed)
  - api-server-eu-01 (pending, not managed)
- **RDS Instances:**
  - prod-postgres-01 (available, Multi-AZ, Terraform-managed)
  - staging-mysql-01 (available, Terraform-managed)
  - dev-postgres-01 (stopped, not managed)
  - prod-postgres-west-01 (available, Multi-AZ, Terraform-managed)

**When to use:**
- Frontend development without AWS resources
- Testing UI components
- Demonstrating the application
- Integration testing

---

## Quick Start

Complete setup from scratch:

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize database and seed with data
python -m scripts.init_db
python -m scripts.seed_db

# Start the application
uvicorn app.main:app --reload
```

## Using Makefile Targets

If you prefer using make commands:

```bash
# Initialize database
make db-init

# Reset database
make db-reset

# Seed database with sample data
make db-seed

# Complete setup (init + seed)
make db-setup
```

## Environment Variables

These scripts respect the same environment variables as the main application:

- `DATABASE_URL`: Database connection string (default: `sqlite:///./data/app.db`)
- `LOG_LEVEL`: Logging verbosity (default: `INFO`)

## Notes

- All scripts are safe to run multiple times
- The database file is created in `backend/data/` by default
- SQLite is used for development; production should use PostgreSQL
- Scripts use async/await for consistency with the application
- Foreign key constraints are enabled for data integrity
