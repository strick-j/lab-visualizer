"""
Tests for Terraform state file parser.

Verifies correct extraction of AWS and CyberArk (idsec provider) resources,
including type recognition, ID mapping, diagnostic logging, and data-source
filtering.
"""

from app.parsers.terraform import TerraformStateParser


def _make_state(resources):
    """Build a minimal Terraform v4 state dict."""
    return {"version": 4, "resources": resources}


def _managed_block(type_name, name, instances, module=""):
    """Build a managed resource block."""
    block = {"mode": "managed", "type": type_name, "name": name, "instances": instances}
    if module:
        block["module"] = module
    return block


def _data_block(type_name, name, instances):
    """Build a data-source resource block."""
    return {
        "mode": "data",
        "type": type_name,
        "name": name,
        "instances": instances,
    }


def _instance(attrs, index_key=None):
    """Build a single instance entry."""
    inst = {"attributes": attrs}
    if index_key is not None:
        inst["index_key"] = index_key
    return inst


class TestSupportedTypes:
    """Verify the type whitelist includes all expected entries."""

    def test_aws_types_present(self):
        types = TerraformStateParser.get_all_supported_types()
        assert types["aws_instance"] == "ec2"
        assert types["aws_db_instance"] == "rds"
        assert types["aws_vpc"] == "vpc"

    def test_cyberark_types_present(self):
        types = TerraformStateParser.get_all_supported_types()
        assert "cyberark_safe" in types.values()
        assert "cyberark_safe_member" in types.values()
        assert "cyberark_account" in types.values()
        assert "cyberark_role" in types.values()
        assert "cyberark_user" in types.values()
        assert "cyberark_role_member" in types.values()
        assert "cyberark_sia_vm_policy" in types.values()
        assert "cyberark_sia_db_policy" in types.values()

    def test_idsec_pcloud_safe_maps_correctly(self):
        types = TerraformStateParser.get_all_supported_types()
        assert types.get("idsec_pcloud_safe") == "cyberark_safe"

    def test_idsec_pcloud_safe_member_maps_correctly(self):
        types = TerraformStateParser.get_all_supported_types()
        assert types.get("idsec_pcloud_safe_member") == "cyberark_safe_member"

    def test_idsec_identity_role_maps_correctly(self):
        types = TerraformStateParser.get_all_supported_types()
        assert types.get("idsec_identity_role") == "cyberark_role"

    def test_idsec_identity_user_maps_correctly(self):
        types = TerraformStateParser.get_all_supported_types()
        assert types.get("idsec_identity_user") == "cyberark_user"

    def test_idsec_identity_role_member_maps_correctly(self):
        types = TerraformStateParser.get_all_supported_types()
        assert types.get("idsec_identity_role_member") == "cyberark_role_member"

    def test_idsec_policy_vm_maps_correctly(self):
        types = TerraformStateParser.get_all_supported_types()
        assert types.get("idsec_policy_vm") == "cyberark_sia_vm_policy"

    def test_idsec_policy_db_maps_correctly(self):
        types = TerraformStateParser.get_all_supported_types()
        assert types.get("idsec_policy_db") == "cyberark_sia_db_policy"

    def test_random_password_maps_correctly(self):
        types = TerraformStateParser.get_all_supported_types()
        assert types.get("random_password") == "random_password"


class TestExtractV4Resources:
    """Test resource extraction from v4 state data."""

    def setup_method(self):
        self.parser = TerraformStateParser(bucket="test-bucket")

    def test_aws_ec2_extracted(self):
        state = _make_state(
            [
                _managed_block(
                    "aws_instance",
                    "web",
                    [_instance({"id": "i-abc123", "instance_type": "t3.micro"})],
                )
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "test.tfstate"
        )
        assert len(resources) == 1
        assert resources[0].resource_type == "aws_instance"
        assert resources[0].resource_id == "i-abc123"
        assert resources[0].resource_address == "aws_instance.web"
        assert skipped == 0

    def test_idsec_pcloud_safe_extracted(self):
        state = _make_state(
            [
                _managed_block(
                    "idsec_pcloud_safe",
                    "safes",
                    [
                        _instance(
                            {
                                "safe_name": "PAP-WIN-DOM-SVC",
                                "safe_id": "PAP-WIN-DOM-SVC",
                                "description": "Windows Domain Service Accounts",
                            },
                            index_key="SAFE-01",
                        )
                    ],
                )
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "safes.tfstate"
        )
        assert len(resources) == 1
        assert resources[0].resource_type == "idsec_pcloud_safe"
        assert resources[0].resource_id == "PAP-WIN-DOM-SVC"
        assert resources[0].resource_address == 'idsec_pcloud_safe.safes["SAFE-01"]'

    def test_idsec_pcloud_safe_member_extracted(self):
        state = _make_state(
            [
                _managed_block(
                    "idsec_pcloud_safe_member",
                    "admin_role_mappings",
                    [
                        _instance(
                            {
                                "member_name": "Papaya Windows Admins",
                                "member_type": "Role",
                                "safe_name": "PAP-WIN-DOM-SVC",
                                "permission_set": "full",
                            },
                            index_key="Windows-SAFE-01",
                        )
                    ],
                )
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "safes.tfstate"
        )
        assert len(resources) == 1
        assert resources[0].resource_type == "idsec_pcloud_safe_member"
        assert resources[0].resource_id == "Papaya Windows Admins"

    def test_idsec_identity_role_extracted_with_role_name(self):
        state = _make_state(
            [
                _managed_block(
                    "idsec_identity_role",
                    "cloud_admins",
                    [
                        _instance(
                            {
                                "role_id": "b85c83cd_4dae_4764_9995_0c8fa92dace8",
                                "role_name": "Papaya Cloud Admins",
                                "description": "Cloud admin role",
                            }
                        )
                    ],
                )
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "roles.tfstate"
        )
        assert len(resources) == 1
        assert resources[0].resource_id == "Papaya Cloud Admins"

    def test_idsec_identity_user_extracted_with_username(self):
        state = _make_state(
            [
                _managed_block(
                    "idsec_identity_user",
                    "users",
                    [
                        _instance(
                            {
                                "user_id": "abc-123",
                                "username": "joe@example.com",
                                "display_name": "Joe",
                            },
                            index_key="user-01",
                        )
                    ],
                )
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "users.tfstate"
        )
        assert len(resources) == 1
        assert resources[0].resource_id == "joe@example.com"

    def test_idsec_identity_role_member_extracted(self):
        state = _make_state(
            [
                _managed_block(
                    "idsec_identity_role_member",
                    "user_role_mappings",
                    [
                        _instance(
                            {
                                "member_id": "95ca056e-1a83-4cad-a0f9-e69209e44204",
                                "member_name": "adam.markert@papayadev.app",
                                "member_type": "USER",
                                "role_id": "713c01d4_d5f2_446f_ac9f_2dab4e2ecf6e",
                            },
                            index_key="Adam.Markert-Cloud",
                        ),
                        _instance(
                            {
                                "member_id": "95ca056e-1a83-4cad-a0f9-e69209e44204",
                                "member_name": "adam.markert@papayadev.app",
                                "member_type": "USER",
                                "role_id": "35753468_3cbb_4ddf_9859_b0adcd4ff8eb",
                            },
                            index_key="Adam.Markert-Database",
                        ),
                    ],
                )
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "users.tfstate"
        )
        assert len(resources) == 2
        assert resources[0].resource_type == "idsec_identity_role_member"
        assert resources[0].resource_id == "adam.markert@papayadev.app"
        assert (
            resources[0].resource_address
            == 'idsec_identity_role_member.user_role_mappings["Adam.Markert-Cloud"]'
        )
        assert (
            resources[1].resource_address
            == 'idsec_identity_role_member.user_role_mappings["Adam.Markert-Database"]'
        )
        assert skipped == 0

    def test_idsec_pcloud_account_extracted(self):
        state = _make_state(
            [
                _managed_block(
                    "idsec_pcloud_account",
                    "default_ssh_key_mapping",
                    [
                        _instance(
                            {
                                "account_id": "29_3",
                                "name": "papaya-provisioning-sshkey",
                                "safe_name": "PAP-DEF-CREDS",
                                "platform_id": "UnixSSHKeys",
                                "username": "OS Dependency - Do Not Use",
                            }
                        )
                    ],
                )
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "accounts.tfstate"
        )
        assert len(resources) == 1
        assert resources[0].resource_type == "idsec_pcloud_account"
        assert resources[0].resource_id == "29_3"
        assert resources[0].resource_address == "idsec_pcloud_account.default_ssh_key_mapping"
        assert skipped == 0

    def test_random_password_extracted(self):
        state = _make_state(
            [
                _managed_block(
                    "random_password",
                    "win_local_password",
                    [
                        _instance(
                            {
                                "id": "none",
                                "length": 32,
                                "result": "secret",
                                "special": True,
                            }
                        )
                    ],
                )
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "accounts.tfstate"
        )
        assert len(resources) == 1
        assert resources[0].resource_type == "random_password"
        assert resources[0].resource_id == "none"
        assert resources[0].resource_address == "random_password.win_local_password"
        assert skipped == 0

    def test_idsec_policy_vm_extracted(self):
        """SIA/UAP VM policy with nested metadata.name is extracted correctly."""
        state = _make_state(
            [
                _managed_block(
                    "idsec_policy_vm",
                    "ubuntu_access",
                    [
                        _instance(
                            {
                                "behavior": {
                                    "ssh_profile": {"username": "ubuntu"},
                                    "rdp_profile": None,
                                },
                                "metadata": {
                                    "name": "Papaya Ubuntu User Access",
                                    "description": "Grants access to Ubuntu VMs",
                                    "policy_id": "0db978b8-7434-44b6-b371-f69aff0f232b",
                                    "status": {"status": "Active"},
                                },
                                "principals": [
                                    {
                                        "id": "cfb56a2b_1275_4267_9d1a_8ba373fdc841",
                                        "name": "Papaya Linux Users",
                                        "type": "ROLE",
                                    }
                                ],
                                "targets": {
                                    "aws_resource": {
                                        "account_ids": ["475601244925"],
                                        "regions": ["us-east-2"],
                                        "vpc_ids": ["vpc-011861fe1033f483c"],
                                    }
                                },
                            }
                        )
                    ],
                )
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "sia/terraform.tfstate"
        )
        assert len(resources) == 1
        assert resources[0].resource_type == "idsec_policy_vm"
        assert resources[0].resource_id == "Papaya Ubuntu User Access"
        assert resources[0].resource_address == "idsec_policy_vm.ubuntu_access"
        assert skipped == 0

    def test_data_sources_filtered(self):
        state = _make_state(
            [
                _data_block(
                    "idsec_identity_role",
                    "lookup",
                    [_instance({"role_id": "some-id", "role_name": "Some Role"})],
                )
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "test.tfstate"
        )
        assert len(resources) == 0

    def test_unsupported_type_skipped_and_counted(self):
        state = _make_state(
            [
                _managed_block(
                    "conjur_secret",
                    "my_secret",
                    [_instance({"name": "data/vault/secret", "value": "hidden"})],
                ),
                _managed_block(
                    "aws_instance",
                    "web",
                    [_instance({"id": "i-abc123"})],
                ),
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "test.tfstate"
        )
        assert len(resources) == 1
        assert resources[0].resource_id == "i-abc123"
        assert skipped == 1
        assert "conjur_secret" in found_types
        assert found_types["conjur_secret"] == 1

    def test_missing_id_attribute_skipped(self):
        state = _make_state(
            [
                _managed_block(
                    "idsec_pcloud_safe",
                    "bad_safe",
                    [_instance({"description": "no safe_name attribute"})],
                )
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "test.tfstate"
        )
        assert len(resources) == 0
        assert skipped == 1

    def test_for_each_string_index_key(self):
        state = _make_state(
            [
                _managed_block(
                    "idsec_pcloud_safe",
                    "safes",
                    [
                        _instance(
                            {"safe_name": "SAFE-A"},
                            index_key="SAFE-01",
                        ),
                        _instance(
                            {"safe_name": "SAFE-B"},
                            index_key="SAFE-02",
                        ),
                    ],
                )
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "test.tfstate"
        )
        assert len(resources) == 2
        assert resources[0].resource_address == 'idsec_pcloud_safe.safes["SAFE-01"]'
        assert resources[1].resource_address == 'idsec_pcloud_safe.safes["SAFE-02"]'

    def test_for_each_integer_index_key(self):
        state = _make_state(
            [
                _managed_block(
                    "aws_instance",
                    "workers",
                    [
                        _instance({"id": "i-001"}, index_key=0),
                        _instance({"id": "i-002"}, index_key=1),
                    ],
                )
            ]
        )
        resources, _, _ = self.parser._extract_v4_resources(state, "test.tfstate")
        assert len(resources) == 2
        assert resources[0].resource_address == "aws_instance.workers[0]"
        assert resources[1].resource_address == "aws_instance.workers[1]"

    def test_module_prefix_in_address(self):
        state = _make_state(
            [
                _managed_block(
                    "aws_vpc",
                    "main",
                    [_instance({"id": "vpc-123"})],
                    module="module.networking",
                )
            ]
        )
        resources, _, _ = self.parser._extract_v4_resources(state, "test.tfstate")
        assert len(resources) == 1
        assert resources[0].resource_address == "module.networking.aws_vpc.main"

    def test_found_types_tracks_all_managed_types(self):
        state = _make_state(
            [
                _managed_block(
                    "idsec_pcloud_safe",
                    "safes",
                    [_instance({"safe_name": "S1"})],
                ),
                _managed_block(
                    "conjur_secret",
                    "secret",
                    [_instance({"name": "x", "value": "y"})],
                ),
                _data_block(
                    "terraform_remote_state",
                    "roles",
                    [_instance({"outputs": {}})],
                ),
            ]
        )
        _, found_types, _ = self.parser._extract_v4_resources(state, "test.tfstate")
        assert "idsec_pcloud_safe" in found_types
        assert "conjur_secret" in found_types
        # Data sources should NOT appear in found_types
        assert "terraform_remote_state" not in found_types

    def test_mixed_cyberark_state_file(self):
        """Simulate the real CyberArk safe state file structure."""
        state = _make_state(
            [
                # Data sources (should be filtered)
                _data_block(
                    "conjur_secret",
                    "identity_client_id",
                    [_instance({"name": "data/vault/secret", "value": "user@app"})],
                ),
                _data_block(
                    "idsec_identity_role",
                    "sia_access_role",
                    [
                        _instance(
                            {
                                "role_id": "DPA_RDP_Access",
                                "role_name": "DPA RDP Access",
                            }
                        )
                    ],
                ),
                # Managed safes (should be extracted)
                _managed_block(
                    "idsec_pcloud_safe",
                    "safes",
                    [
                        _instance(
                            {"safe_name": f"SAFE-{i}", "safe_id": f"SAFE-{i}"},
                            index_key=f"SAFE-{i:02d}",
                        )
                        for i in range(1, 15)
                    ],
                ),
                # Managed safe members (should be extracted)
                _managed_block(
                    "idsec_pcloud_safe_member",
                    "admin_role_mappings",
                    [
                        _instance(
                            {
                                "member_name": "Papaya Windows Admins",
                                "safe_name": "SAFE-1",
                            },
                            index_key="Windows-SAFE-01",
                        ),
                        _instance(
                            {
                                "member_name": "Papaya Cloud Admins",
                                "safe_name": "SAFE-10",
                            },
                            index_key="Cloud-SAFE-10",
                        ),
                    ],
                ),
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "cyberark/safes/terraform.tfstate"
        )
        # 14 safes + 2 safe members = 16 recognized
        assert len(resources) == 16
        assert skipped == 0
        safe_resources = [
            r for r in resources if "safe" == r.resource_type.split("_")[-1]
        ]
        member_resources = [
            r for r in resources if r.resource_type == "idsec_pcloud_safe_member"
        ]
        assert len(safe_resources) == 14
        assert len(member_resources) == 2
        # Data sources should not appear
        assert "conjur_secret" not in found_types
        assert "idsec_identity_role" not in found_types


    def test_mixed_account_state_file(self):
        """Simulate a real CyberArk account state file with mixed resource types."""
        state = _make_state(
            [
                # Data sources (should be filtered)
                _data_block(
                    "conjur_secret",
                    "identity_client_id",
                    [_instance({"name": "data/vault/secret", "value": "user@app"})],
                ),
                _data_block(
                    "terraform_remote_state",
                    "safes",
                    [_instance({"outputs": {}})],
                ),
                # Managed accounts (should be extracted)
                _managed_block(
                    "idsec_pcloud_account",
                    "default_ssh_key_mapping",
                    [
                        _instance(
                            {
                                "account_id": "29_3",
                                "name": "papaya-provisioning-sshkey",
                                "safe_name": "PAP-DEF-CREDS",
                                "platform_id": "UnixSSHKeys",
                            }
                        )
                    ],
                ),
                _managed_block(
                    "idsec_pcloud_account",
                    "default_win_local_admin",
                    [
                        _instance(
                            {
                                "account_id": "29_4",
                                "name": "papaya-provisioning-winlocaladmin",
                                "safe_name": "PAP-DEF-CREDS",
                                "platform_id": "WinServerLocal",
                            }
                        )
                    ],
                ),
                # Random password (should be extracted)
                _managed_block(
                    "random_password",
                    "win_local_password",
                    [_instance({"id": "none", "length": 32})],
                ),
            ]
        )
        resources, found_types, skipped = self.parser._extract_v4_resources(
            state, "cyberark/accounts/terraform.tfstate"
        )
        # 2 accounts + 1 random_password = 3 recognized
        assert len(resources) == 3
        assert skipped == 0
        account_resources = [
            r for r in resources if r.resource_type == "idsec_pcloud_account"
        ]
        random_resources = [
            r for r in resources if r.resource_type == "random_password"
        ]
        assert len(account_resources) == 2
        assert len(random_resources) == 1
        assert account_resources[0].resource_id == "29_3"
        assert account_resources[1].resource_id == "29_4"
        # Data sources should not appear
        assert "conjur_secret" not in found_types
        assert "terraform_remote_state" not in found_types


class TestExtractResourceId:
    """Test ID extraction for each resource type."""

    def setup_method(self):
        self.parser = TerraformStateParser(bucket="test-bucket")

    def test_ec2_id(self):
        assert (
            self.parser._extract_resource_id("aws_instance", {"id": "i-abc"}) == "i-abc"
        )

    def test_rds_identifier(self):
        assert (
            self.parser._extract_resource_id("aws_db_instance", {"identifier": "mydb"})
            == "mydb"
        )

    def test_cyberark_safe_name(self):
        assert (
            self.parser._extract_resource_id(
                "idsec_pcloud_safe", {"safe_name": "PAP-WIN"}
            )
            == "PAP-WIN"
        )

    def test_cyberark_safe_member_name(self):
        assert (
            self.parser._extract_resource_id(
                "idsec_pcloud_safe_member", {"member_name": "Admin Role"}
            )
            == "Admin Role"
        )

    def test_cyberark_account_uses_account_id(self):
        """Accounts use account_id, not id (which doesn't exist in idsec state)."""
        result = self.parser._extract_resource_id(
            "idsec_pcloud_account",
            {"account_id": "29_3", "name": "papaya-provisioning-sshkey"},
        )
        assert result == "29_3"

    def test_cyberark_account_returns_none_for_id_field(self):
        """If only 'id' is present (not 'account_id'), should return None."""
        result = self.parser._extract_resource_id(
            "idsec_pcloud_account",
            {"id": "wrong-field", "name": "some-account"},
        )
        assert result is None

    def test_cyberark_role_uses_role_name_not_name(self):
        """Ensure we use role_name, not name (which doesn't exist in state)."""
        result = self.parser._extract_resource_id(
            "idsec_identity_role",
            {"role_id": "some-guid", "role_name": "Papaya Admins"},
        )
        assert result == "Papaya Admins"

    def test_cyberark_role_returns_none_for_name_field(self):
        """If only 'name' is present (not 'role_name'), should return None."""
        result = self.parser._extract_resource_id(
            "idsec_identity_role",
            {"role_id": "some-guid", "name": "Wrong Field"},
        )
        assert result is None

    def test_cyberark_user_username(self):
        assert (
            self.parser._extract_resource_id(
                "idsec_identity_user", {"username": "joe@example.com", "user_id": "123"}
            )
            == "joe@example.com"
        )

    def test_cyberark_role_member_name(self):
        assert (
            self.parser._extract_resource_id(
                "idsec_identity_role_member",
                {"member_id": "abc-123", "member_name": "joe@example.com", "role_id": "role-1"},
            )
            == "joe@example.com"
        )

    def test_sia_vm_policy_nested_metadata_name(self):
        """SIA VM policy extracts name from nested metadata.name path."""
        result = self.parser._extract_resource_id(
            "idsec_policy_vm",
            {
                "metadata": {
                    "name": "Papaya Ubuntu User Access",
                    "policy_id": "0db978b8-7434-44b6-b371-f69aff0f232b",
                },
                "behavior": {"ssh_profile": {"username": "ubuntu"}},
            },
        )
        assert result == "Papaya Ubuntu User Access"

    def test_sia_db_policy_nested_metadata_name(self):
        """SIA DB policy also extracts name from nested metadata.name path."""
        result = self.parser._extract_resource_id(
            "idsec_policy_db",
            {
                "metadata": {
                    "name": "Papaya DB Access Policy",
                    "policy_id": "abc-123",
                },
            },
        )
        assert result == "Papaya DB Access Policy"

    def test_sia_vm_policy_missing_metadata_returns_none(self):
        """Returns None when metadata key is absent."""
        result = self.parser._extract_resource_id(
            "idsec_policy_vm",
            {"behavior": {"ssh_profile": {"username": "ubuntu"}}},
        )
        assert result is None

    def test_sia_vm_policy_missing_name_in_metadata_returns_none(self):
        """Returns None when metadata exists but name key is absent."""
        result = self.parser._extract_resource_id(
            "idsec_policy_vm",
            {"metadata": {"policy_id": "abc-123"}},
        )
        assert result is None

    def test_missing_field_returns_none(self):
        assert (
            self.parser._extract_resource_id(
                "aws_instance", {"instance_type": "t3.micro"}
            )
            is None
        )


class TestUnsupportedVersion:
    """Test handling of unsupported state format versions."""

    def setup_method(self):
        self.parser = TerraformStateParser(bucket="test-bucket")

    def test_version_3_returns_empty(self):
        state = {"version": 3, "resources": []}
        resources, found_types, skipped = self.parser._extract_resources(
            state, "old.tfstate"
        )
        assert resources == []
        assert found_types == {}
        assert skipped == 0
