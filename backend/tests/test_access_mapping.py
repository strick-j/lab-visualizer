"""Tests for the AccessMappingService target matching logic."""

import json

from app.services.access_mapping import AccessMappingService


class TestTargetMatchesCriteria:
    """Tests for _target_matches_criteria static method.

    The method now uses AND logic across criteria types: every specified
    filter must match for the target to qualify.
    """

    # ------------------------------------------------------------------
    # Single criteria type
    # ------------------------------------------------------------------

    def test_single_vpc_match(self):
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-1",
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids={"vpc-1"},
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is True
        )

    def test_single_vpc_no_match(self):
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-2",
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids={"vpc-1"},
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is False
        )

    def test_multiple_vpc_ids_or_within_type(self):
        """OR logic within a criteria type: target matches if in the set."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-2",
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids={"vpc-1", "vpc-2", "vpc-3"},
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is True
        )

    def test_subnet_match(self):
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id="subnet-abc",
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids={"subnet-abc"},
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is True
        )

    # ------------------------------------------------------------------
    # AND logic across criteria types
    # ------------------------------------------------------------------

    def test_vpc_and_tags_both_match(self):
        """AND logic: both VPC and tags match -> True."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-1",
                target_subnet_id=None,
                target_tags_json=json.dumps({"Env": "prod"}),
                target_ip=None,
                target_fqdn=None,
                vpc_ids={"vpc-1"},
                subnet_ids=set(),
                tag_filters={"Env": ["prod"]},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is True
        )

    def test_vpc_matches_but_tags_do_not(self):
        """AND logic: VPC matches but tags don't -> False."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-1",
                target_subnet_id=None,
                target_tags_json=json.dumps({"Env": "dev"}),
                target_ip=None,
                target_fqdn=None,
                vpc_ids={"vpc-1"},
                subnet_ids=set(),
                tag_filters={"Env": ["prod"]},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is False
        )

    def test_tags_match_but_vpc_does_not(self):
        """AND logic: tags match but VPC doesn't -> False."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-999",
                target_subnet_id=None,
                target_tags_json=json.dumps({"Env": "prod"}),
                target_ip=None,
                target_fqdn=None,
                vpc_ids={"vpc-1"},
                subnet_ids=set(),
                tag_filters={"Env": ["prod"]},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is False
        )

    # ------------------------------------------------------------------
    # Tag AND across keys
    # ------------------------------------------------------------------

    def test_tags_and_across_keys_all_match(self):
        """All tag keys must match (AND across keys)."""
        tags = {"env": "dev", "managed": "terraform", "os": "linux"}
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=json.dumps(tags),
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={
                    "env": ["dev"],
                    "managed": ["terraform"],
                    "os": ["linux", "unix"],
                },
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is True
        )

    def test_tags_and_across_keys_one_missing(self):
        """One tag key missing on target -> False."""
        tags = {"env": "dev", "managed": "terraform"}
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=json.dumps(tags),
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={
                    "env": ["dev"],
                    "managed": ["terraform"],
                    "os": ["linux", "unix"],
                },
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is False
        )

    def test_tags_and_across_keys_value_mismatch(self):
        """Tag key present but value doesn't match -> False."""
        tags = {"env": "dev", "managed": "terraform", "os": "windows"}
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=json.dumps(tags),
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={
                    "env": ["dev"],
                    "managed": ["terraform"],
                    "os": ["linux", "unix"],
                },
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is False
        )

    # ------------------------------------------------------------------
    # Platform filtering (connection profile)
    # ------------------------------------------------------------------

    def test_platform_filter_ssh_only_rejects_windows(self):
        """SSH-only policy must reject Windows targets."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-1",
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids={"vpc-1"},
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
                target_platform="windows",
                allowed_platforms=["linux"],
            )
            is False
        )

    def test_platform_filter_ssh_only_allows_linux(self):
        """SSH-only policy must accept Linux targets."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-1",
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids={"vpc-1"},
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
                target_platform="linux",
                allowed_platforms=["linux"],
            )
            is True
        )

    def test_platform_filter_rdp_only_rejects_linux(self):
        """RDP-only policy must reject Linux targets."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-1",
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids={"vpc-1"},
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
                target_platform="linux",
                allowed_platforms=["windows"],
            )
            is False
        )

    def test_platform_filter_rdp_only_allows_windows(self):
        """RDP-only policy must accept Windows targets."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-1",
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids={"vpc-1"},
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
                target_platform="windows",
                allowed_platforms=["windows"],
            )
            is True
        )

    def test_platform_filter_empty_allows_any(self):
        """Empty allowed_platforms list means no platform restriction."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-1",
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids={"vpc-1"},
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
                target_platform="windows",
                allowed_platforms=[],
            )
            is True
        )

    # ------------------------------------------------------------------
    # Region filtering
    # ------------------------------------------------------------------

    def test_region_match(self):
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
                target_region="us-east-1",
                criteria_regions={"us-east-1", "us-east-2"},
            )
            is True
        )

    def test_region_no_match(self):
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
                target_region="eu-west-1",
                criteria_regions={"us-east-1", "us-east-2"},
            )
            is False
        )

    # ------------------------------------------------------------------
    # Account ID filtering
    # ------------------------------------------------------------------

    def test_account_id_match(self):
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
                target_account_id="123456789012",
                criteria_account_ids={"123456789012"},
            )
            is True
        )

    def test_account_id_no_match(self):
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
                target_account_id="999999999999",
                criteria_account_ids={"123456789012"},
            )
            is False
        )

    def test_account_id_none_when_required(self):
        """When account IDs are required but target has none -> False."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
                target_account_id=None,
                criteria_account_ids={"123456789012"},
            )
            is False
        )

    # ------------------------------------------------------------------
    # FQDN pattern matching
    # ------------------------------------------------------------------

    def test_fqdn_regex_match(self):
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn="web01.prod.example.com",
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[r".*\.prod\.example\.com"],
                ip_ranges=[],
            )
            is True
        )

    def test_fqdn_no_match(self):
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn="web01.dev.example.com",
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[r".*\.prod\.example\.com"],
                ip_ranges=[],
            )
            is False
        )

    # ------------------------------------------------------------------
    # IP range (CIDR) matching
    # ------------------------------------------------------------------

    def test_ip_range_match(self):
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=None,
                target_ip="10.0.1.50",
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=["10.0.0.0/8"],
            )
            is True
        )

    def test_ip_range_no_match(self):
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=None,
                target_ip="192.168.1.1",
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=["10.0.0.0/8"],
            )
            is False
        )

    # ------------------------------------------------------------------
    # Edge cases
    # ------------------------------------------------------------------

    def test_no_criteria_returns_false(self):
        """When no criteria are specified at all, return False."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-1",
                target_subnet_id="subnet-1",
                target_tags_json=json.dumps({"Env": "prod"}),
                target_ip="10.0.0.1",
                target_fqdn="host.example.com",
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is False
        )

    def test_tags_with_no_target_tags(self):
        """Tag criteria specified but target has no tags -> False."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={"Env": ["prod"]},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is False
        )

    def test_all_criteria_combined(self):
        """All criteria types specified and all match -> True."""
        tags = {"env": "dev", "managed": "terraform"}
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-1",
                target_subnet_id="subnet-1",
                target_tags_json=json.dumps(tags),
                target_ip="10.0.1.50",
                target_fqdn="host.dev.example.com",
                vpc_ids={"vpc-1"},
                subnet_ids={"subnet-1"},
                tag_filters={"env": ["dev"], "managed": ["terraform"]},
                fqdn_patterns=[r".*\.dev\.example\.com"],
                ip_ranges=["10.0.0.0/8"],
                target_region="us-east-1",
                criteria_regions={"us-east-1"},
                target_account_id="123456789012",
                criteria_account_ids={"123456789012"},
                target_platform="linux",
                allowed_platforms=["linux"],
            )
            is True
        )

    def test_all_criteria_combined_one_fails(self):
        """All criteria specified but region doesn't match -> False."""
        tags = {"env": "dev", "managed": "terraform"}
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id="vpc-1",
                target_subnet_id="subnet-1",
                target_tags_json=json.dumps(tags),
                target_ip="10.0.1.50",
                target_fqdn="host.dev.example.com",
                vpc_ids={"vpc-1"},
                subnet_ids={"subnet-1"},
                tag_filters={"env": ["dev"], "managed": ["terraform"]},
                fqdn_patterns=[r".*\.dev\.example\.com"],
                ip_ranges=["10.0.0.0/8"],
                target_region="eu-west-1",
                criteria_regions={"us-east-1"},
                target_account_id="123456789012",
                criteria_account_ids={"123456789012"},
                target_platform="linux",
                allowed_platforms=["linux"],
            )
            is False
        )

    def test_vpc_missing_on_target_when_required(self):
        """VPC IDs specified but target has no vpc_id -> False."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids={"vpc-1"},
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is False
        )

    def test_region_and_account_combined(self):
        """Region + account ID both specified and match."""
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=None,
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={},
                fqdn_patterns=[],
                ip_ranges=[],
                target_region="us-east-2",
                criteria_regions={"us-east-1", "us-east-2"},
                target_account_id="475601244925",
                criteria_account_ids={"475601244925"},
            )
            is True
        )

    # ------------------------------------------------------------------
    # Case-insensitive tag value matching
    # ------------------------------------------------------------------

    def test_tag_value_case_insensitive_match(self):
        """Tag value 'Terraform' should match policy value 'terraform'."""
        tags = {"ManagedBy": "Terraform"}
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=json.dumps(tags),
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={"ManagedBy": ["terraform"]},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is True
        )

    def test_tag_value_case_insensitive_uppercase_policy(self):
        """Tag value 'ubuntu' should match policy value 'Ubuntu'."""
        tags = {"OS": "ubuntu"}
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=json.dumps(tags),
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={"OS": ["Ubuntu"]},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is True
        )

    def test_tag_value_case_insensitive_or_within_values(self):
        """Target 'RHEL' should match policy values ['AL2023','Fedora','rhel']."""
        tags = {"OS": "RHEL"}
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=json.dumps(tags),
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={"OS": ["AL2023", "Fedora", "rhel"]},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is True
        )

    def test_tag_value_case_insensitive_still_rejects_mismatch(self):
        """Non-matching value should still fail regardless of case."""
        tags = {"OS": "Windows"}
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=json.dumps(tags),
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={"OS": ["Ubuntu", "RHEL"]},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is False
        )

    def test_tag_value_case_insensitive_multiple_keys(self):
        """Multiple tag keys with case-insensitive values should AND correctly."""
        tags = {
            "Environment": "Dev",
            "ManagedBy": "Terraform",
            "Project": "papaya",
            "OS": "Ubuntu",
        }
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=json.dumps(tags),
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={
                    "Environment": ["dev"],
                    "ManagedBy": ["terraform"],
                    "Project": ["Papaya"],
                    "OS": ["Ubuntu"],
                },
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is True
        )

    def test_tag_value_scalar_case_insensitive(self):
        """Scalar (non-list) tag filter value should also be case-insensitive."""
        tags = {"Env": "PRODUCTION"}
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=json.dumps(tags),
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={"Env": "production"},
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is True
        )

    def test_tag_extra_tags_on_target_dont_prevent_match(self):
        """Target with extra tags beyond what policy specifies should still match."""
        tags = {
            "Environment": "Dev",
            "ManagedBy": "Terraform",
            "Project": "Papaya",
            "OS": "Ubuntu",
            "Name": "my-instance",
            "ExtraTag": "some-value",
        }
        assert (
            AccessMappingService._target_matches_criteria(
                target_vpc_id=None,
                target_subnet_id=None,
                target_tags_json=json.dumps(tags),
                target_ip=None,
                target_fqdn=None,
                vpc_ids=set(),
                subnet_ids=set(),
                tag_filters={
                    "Environment": ["dev"],
                    "ManagedBy": ["terraform"],
                },
                fqdn_patterns=[],
                ip_ranges=[],
            )
            is True
        )
