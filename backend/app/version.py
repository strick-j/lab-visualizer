"""
Application version management.

Reads the version from the root VERSION file or APP_VERSION environment variable.
"""

import os
from pathlib import Path

# Candidate locations for VERSION file
_VERSION_PATHS = [
    Path(__file__).resolve().parent.parent.parent / "VERSION",  # Repo root
    Path("/app/VERSION"),  # Docker mount
]


def get_version() -> str:
    """Get the application version.

    Priority:
        1. APP_VERSION environment variable (set during Docker builds)
        2. VERSION file (repo root or Docker mount)
        3. Fallback to "0.0.0-unknown"
    """
    env_version = os.environ.get("APP_VERSION")
    if env_version:
        return env_version.strip()
    for path in _VERSION_PATHS:
        try:
            return path.read_text().strip()
        except FileNotFoundError:
            continue
    return "0.0.0-unknown"
