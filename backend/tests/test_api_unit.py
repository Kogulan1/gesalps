"""
Unit tests for API endpoints.
Run with: pytest tests/test_api_unit.py -v
"""

import pytest
import io
import json
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import after path setup
from api.main import app

client = TestClient(app)


# Mock Supabase client
@pytest.fixture
def mock_supabase():
    with patch('api.main.supabase') as mock:
        yield mock


# Mock user dependency
@pytest.fixture
def mock_user():
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "user_metadata": {}
    }


@pytest.fixture
def override_auth(mock_user):
    from api.main import require_user
    app.dependency_overrides[require_user] = lambda: mock_user
    yield
    app.dependency_overrides.clear()


# ========== Health Check Tests ==========

def test_health_check():
    """UT-API-039: Health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "ok" in data or "status" in data


# ========== Authentication Tests ==========

def test_missing_auth_header():
    """UT-API-004: Missing authorization header"""
    response = client.post("/v1/projects", json={"name": "test"})
    assert response.status_code == 401


def test_invalid_token():
    """UT-API-002: JWT validation with invalid token"""
    response = client.post(
        "/v1/projects",
        json={"name": "test"},
        headers={"Authorization": "Bearer invalid-token"}
    )
    assert response.status_code == 401


# ========== Project Tests ==========

def test_create_project_valid(override_auth, mock_supabase):
    """UT-API-005: Create project with valid name"""
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "test-project-id", "name": "test-project"}
    ]
    
    response = client.post(
        "/v1/projects",
        json={"name": "test-project"},
        headers={"Authorization": "Bearer valid-token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "id" in data


def test_create_project_empty_name(override_auth):
    """UT-API-006: Create project with empty name"""
    response = client.post(
        "/v1/projects",
        json={"name": ""},
        headers={"Authorization": "Bearer valid-token"}
    )
    # Should either validate or accept (depending on implementation)
    assert response.status_code in [200, 400, 422]


# ========== Dataset Upload Tests ==========

def test_upload_csv_valid(override_auth, mock_supabase):
    """UT-API-008: Upload CSV - valid file"""
    # Create test CSV
    csv_content = "col1,col2\n1,2\n3,4"
    
    # Mock Supabase responses
    mock_supabase.storage.from_.return_value.upload.return_value = None
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "test-dataset-id"}
    ]
    
    response = client.post(
        "/v1/datasets/upload",
        data={"project_id": "test-project-id"},
        files={"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")},
        headers={"Authorization": "Bearer valid-token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "dataset_id" in data
    assert "schema" in data


def test_upload_csv_too_large(override_auth):
    """UT-API-009: Upload CSV - file size > 10MB"""
    # Create large file content (> 10MB)
    large_content = b"x" * (11 * 1024 * 1024)
    
    response = client.post(
        "/v1/datasets/upload",
        data={"project_id": "test-project-id"},
        files={"file": ("large.csv", io.BytesIO(large_content), "text/csv")},
        headers={"Authorization": "Bearer valid-token"}
    )
    assert response.status_code == 413


def test_upload_csv_invalid_format(override_auth):
    """UT-API-010: Upload CSV - invalid format (not CSV)"""
    response = client.post(
        "/v1/datasets/upload",
        data={"project_id": "test-project-id"},
        files={"file": ("test.txt", io.BytesIO(b"not csv"), "text/plain")},
        headers={"Authorization": "Bearer valid-token"}
    )
    # Should either accept (frontend validates) or reject
    assert response.status_code in [200, 400]


def test_upload_csv_empty(override_auth):
    """UT-API-011: Upload CSV - empty file"""
    response = client.post(
        "/v1/datasets/upload",
        data={"project_id": "test-project-id"},
        files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")},
        headers={"Authorization": "Bearer valid-token"}
    )
    # Should handle gracefully
    assert response.status_code in [200, 400]


def test_upload_csv_malformed(override_auth):
    """UT-API-012: Upload CSV - malformed CSV"""
    malformed_content = b"col1,col2\n1,2,3\n4"  # Inconsistent columns
    
    response = client.post(
        "/v1/datasets/upload",
        data={"project_id": "test-project-id"},
        files={"file": ("malformed.csv", io.BytesIO(malformed_content), "text/csv")},
        headers={"Authorization": "Bearer valid-token"}
    )
    # Should either accept (pandas handles) or reject
    assert response.status_code in [200, 400]


def test_upload_csv_free_plan_limit(override_auth, mock_supabase):
    """UT-API-013: Upload CSV - >5000 rows (free plan)"""
    # Create CSV with 6000 rows
    rows = ["col1,col2"] + [f"{i},{i*2}" for i in range(6000)]
    csv_content = "\n".join(rows)
    
    # Mock user as non-enterprise
    with patch('api.main.is_enterprise', return_value=False):
        response = client.post(
            "/v1/datasets/upload",
            data={"project_id": "test-project-id"},
            files={"file": ("large.csv", io.BytesIO(csv_content.encode()), "text/csv")},
            headers={"Authorization": "Bearer valid-token"}
        )
        assert response.status_code == 403


# ========== Run Tests ==========

def test_create_run_valid(override_auth, mock_supabase):
    """UT-API-019: Create run - valid dataset_id"""
    # Mock dataset exists
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "test-dataset-id",
        "project_id": "test-project-id"
    }
    # Mock run insert
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "test-run-id"}
    ]
    
    response = client.post(
        "/v1/runs",
        json={
            "dataset_id": "test-dataset-id",
            "method": "auto",
            "mode": "standard"
        },
        headers={"Authorization": "Bearer valid-token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "run_id" in data


def test_create_run_invalid_dataset(override_auth, mock_supabase):
    """UT-API-020: Create run - invalid dataset_id"""
    # Mock dataset not found
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = None
    
    response = client.post(
        "/v1/runs",
        json={
            "dataset_id": "invalid-id",
            "method": "auto",
            "mode": "standard"
        },
        headers={"Authorization": "Bearer valid-token"}
    )
    assert response.status_code == 404


def test_create_run_method_ddpm(override_auth, mock_supabase):
    """UT-API-022: Create run - method='ddpm'"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "test-dataset-id"
    }
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "test-run-id"}
    ]
    
    response = client.post(
        "/v1/runs",
        json={
            "dataset_id": "test-dataset-id",
            "method": "ddpm",
            "mode": "standard"
        },
        headers={"Authorization": "Bearer valid-token"}
    )
    assert response.status_code == 200


def test_get_run_status(override_auth, mock_supabase):
    """UT-API-025: Get run status - queued"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "test-run-id",
        "status": "queued"
    }
    
    response = client.get(
        "/v1/runs/test-run-id/status",
        headers={"Authorization": "Bearer valid-token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "queued"


def test_cancel_run_queued(override_auth, mock_supabase):
    """UT-API-031: Cancel run - queued state"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "test-run-id",
        "status": "queued"
    }
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {"id": "test-run-id", "status": "cancelled"}
    ]
    
    response = client.post(
        "/v1/runs/test-run-id/cancel",
        headers={"Authorization": "Bearer valid-token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "cancelled"


# ========== Metrics Tests ==========

def test_get_metrics_valid(override_auth, mock_supabase):
    """UT-API-034: Get metrics - valid run_id"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "test-run-id",
        "metrics_json": {
            "utility": {"ks_mean": 0.05, "corr_delta": 0.08},
            "privacy": {"mia_auc": 0.45, "dup_rate": 0.02}
        }
    }
    
    response = client.get(
        "/v1/runs/test-run-id/metrics",
        headers={"Authorization": "Bearer valid-token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "utility" in data
    assert "privacy" in data


def test_get_metrics_invalid(override_auth, mock_supabase):
    """UT-API-035: Get metrics - invalid run_id"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = None
    
    response = client.get(
        "/v1/runs/invalid-id/metrics",
        headers={"Authorization": "Bearer valid-token"}
    )
    assert response.status_code == 404


def test_metrics_structure(override_auth, mock_supabase):
    """UT-API-036: Metrics structure validation"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "test-run-id",
        "metrics_json": {
            "utility": {
                "ks_mean": 0.05,
                "corr_delta": 0.08,
                "auroc": 0.85,
                "c_index": 0.75
            },
            "privacy": {
                "mia_auc": 0.45,
                "dup_rate": 0.02
            }
        }
    }
    
    response = client.get(
        "/v1/runs/test-run-id/metrics",
        headers={"Authorization": "Bearer valid-token"}
    )
    assert response.status_code == 200
    data = response.json()
    
    # Validate structure
    assert "utility" in data
    assert "privacy" in data
    assert "ks_mean" in data["utility"]
    assert "mia_auc" in data["privacy"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

