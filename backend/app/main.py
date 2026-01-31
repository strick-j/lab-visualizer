"""
AWS Infrastructure Visualizer - Main Application Entry Point.

This module initializes the FastAPI application and registers all routes.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    ec2,
    eip,
    health,
    igw,
    nat_gateway,
    rds,
    resources,
    subnet,
    terraform,
    topology,
    vpc,
)
from app.config import get_settings
from app.models.database import init_db

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
    # Startup
    logger.info("Starting AWS Infrastructure Visualizer...")
    await init_db()
    logger.info("Database initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AWS Infrastructure Visualizer...")


# Create FastAPI application
app = FastAPI(
    title="AWS Infrastructure Visualizer",
    description="Visual representation of AWS infrastructure state",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(resources.router, prefix="/api", tags=["Resources"])
app.include_router(ec2.router, prefix="/api", tags=["EC2"])
app.include_router(rds.router, prefix="/api", tags=["RDS"])
app.include_router(vpc.router, prefix="/api", tags=["VPC"])
app.include_router(subnet.router, prefix="/api", tags=["Subnets"])
app.include_router(igw.router, prefix="/api", tags=["Internet Gateways"])
app.include_router(nat_gateway.router, prefix="/api", tags=["NAT Gateways"])
app.include_router(eip.router, prefix="/api", tags=["Elastic IPs"])
app.include_router(terraform.router, prefix="/api/terraform", tags=["Terraform"])
app.include_router(topology.router, prefix="/api", tags=["Topology"])


@app.get("/")
async def root():
    """Root endpoint redirects to API documentation."""
    return {
        "name": "AWS Infrastructure Visualizer",
        "version": "1.0.0",
        "docs": "/docs",
    }
