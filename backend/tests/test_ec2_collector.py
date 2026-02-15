"""Tests for the EC2 collector, specifically platform normalization."""

from app.collectors.ec2 import EC2Collector


class TestNormalizePlatform:
    """Tests for EC2Collector._normalize_platform."""

    def test_platform_windows(self):
        assert EC2Collector._normalize_platform("windows", None) == "windows"

    def test_platform_windows_case_insensitive(self):
        assert EC2Collector._normalize_platform("Windows", None) == "windows"

    def test_platform_none_defaults_to_linux(self):
        assert EC2Collector._normalize_platform(None, None) == "linux"

    def test_platform_details_linux(self):
        assert EC2Collector._normalize_platform(None, "Linux/UNIX") == "linux"

    def test_platform_details_windows(self):
        assert (
            EC2Collector._normalize_platform(None, "Windows with SQL Server")
            == "windows"
        )

    def test_platform_details_windows_case(self):
        assert EC2Collector._normalize_platform(None, "WINDOWS") == "windows"

    def test_platform_takes_precedence_over_details(self):
        """When Platform is set, it takes priority."""
        assert EC2Collector._normalize_platform("windows", "Linux/UNIX") == "windows"

    def test_empty_strings_default_to_linux(self):
        assert EC2Collector._normalize_platform("", "") == "linux"

    def test_platform_details_red_hat(self):
        assert (
            EC2Collector._normalize_platform(None, "Red Hat Enterprise Linux")
            == "linux"
        )
