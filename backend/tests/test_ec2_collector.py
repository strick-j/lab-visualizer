"""Tests for EC2/RDS collectors: platform normalization,
owner_account_id extraction, and ARN parsing."""

from app.collectors.ec2 import EC2Collector
from app.collectors.rds import RDSCollector


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


class TestParseInstanceOwnerAccountId:
    """Tests that _parse_instance includes owner_account_id from Reservation."""

    def test_owner_account_id_included(self):
        """owner_account_id from Reservation.OwnerId is in parsed output."""
        collector = EC2Collector(region="us-east-1")
        instance = {
            "InstanceId": "i-123",
            "State": {"Name": "running"},
            "InstanceType": "t3.micro",
            "Tags": [],
        }
        result = collector._parse_instance(instance, owner_id="475601244925")
        assert result is not None
        assert result["owner_account_id"] == "475601244925"

    def test_owner_account_id_none_when_not_provided(self):
        """owner_account_id defaults to None when not passed."""
        collector = EC2Collector(region="us-east-1")
        instance = {
            "InstanceId": "i-456",
            "State": {"Name": "stopped"},
            "InstanceType": "t3.small",
            "Tags": [],
        }
        result = collector._parse_instance(instance)
        assert result is not None
        assert result["owner_account_id"] is None


class TestRDSExtractAccountFromArn:
    """Tests for RDSCollector._extract_account_from_arn."""

    def test_valid_arn(self):
        arn = "arn:aws:rds:us-east-1:123456789012:db:mydb"
        assert RDSCollector._extract_account_from_arn(arn) == "123456789012"

    def test_none_arn(self):
        assert RDSCollector._extract_account_from_arn(None) is None

    def test_empty_arn(self):
        assert RDSCollector._extract_account_from_arn("") is None

    def test_malformed_arn(self):
        assert RDSCollector._extract_account_from_arn("not:an:arn") is None

    def test_cluster_arn(self):
        arn = "arn:aws:rds:eu-west-1:999888777666:cluster:my-cluster"
        assert RDSCollector._extract_account_from_arn(arn) == "999888777666"
