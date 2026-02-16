"""
S3 bucket collector.

Collects S3 bucket data from AWS using the boto3 SDK.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from botocore.exceptions import ClientError

from app.collectors.base import BaseCollector

logger = logging.getLogger(__name__)


class S3BucketCollector(BaseCollector):
    """Collector for S3 Buckets."""

    async def collect(self) -> List[Dict[str, Any]]:
        """
        Collect all S3 buckets visible to the configured credentials.

        Returns:
            List of S3 bucket data dictionaries
        """
        logger.info("Collecting S3 buckets")
        buckets: List[Dict[str, Any]] = []

        try:
            s3 = self._get_client("s3")
            response = s3.list_buckets()

            for bucket in response.get("Buckets", []):
                bucket_data = await self._parse_bucket(s3, bucket)
                if bucket_data:
                    buckets.append(bucket_data)

            logger.info("Collected %d S3 buckets", len(buckets))

        except ClientError as e:
            self._handle_client_error(e, "S3 bucket collection")
        except Exception as e:
            logger.exception("Unexpected error collecting S3 buckets: %s", e)

        return buckets

    async def _parse_bucket(
        self, s3_client: Any, bucket: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Parse an S3 bucket response into a normalized dictionary,
        enriched with region, tags, policy, encryption, versioning,
        and public access block data.

        Args:
            s3_client: Boto3 S3 client
            bucket: Raw bucket data from list_buckets

        Returns:
            Normalized S3 bucket dictionary, or None if parsing fails
        """
        bucket_name = bucket.get("Name")
        if not bucket_name:
            return None

        try:
            creation_date = bucket.get("CreationDate")

            # Get bucket region
            region = self._get_bucket_region(s3_client, bucket_name)

            # Get tags
            tags = self._get_bucket_tags(s3_client, bucket_name)
            name = tags.get("Name", bucket_name)

            # Get versioning status
            versioning = self._get_bucket_versioning(s3_client, bucket_name)

            # Get encryption configuration
            encryption = self._get_bucket_encryption(s3_client, bucket_name)

            # Get public access block
            public_access = self._get_public_access_block(s3_client, bucket_name)

            # Get bucket policy (stored as JSON string)
            policy = self._get_bucket_policy(s3_client, bucket_name)

            return {
                "bucket_name": bucket_name,
                "name": name,
                "region": region or self.region,
                "creation_date": creation_date,
                "tags": tags,
                "versioning_enabled": versioning.get("enabled", False),
                "mfa_delete": versioning.get("mfa_delete", False),
                "encryption_algorithm": encryption.get("algorithm"),
                "kms_key_id": encryption.get("kms_key_id"),
                "bucket_key_enabled": encryption.get("bucket_key_enabled", False),
                "block_public_acls": public_access.get("block_public_acls", False),
                "block_public_policy": public_access.get("block_public_policy", False),
                "ignore_public_acls": public_access.get("ignore_public_acls", False),
                "restrict_public_buckets": public_access.get(
                    "restrict_public_buckets", False
                ),
                "policy": policy,
            }

        except Exception as e:
            logger.warning("Error parsing S3 bucket %s: %s", bucket_name, e)
            return None

    def _get_bucket_region(self, s3_client: Any, bucket_name: str) -> Optional[str]:
        """Get the region of an S3 bucket."""
        try:
            resp = s3_client.get_bucket_location(Bucket=bucket_name)
            # LocationConstraint is None for us-east-1
            location = resp.get("LocationConstraint")
            return location or "us-east-1"
        except ClientError:
            return None

    def _get_bucket_tags(self, s3_client: Any, bucket_name: str) -> Dict[str, str]:
        """Get tags for an S3 bucket."""
        try:
            resp = s3_client.get_bucket_tagging(Bucket=bucket_name)
            tag_set = resp.get("TagSet", [])
            return {tag["Key"]: tag.get("Value", "") for tag in tag_set}
        except ClientError:
            # NoSuchTagSet is expected when bucket has no tags
            return {}

    def _get_bucket_versioning(
        self, s3_client: Any, bucket_name: str
    ) -> Dict[str, bool]:
        """Get versioning status for an S3 bucket."""
        try:
            resp = s3_client.get_bucket_versioning(Bucket=bucket_name)
            return {
                "enabled": resp.get("Status") == "Enabled",
                "mfa_delete": resp.get("MFADelete") == "Enabled",
            }
        except ClientError:
            return {"enabled": False, "mfa_delete": False}

    def _get_bucket_encryption(
        self, s3_client: Any, bucket_name: str
    ) -> Dict[str, Any]:
        """Get server-side encryption configuration for an S3 bucket."""
        try:
            resp = s3_client.get_bucket_encryption(Bucket=bucket_name)
            rules = (
                resp.get("ServerSideEncryptionConfiguration", {})
                .get("Rules", [{}])[0]
                .get("ApplyServerSideEncryptionByDefault", {})
            )
            bucket_key = (
                resp.get("ServerSideEncryptionConfiguration", {})
                .get("Rules", [{}])[0]
                .get("BucketKeyEnabled", False)
            )
            return {
                "algorithm": rules.get("SSEAlgorithm"),
                "kms_key_id": rules.get("KMSMasterKeyID") or None,
                "bucket_key_enabled": bucket_key,
            }
        except ClientError:
            return {}

    def _get_public_access_block(
        self, s3_client: Any, bucket_name: str
    ) -> Dict[str, bool]:
        """Get public access block configuration for an S3 bucket."""
        try:
            resp = s3_client.get_public_access_block(Bucket=bucket_name)
            config = resp.get("PublicAccessBlockConfiguration", {})
            return {
                "block_public_acls": config.get("BlockPublicAcls", False),
                "block_public_policy": config.get("BlockPublicPolicy", False),
                "ignore_public_acls": config.get("IgnorePublicAcls", False),
                "restrict_public_buckets": config.get("RestrictPublicBuckets", False),
            }
        except ClientError:
            return {}

    def _get_bucket_policy(self, s3_client: Any, bucket_name: str) -> Optional[str]:
        """Get bucket policy as a JSON string."""
        try:
            resp = s3_client.get_bucket_policy(Bucket=bucket_name)
            policy_str = resp.get("Policy")
            if policy_str:
                # Validate it's valid JSON, then return as-is
                json.loads(policy_str)
                return policy_str
            return None
        except ClientError:
            return None
        except json.JSONDecodeError:
            return None

    async def collect_bucket(self, bucket_name: str) -> Optional[Dict[str, Any]]:
        """
        Collect a specific S3 bucket by name.

        Args:
            bucket_name: The S3 bucket name

        Returns:
            S3 bucket data dictionary, or None if not found
        """
        try:
            s3 = self._get_client("s3")

            # Verify bucket exists by calling head_bucket
            s3.head_bucket(Bucket=bucket_name)

            # Build a minimal bucket dict for _parse_bucket
            bucket_info = {"Name": bucket_name}
            return await self._parse_bucket(s3, bucket_info)

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code in ("404", "NoSuchBucket"):
                logger.warning("S3 bucket not found: %s", bucket_name)
            else:
                self._handle_client_error(e, f"S3 bucket lookup: {bucket_name}")
        except Exception as e:
            logger.exception("Error collecting S3 bucket %s: %s", bucket_name, e)

        return None


async def collect_all_regions() -> List[Dict[str, Any]]:
    """
    Collect S3 buckets (S3 is a global service, so only one call is needed).

    Returns:
        List of all S3 buckets
    """
    from app.config import get_settings

    settings = get_settings()

    collector = S3BucketCollector(region=settings.aws_region)
    return await collector.collect()
