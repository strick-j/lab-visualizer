# Test Coverage Analysis

> Generated: 2026-02-20
> Backend: 168 tests passing | 42% line coverage
> Frontend: 724 tests passing | varies by module (0–100%)

---

## Executive Summary

The project has a solid testing foundation with **168 backend** and **724 frontend** tests all passing. However, coverage is uneven—some modules are thoroughly tested while critical business logic and newer features have little to no coverage. The overall backend line coverage sits at **42%**, with route handlers and collectors being the weakest areas. The frontend has strong coverage for common UI components but significant gaps in newer feature areas (CyberArk, access mapping, settings panels).

---

## Backend Coverage by Module

| Module | Stmts | Covered | % | Assessment |
|--------|------:|--------:|--:|------------|
| **API Routes** | | | | |
| `routes/health.py` | 10 | 10 | 100% | Fully covered |
| `routes/info.py` | 8 | 7 | 88% | Good |
| `routes/users.py` | 42 | 26 | 62% | Decent — password change tested, admin ops not |
| `routes/auth.py` | 187 | 62 | 33% | **Gap** — no successful login/OIDC/refresh tests |
| `routes/resources.py` | 897 | 60 | 7% | **Critical gap** — largest file, nearly untested |
| `routes/topology.py` | 146 | 14 | 10% | **Critical gap** — visualization logic untested |
| `routes/settings.py` | 429 | 109 | 25% | Only SSRF validation covered |
| `routes/ecs.py` | 129 | 25 | 19% | **Gap** |
| `routes/cyberark.py` | 148 | 32 | 22% | **Gap** |
| All other routes | ~560 | ~170 | ~30% | Similar pattern |
| **Collectors** | | | | |
| `collectors/ec2.py` | 65 | 22 | 34% | Only utility functions tested |
| `collectors/ecs.py` | 115 | 14 | 12% | **Critical gap** |
| `collectors/subnet.py` | 98 | 12 | 12% | **Critical gap** |
| `collectors/s3.py` | 106 | 17 | 16% | **Gap** |
| All other collectors | ~500 | ~100 | ~20% | Minimal coverage |
| **Services** | | | | |
| `services/auth.py` | 268 | 95 | 35% | Token/session logic mostly untested |
| `services/access_mapping.py` | 370 | 86 | 23% | Only `_target_matches_criteria` tested |
| `services/settings.py` | 73 | 17 | 23% | **Gap** |
| `services/cyberark_settings.py` | 33 | 0 | 0% | **No tests at all** |
| **Parsers** | | | | |
| `parsers/terraform.py` | 282 | 123 | 44% | Good unit tests for extraction, S3 fetch untested |
| **Models & Schemas** | | | | |
| All schema files | ~805 | ~805 | 100% | Implicitly tested via route tests |
| `models/database.py` | 80 | 68 | 85% | Good |
| Other models | ~499 | ~499 | ~100% | Good |

## Frontend Coverage by Area

| Area | Coverage | Assessment |
|------|----------|------------|
| **Common components** (Button, Card, Select, etc.) | 84–100% | Well tested |
| **VPC components** (11 files) | 91–100% | Well tested |
| **Topology nodes** (EC2, RDS, Gateway) | 75–100% | Good, some gaps in VPCNode/SubnetNode |
| **Dashboard components** | 91–100% | Good |
| **Layout** (Header, Sidebar, Layout) | 41–100% | Header significantly under-tested |
| **Auth & Theme contexts** | 90%+ | Good |
| **Pages** (Dashboard, EC2List, RDSList, etc.) | 78–100% | Good for existing pages |
| **CyberArk components** (7 files) | **0%** | **No tests at all** |
| **Access Mapping components** (8+ files) | **0%** | **No tests at all** |
| **Settings panels** (5 files) | **0–3%** | **Nearly untested** |
| **Topology utilities** (layoutCalculator, topologyFilter) | **0–8%** | **Critical gap — pure logic, easy to test** |
| **ECSList page** | **0%** | **No tests** |
| **SetupPage** | **0%** | **No tests** |
| **API client** (`api/client.ts`) | 42% | Many API functions uncovered |
| **useResources hook** | 54% | Many query hooks untested |

---

## Priority Recommendations

### Priority 1: High-Value, High-Risk Gaps

These modules contain critical business logic and have minimal or no test coverage.

#### 1. Backend `routes/resources.py` (897 statements, 7% coverage)

This is the largest route file in the codebase and handles resource CRUD, filtering, pagination, and sync operations. A regression here could break the core data pipeline.

**What to test:**
- Resource listing with various filter combinations (status, type, VPC, search)
- Pagination behavior (offset, limit, total count)
- Resource sync endpoint (trigger refresh from AWS)
- Resource detail endpoints for each type
- Error handling when AWS data is unavailable
- Authorization checks on protected endpoints

#### 2. Backend `routes/topology.py` (146 statements, 10% coverage)

Topology is a key differentiating feature. The route constructs the graph data structure (nodes + edges) from raw resource data.

**What to test:**
- Graph construction with VPCs, subnets, and resources
- Edge generation between parent/child resources
- Empty state (no resources)
- Filtering by VPC or resource type
- Node positioning/grouping logic

#### 3. Backend `services/auth.py` (268 statements, 35% coverage)

Authentication is security-critical. Currently, only error paths (invalid credentials, missing tokens) are tested. Happy paths are not.

**What to test:**
- Successful login flow end-to-end (create user → login → get token → access resource)
- Token refresh lifecycle (access token expires → refresh → new access token)
- Session creation and revocation
- OIDC user creation and login (mocked OIDC provider)
- Password hashing verification
- Token expiration enforcement
- Concurrent session handling

#### 4. Frontend topology utilities (`layoutCalculator.ts` — 0%, `topologyFilter.ts` — 8%)

These are pure logic modules that compute graph layout positions and filter topology nodes. They're ideal candidates for unit tests — no UI rendering needed, just input/output verification.

**What to test:**
- `layoutCalculator.ts`: Layout with various node counts, nested VPC/subnet grouping, edge cases (empty graph, single node, deeply nested)
- `topologyFilter.ts`: Filter by resource type, status, VPC, search text, combined filters, clearing filters

#### 5. Frontend Settings panels (0–3% coverage)

The admin settings UI manages OIDC configuration, Terraform S3 buckets, and user management — all security-relevant.

**What to test:**
- `TerraformBucketsSettings.tsx`: Add/edit/delete bucket, add/edit/delete path, test connection flow
- `UserManagementPanel.tsx`: User list rendering, role changes, enable/disable user, admin guards
- `CyberArkSettings.tsx`: Configuration form, connection test, save/cancel flows

---

### Priority 2: Important Functional Gaps

#### 6. Backend AWS collectors (12–34% coverage each)

The collectors are the data ingestion layer. Bugs here produce stale or incorrect dashboards. Use `moto` (already a test dependency pattern in projects like this) or manual mocking of `boto3` clients.

**What to test per collector:**
- Successful collection with sample AWS API responses
- Pagination handling (multiple pages of results)
- AWS API errors (ClientError, throttling, access denied)
- Empty results
- Tag extraction and normalization
- Resource relationship mapping (e.g., subnet → VPC association)

**Highest-value collectors to test first:**
- `ec2.py` — full `collect()` method (not just `_normalize_platform`)
- `ecs.py` — cluster enumeration, service/task nesting
- `subnet.py` — subnet type detection (public vs private)
- `vpc.py` — VPC with attached resources

#### 7. Frontend CyberArk components (0% — 7 untested files)

These appear to be newer features with zero test coverage.

**What to test:**
- `RoleList.tsx`, `SafeList.tsx`, `UserList.tsx`: Rendering with data, empty states, loading, error states
- `SIAPolicyList.tsx`: Policy display with complex nested data
- Detail panels: All fields rendered, conditional sections
- `CyberArkTabNavigation.tsx`: Tab switching, active state

#### 8. Frontend Access Mapping components (0% — 8+ untested files)

Another newer feature area with no coverage.

**What to test:**
- `AccessMappingCanvas.tsx`: Graph rendering with nodes/edges
- Node components (UserNode, RoleNode, SafeNode, etc.): Rendering with various data shapes
- `AccessMappingFilterBar.tsx`: Filter interactions
- `AccessMappingDetailPanel.tsx`: Detail display for selected paths
- `accessMappingLayout.ts`: Layout algorithm (pure logic, easy to unit test)

#### 9. Backend `services/access_mapping.py` (23% — main methods untested)

Only the static `_target_matches_criteria` method is tested (59 tests). The actual `compute_all_mappings()` and `compute_user_access()` methods that query the database and assemble access paths have zero coverage.

**What to test:**
- `compute_all_mappings()`: With seeded DB data (users, roles, safes, policies, targets)
- `compute_user_access()`: Single-user access computation
- Edge cases: User with no roles, role with no safes, safe with no accounts
- Performance: Mapping computation with larger datasets

#### 10. Backend `routes/auth.py` — OIDC flow (33% coverage)

The OIDC authentication flow involves external provider interaction and is currently untested.

**What to test:**
- OIDC login initiation (redirect URL generation)
- OIDC callback handling (token exchange, user creation/lookup)
- OIDC with invalid state parameter
- OIDC with expired authorization code
- Discovery document fetching (mocked HTTP)

---

### Priority 3: Hardening & Edge Cases

#### 11. Backend `routes/settings.py` — Terraform bucket CRUD (25% coverage)

Only SSRF validation is tested. The actual bucket/path management endpoints are not.

**What to test:**
- Add/update/delete Terraform bucket configurations
- Add/update/delete state file paths within a bucket
- S3 connection test endpoint (mocked S3 client)
- S3 bucket listing/browsing endpoint
- Admin-only authorization enforcement
- Validation of bucket names and paths

#### 12. Frontend `ECSList.tsx` page (0%)

A complete page component with zero tests, while similar pages (EC2List, RDSList) have 90%+ coverage.

**What to test:**
- Cluster and container list rendering
- Cluster grouping/expansion
- Status filtering
- Loading and error states
- Empty state

#### 13. Frontend `Header.tsx` (41% coverage)

The header contains refresh functionality, data freshness indicators, and user menu — all under-tested.

**What to test:**
- Refresh button behavior (loading state, success, error)
- Data freshness indicator display
- User menu (logout, settings link)
- Responsive behavior

#### 14. Frontend `api/client.ts` (42% coverage)

Many API functions are declared but never exercised in tests. The uncovered functions map to the feature gaps above (CyberArk, access mapping, settings APIs).

**What to test:**
- All CyberArk API functions
- Access mapping API functions
- Settings API functions (OIDC, Terraform buckets)
- Error response handling (401 redirect, 500 errors)
- Token refresh interceptor behavior

---

## What's Already Well Tested

Credit where due — these areas have solid coverage and serve as good patterns:

| Area | Tests | Quality |
|------|-------|---------|
| Backend Terraform parser | 41 tests | Comprehensive edge cases, real-world data simulation |
| Backend access mapping criteria | 59 tests | Thorough combinatorial testing |
| Backend SSRF validation | 24 tests | Security-focused, mocked DNS |
| Backend user password change | 10 tests | Full lifecycle (change → re-login) |
| Frontend common components | ~130 tests | Variants, accessibility, edge cases |
| Frontend VPC components | ~80 tests | Lists, detail panels, badges |
| Frontend topology nodes | ~30 tests | All node types covered |
| Frontend auth context | ~20 tests | Token lifecycle, provider behavior |

---

## Recommended Testing Infrastructure Improvements

1. **Add `moto` for AWS mocking** — The backend collectors test only utility functions because there's no AWS mocking setup. Adding `moto` fixtures in `conftest.py` would unblock collector testing.

2. **Add shared test fixtures** — Create reusable fixtures for common test data (authenticated user, seeded resources, sample AWS API responses) to reduce boilerplate in new tests.

3. **Add integration test helpers** — A pattern for full request lifecycle tests (create user → login → make API call → verify response) would make it easier to test protected endpoints.

4. **Consider coverage gates in CI** — The existing CI pipelines run tests but don't enforce coverage thresholds. Adding a minimum coverage gate (e.g., 60% for new files) would prevent coverage regression.

5. **Frontend: Add MSW (Mock Service Worker)** — For more realistic API integration tests that don't require mocking individual axios calls.

---

## Summary of Highest-Impact Improvements

| # | Area | Current | Target | Impact |
|---|------|---------|--------|--------|
| 1 | `routes/resources.py` | 7% | 60%+ | Core data pipeline |
| 2 | `routes/topology.py` | 10% | 70%+ | Key feature |
| 3 | `services/auth.py` | 35% | 70%+ | Security critical |
| 4 | Topology utilities (FE) | 0–8% | 80%+ | Pure logic, easy to test |
| 5 | Settings panels (FE) | 0–3% | 60%+ | Admin security |
| 6 | AWS collectors | 12–34% | 50%+ | Data integrity |
| 7 | CyberArk components (FE) | 0% | 60%+ | New feature |
| 8 | Access mapping components (FE) | 0% | 60%+ | New feature |
| 9 | `services/access_mapping.py` | 23% | 60%+ | Business logic |
| 10 | OIDC auth flow | 33% | 60%+ | Security critical |
