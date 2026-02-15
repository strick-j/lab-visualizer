"""Tests for the CyberArk SIA policy collector helpers."""

from app.collectors.cyberark_sia import (
    CyberArkSIAPolicyCollector,
    _extract_allowed_platforms,
    _has_connect_profile,
)


class TestHasConnectProfile:
    """Tests for _has_connect_profile helper."""

    def test_ssh_with_username(self):
        assert _has_connect_profile({"username": "ec2-user"}) is True

    def test_rdp_with_local_ephemeral(self):
        data = {
            "localEphemeralUser": {
                "assignGroups": ["Administrators", "Remote Desktop Users"],
                "enableEphemeralUserReconnect": True,
            },
            "domainEphemeralUser": None,
        }
        assert _has_connect_profile(data) is True

    def test_rdp_all_none(self):
        """All sub-values null means no real profile."""
        data = {"localEphemeralUser": None, "domainEphemeralUser": None}
        assert _has_connect_profile(data) is False

    def test_none_input(self):
        assert _has_connect_profile(None) is False

    def test_empty_dict(self):
        assert _has_connect_profile({}) is False

    def test_non_dict_input(self):
        assert _has_connect_profile("ssh") is False
        assert _has_connect_profile(42) is False
        assert _has_connect_profile([]) is False


class TestExtractAllowedPlatforms:
    """Tests for _extract_allowed_platforms helper."""

    def test_ssh_only(self):
        """Policy with only SSH profile -> linux targets only."""
        behavior = {
            "connectAs": {
                "ssh": {"username": "ec2-user"},
                "rdp": None,
            }
        }
        assert _extract_allowed_platforms(behavior) == ["linux"]

    def test_rdp_only(self):
        """Policy with only RDP profile -> windows targets only."""
        behavior = {
            "connectAs": {
                "ssh": None,
                "rdp": {
                    "localEphemeralUser": {
                        "assignGroups": ["Administrators"],
                    },
                    "domainEphemeralUser": None,
                },
            }
        }
        assert _extract_allowed_platforms(behavior) == ["windows"]

    def test_both_ssh_and_rdp(self):
        """Policy with both SSH and RDP -> no platform restriction."""
        behavior = {
            "connectAs": {
                "ssh": {"username": "ec2-user"},
                "rdp": {
                    "localEphemeralUser": {
                        "assignGroups": [
                            "Administrators",
                            "Remote Desktop Users",
                        ],
                        "enableEphemeralUserReconnect": True,
                    },
                    "domainEphemeralUser": None,
                },
            }
        }
        assert _extract_allowed_platforms(behavior) == []

    def test_neither_ssh_nor_rdp(self):
        """No connection profiles -> no platform restriction."""
        behavior = {"connectAs": {"ssh": None, "rdp": None}}
        assert _extract_allowed_platforms(behavior) == []

    def test_empty_behavior(self):
        assert _extract_allowed_platforms({}) == []

    def test_missing_connect_as(self):
        assert _extract_allowed_platforms({"other": "data"}) == []

    def test_rdp_with_all_null_sub_values(self):
        """RDP present but all sub-values null -> treated as no RDP."""
        behavior = {
            "connectAs": {
                "ssh": {"username": "admin"},
                "rdp": {
                    "localEphemeralUser": None,
                    "domainEphemeralUser": None,
                },
            }
        }
        assert _extract_allowed_platforms(behavior) == ["linux"]


class TestExtractTargetCriteria:
    """Tests for _extract_target_criteria with connection profile data."""

    def test_criteria_includes_allowed_platforms_ssh_only(self):
        """SSH-only policy should include allowed_platforms in criteria."""
        raw = {
            "targets": {
                "AWS": {
                    "regions": ["us-east-1"],
                    "tags": [{"key": "env", "value": ["dev"]}],
                    "vpcIds": [],
                    "accountIds": ["123456789012"],
                }
            },
            "behavior": {
                "connectAs": {
                    "ssh": {"username": "ec2-user"},
                    "rdp": None,
                }
            },
        }
        criteria = CyberArkSIAPolicyCollector._extract_target_criteria(raw)
        assert criteria.get("allowed_platforms") == ["linux"]
        assert criteria.get("regions") == ["us-east-1"]
        assert criteria.get("account_ids") == ["123456789012"]
        assert criteria.get("tags") == {"env": ["dev"]}

    def test_criteria_no_platforms_when_both(self):
        """Both SSH and RDP -> no allowed_platforms in criteria."""
        raw = {
            "targets": {
                "AWS": {
                    "regions": ["us-east-1"],
                    "tags": [],
                    "vpcIds": ["vpc-123"],
                    "accountIds": [],
                }
            },
            "behavior": {
                "connectAs": {
                    "ssh": {"username": "admin"},
                    "rdp": {"localEphemeralUser": {"assignGroups": ["Admins"]}},
                }
            },
        }
        criteria = CyberArkSIAPolicyCollector._extract_target_criteria(raw)
        assert "allowed_platforms" not in criteria
        assert criteria.get("vpc_ids") == ["vpc-123"]

    def test_criteria_match_all_with_platform_restriction(self):
        """Empty AWS targets with SSH-only -> match_all + allowed_platforms."""
        raw = {
            "targets": {
                "AWS": {
                    "regions": [],
                    "tags": [],
                    "vpcIds": [],
                    "accountIds": [],
                }
            },
            "behavior": {
                "connectAs": {
                    "ssh": {"username": "ec2-user"},
                    "rdp": None,
                }
            },
        }
        criteria = CyberArkSIAPolicyCollector._extract_target_criteria(raw)
        assert criteria.get("match_all") is True
        assert criteria.get("allowed_platforms") == ["linux"]

    def test_full_real_policy_format(self):
        """Test with real CyberArk UAP API policy response structure."""
        raw = {
            "targets": {
                "AWS": {
                    "regions": ["us-east-2", "us-east-1"],
                    "tags": [
                        {"key": "env", "value": ["dev"]},
                        {"key": "managed", "value": ["terraform"]},
                        {"key": "os", "value": ["linux", "unix"]},
                    ],
                    "vpcIds": [],
                    "accountIds": ["475601244925"],
                }
            },
            "behavior": {
                "connectAs": {
                    "ssh": {"username": "ec2-user"},
                    "rdp": {
                        "localEphemeralUser": {
                            "assignGroups": [
                                "Administrators",
                                "Remote Desktop Users",
                            ],
                            "enableEphemeralUserReconnect": True,
                        },
                        "domainEphemeralUser": None,
                    },
                }
            },
        }
        criteria = CyberArkSIAPolicyCollector._extract_target_criteria(raw)
        assert criteria["regions"] == ["us-east-2", "us-east-1"]
        assert criteria["account_ids"] == ["475601244925"]
        assert criteria["tags"] == {
            "env": ["dev"],
            "managed": ["terraform"],
            "os": ["linux", "unix"],
        }
        assert "vpc_ids" not in criteria  # empty vpcIds
        # Both SSH and RDP -> no platform restriction
        assert "allowed_platforms" not in criteria
