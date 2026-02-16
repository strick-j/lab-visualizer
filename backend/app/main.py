"""
AWS Infrastructure Visualizer - Main Application Entry Point.

This module initializes the FastAPI application and registers all routes.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import get_current_user
from app.api.routes import (
    access_mapping,
    audit,
    auth,
    cyberark,
    ec2,
    ecs,
    eip,
    health,
    igw,
    info,
    nat_gateway,
    rds,
    resources,
    s3,
)
from app.api.routes import settings as settings_routes
from app.api.routes import subnet, terraform, topology, users, vpc
from app.config import get_settings
from app.models.database import init_db
from app.version import get_version

# Configure logging
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    from app.models.database import async_session_maker
    from app.services.auth import ensure_admin_user
    from app.services.cyberark_settings import ensure_cyberark_settings

    # Startup
    logger.info("Starting AWS Infrastructure Visualizer...")
    await init_db()
    logger.info("Database initialized")

    # Ensure admin user and CyberArk settings exist if configured
    async with async_session_maker() as session:
        await ensure_admin_user(session)
        await ensure_cyberark_settings(session)

    yield

    # Shutdown
    logger.info("Shutting down AWS Infrastructure Visualizer...")


# Create FastAPI application
app = FastAPI(
    title="AWS Infrastructure Visualizer",
    description="Visual representation of AWS infrastructure state",
    version=get_version(),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS with explicit methods and headers for security
# Avoid using wildcards in production environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Authorization",
        "Content-Language",
        "Content-Type",
        "Origin",
        "X-Requested-With",
    ],
)

# Authentication dependency for protected routes
auth_dependency = [Depends(get_current_user)]

# Register API routes - public routes (no auth required)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(info.router, prefix="/api", tags=["Info"])

# Register API routes - protected routes (auth required)
app.include_router(
    resources.router, prefix="/api", tags=["Resources"], dependencies=auth_dependency
)
app.include_router(
    ec2.router, prefix="/api", tags=["EC2"], dependencies=auth_dependency
)
app.include_router(
    rds.router, prefix="/api", tags=["RDS"], dependencies=auth_dependency
)
app.include_router(
    vpc.router, prefix="/api", tags=["VPC"], dependencies=auth_dependency
)
app.include_router(
    subnet.router, prefix="/api", tags=["Subnets"], dependencies=auth_dependency
)
app.include_router(
    igw.router,
    prefix="/api",
    tags=["Internet Gateways"],
    dependencies=auth_dependency,
)
app.include_router(
    nat_gateway.router,
    prefix="/api",
    tags=["NAT Gateways"],
    dependencies=auth_dependency,
)
app.include_router(
    eip.router, prefix="/api", tags=["Elastic IPs"], dependencies=auth_dependency
)
app.include_router(
    s3.router, prefix="/api", tags=["S3 Buckets"], dependencies=auth_dependency
)
app.include_router(
    ecs.router, prefix="/api", tags=["ECS Containers"], dependencies=auth_dependency
)
app.include_router(
    terraform.router,
    prefix="/api/terraform",
    tags=["Terraform"],
    dependencies=auth_dependency,
)
app.include_router(
    topology.router, prefix="/api", tags=["Topology"], dependencies=auth_dependency
)

# User management routes
app.include_router(
    users.router,
    prefix="/api/users",
    tags=["Users"],
    dependencies=auth_dependency,
)

# CyberArk resource routes
app.include_router(
    cyberark.router,
    prefix="/api/cyberark",
    tags=["CyberArk"],
    dependencies=auth_dependency,
)

# Access mapping routes
app.include_router(
    access_mapping.router,
    prefix="/api",
    tags=["Access Mapping"],
    dependencies=auth_dependency,
)

# Settings routes - admin only (auth is handled within the route handlers)
app.include_router(
    settings_routes.router,
    prefix="/api/settings",
    tags=["Settings"],
    dependencies=auth_dependency,
)

# Audit log routes - admin only (auth check in route handler)
app.include_router(
    audit.router,
    prefix="/api",
    tags=["Audit"],
    dependencies=auth_dependency,
)


@app.get("/")
async def root():
    """Root endpoint redirects to API documentation."""
    return {
        "name": "AWS Infrastructure Visualizer",
        "version": get_version(),
        "docs": "/docs",
    }
