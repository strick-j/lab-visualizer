"""
Tests for SSRF validation functions in settings routes.
"""

from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.api.routes.settings import (
    _build_safe_url,
    _validate_issuer_and_build_discovery_url,
    _validate_url_for_ssrf,
)


class TestValidateUrlForSsrf:
    """Tests for _validate_url_for_ssrf."""

    def test_rejects_http_scheme(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_url_for_ssrf("http://example.com")
        assert exc_info.value.status_code == 400
        assert "HTTPS" in exc_info.value.detail

    def test_rejects_ftp_scheme(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_url_for_ssrf("ftp://example.com")
        assert exc_info.value.status_code == 400

    def test_rejects_no_hostname(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_url_for_ssrf("https://")
        assert exc_info.value.status_code == 400

    def test_rejects_ipv4_literal(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_url_for_ssrf("https://192.168.1.1")
        assert exc_info.value.status_code == 400
        assert "domain name" in exc_info.value.detail

    def test_rejects_ipv6_literal(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_url_for_ssrf("https://[::1]")
        assert exc_info.value.status_code == 400

    def test_rejects_localhost_ip(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_url_for_ssrf("https://127.0.0.1")
        assert exc_info.value.status_code == 400

    @patch("app.api.routes.settings.socket.getaddrinfo")
    def test_rejects_private_ip_resolution(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (2, 1, 6, "", ("10.0.0.1", 0)),
        ]
        with pytest.raises(HTTPException) as exc_info:
            _validate_url_for_ssrf("https://internal.example.com")
        assert exc_info.value.status_code == 400
        assert "private" in exc_info.value.detail

    @patch("app.api.routes.settings.socket.getaddrinfo")
    def test_rejects_loopback_resolution(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (2, 1, 6, "", ("127.0.0.1", 0)),
        ]
        with pytest.raises(HTTPException) as exc_info:
            _validate_url_for_ssrf("https://evil.example.com")
        assert exc_info.value.status_code == 400
        assert "private" in exc_info.value.detail

    @patch("app.api.routes.settings.socket.getaddrinfo")
    def test_rejects_link_local_resolution(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (2, 1, 6, "", ("169.254.1.1", 0)),
        ]
        with pytest.raises(HTTPException) as exc_info:
            _validate_url_for_ssrf("https://metadata.example.com")
        assert exc_info.value.status_code == 400

    @patch("app.api.routes.settings.socket.getaddrinfo")
    def test_rejects_unresolvable_hostname(self, mock_getaddrinfo):
        mock_getaddrinfo.side_effect = OSError("Name resolution failed")
        with pytest.raises(HTTPException) as exc_info:
            _validate_url_for_ssrf("https://nonexistent.example.invalid")
        assert exc_info.value.status_code == 400
        assert "resolve" in exc_info.value.detail.lower()

    @patch("app.api.routes.settings.socket.getaddrinfo")
    def test_rejects_empty_resolution(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = []
        with pytest.raises(HTTPException) as exc_info:
            _validate_url_for_ssrf("https://empty.example.com")
        assert exc_info.value.status_code == 400

    @patch("app.api.routes.settings.socket.getaddrinfo")
    def test_accepts_valid_public_url(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (2, 1, 6, "", ("93.184.216.34", 0)),
        ]
        # Should not raise
        _validate_url_for_ssrf("https://accounts.google.com")

    @patch("app.api.routes.settings.socket.getaddrinfo")
    def test_accepts_url_with_path(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (2, 1, 6, "", ("93.184.216.34", 0)),
        ]
        _validate_url_for_ssrf("https://example.com/some/path")

    def test_rejects_hostname_with_invalid_chars(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_url_for_ssrf("https://exam ple.com")
        assert exc_info.value.status_code == 400


class TestBuildSafeUrl:
    """Tests for _build_safe_url."""

    def test_basic_url_reconstruction(self):
        result = _build_safe_url("https://example.com")
        assert result == "https://example.com"

    def test_url_with_path(self):
        result = _build_safe_url("https://example.com/tenant/v2")
        assert result == "https://example.com/tenant/v2"

    def test_url_with_appended_path(self):
        result = _build_safe_url(
            "https://example.com", "/.well-known/openid-configuration"
        )
        assert result == "https://example.com/.well-known/openid-configuration"

    def test_url_with_port(self):
        result = _build_safe_url("https://example.com:8443/path")
        assert result == "https://example.com:8443/path"

    def test_strips_trailing_slash_from_path(self):
        result = _build_safe_url("https://example.com/path/")
        assert result == "https://example.com/path"

    def test_idna_encoding_applied(self):
        # Standard ASCII domain should pass through IDNA encoding unchanged
        result = _build_safe_url("https://login.example.com")
        assert result == "https://login.example.com"

    def test_rejects_invalid_path_chars(self):
        with pytest.raises(HTTPException) as exc_info:
            _build_safe_url("https://example.com/path\x00evil")
        assert exc_info.value.status_code == 400
        assert "path" in exc_info.value.detail.lower()


class TestValidateIssuerAndBuildDiscoveryUrl:
    """Tests for _validate_issuer_and_build_discovery_url."""

    @patch("app.api.routes.settings.socket.getaddrinfo")
    def test_builds_discovery_url(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (2, 1, 6, "", ("93.184.216.34", 0)),
        ]
        result = _validate_issuer_and_build_discovery_url("https://accounts.google.com")
        assert result == (
            "https://accounts.google.com/.well-known/openid-configuration"
        )

    @patch("app.api.routes.settings.socket.getaddrinfo")
    def test_strips_trailing_slash(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (2, 1, 6, "", ("93.184.216.34", 0)),
        ]
        result = _validate_issuer_and_build_discovery_url(
            "https://accounts.google.com/"
        )
        assert result == (
            "https://accounts.google.com/.well-known/openid-configuration"
        )

    @patch("app.api.routes.settings.socket.getaddrinfo")
    def test_with_base_path(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (2, 1, 6, "", ("93.184.216.34", 0)),
        ]
        result = _validate_issuer_and_build_discovery_url(
            "https://login.example.com/tenant/v2"
        )
        assert result == (
            "https://login.example.com/tenant/v2" "/.well-known/openid-configuration"
        )

    def test_rejects_http(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_issuer_and_build_discovery_url("http://example.com")
        assert exc_info.value.status_code == 400

    def test_rejects_ip_address(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_issuer_and_build_discovery_url("https://10.0.0.1")
        assert exc_info.value.status_code == 400

    @patch("app.api.routes.settings.socket.getaddrinfo")
    def test_rejects_private_ip_resolution(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (2, 1, 6, "", ("192.168.1.1", 0)),
        ]
        with pytest.raises(HTTPException) as exc_info:
            _validate_issuer_and_build_discovery_url(
                "https://internal.corp.example.com"
            )
        assert exc_info.value.status_code == 400
