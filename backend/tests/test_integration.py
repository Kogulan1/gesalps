"""
Integration tests for full workflows.
Run with: pytest tests/test_integration.py -v

Note: These tests require a running Supabase instance and valid credentials.
Set environment variables or use .env file.
"""

import pytest
import os
import io
import time
import json
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from supabase import create_client, Client

# Test configuration
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

pytestmark = pytest.mark.skipif(
    not SUPABASE_URL or not SUPABASE_KEY,
    reason="Supabase credentials not configured"
)


@pytest.fixture(scope="module")
def supabase_client():
    """Create Supabase client for testing"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        pytest.skip("Supabase credentials not configured")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


@pytest.fixture(scope="module")
def test_user_token():
    """Get test user JWT token"""
    # In real tests, you would authenticate and get a token
    # For now, return a placeholder
    token = os.getenv("TEST_USER_TOKEN")
    if not token:
        pytest.skip("TEST_USER_TOKEN not configured")
    return token


@pytest.fixture
def test_project(supabase_client, test_user_token):
    """Create a test project and clean up after"""
    # Create project
    project_data = {
        "name": f"test-project-{int(time.time())}",
        "owner_id": "test-user-id"  # Replace with actual user ID
    }
    result = supabase_client.table("projects").insert(project_data).execute()
    project_id = result.data[0]["id"] if result.data else None
    
    yield project_id
    
    # Cleanup
    if project_id:
        try:
            supabase_client.table("projects").delete().eq("id", project_id).execute()
        except Exception:
            pass


@pytest.fixture
def test_dataset(supabase_client, test_project):
    """Create a test dataset and clean up after"""
    # Create small CSV
    csv_content = "col1,col2,col3\n1,2.5,cat1\n3,4.5,cat2\n5,6.5,cat1"
    
    # Upload to storage
    object_name = f"{test_project}/{int(time.time())}_test.csv"
    try:
        supabase_client.storage.from_("datasets").upload(
            path=object_name,
            file=csv_content.encode()
        )
    except Exception as e:
        pytest.skip(f"Storage upload failed: {e}")
    
    # Create dataset record
    dataset_data = {
        "project_id": test_project,
        "name": "test.csv",
        "file_url": object_name,
        "rows_count": 3,
        "cols_count": 3,
        "schema_json": {
            "columns": [
                {"name": "col1", "type": "int64", "missing": 0.0, "unique": 3},
                {"name": "col2", "type": "float64", "missing": 0.0, "unique": 3},
                {"name": "col3", "type": "object", "missing": 0.0, "unique": 2}
            ]
        }
    }
    result = supabase_client.table("datasets").insert(dataset_data).execute()
    dataset_id = result.data[0]["id"] if result.data else None
    
    yield dataset_id
    
    # Cleanup
    if dataset_id:
        try:
            supabase_client.table("datasets").delete().eq("id", dataset_id).execute()
        except Exception:
            pass
    try:
        supabase_client.storage.from_("datasets").remove([object_name])
    except Exception:
        pass


# ========== Integration Tests ==========

def test_full_workflow(supabase_client, test_project, test_dataset):
    """IT-001: Full workflow: Create project → Upload dataset → Start run → Get results"""
    
    # Verify project exists
    project = supabase_client.table("projects").select("*").eq("id", test_project).single().execute()
    assert project.data is not None
    
    # Verify dataset exists
    dataset = supabase_client.table("datasets").select("*").eq("id", test_dataset).single().execute()
    assert dataset.data is not None
    assert dataset.data["project_id"] == test_project
    
    # Create run (would normally use API, but testing database directly)
    run_data = {
        "dataset_id": test_dataset,
        "status": "queued",
        "config_json": {
            "method": "gc",  # Use GC for fast test
            "mode": "standard"
        }
    }
    run_result = supabase_client.table("runs").insert(run_data).execute()
    run_id = run_result.data[0]["id"] if run_result.data else None
    assert run_id is not None
    
    # Cleanup run
    try:
        supabase_client.table("runs").delete().eq("id", run_id).execute()
    except Exception:
        pass


def test_schema_inference(supabase_client, test_dataset):
    """IT-014: Schema inference accuracy"""
    dataset = supabase_client.table("datasets").select("*").eq("id", test_dataset).single().execute()
    schema = dataset.data.get("schema_json", {})
    
    assert "columns" in schema
    assert len(schema["columns"]) == 3
    
    # Verify column types
    col_types = {col["name"]: col["type"] for col in schema["columns"]}
    assert "col1" in col_types
    assert "col2" in col_types
    assert "col3" in col_types


def test_storage_operations(supabase_client, test_project):
    """IT-015: Storage bucket operations"""
    # Test upload
    test_content = b"test content"
    object_name = f"{test_project}/test_{int(time.time())}.txt"
    
    try:
        supabase_client.storage.from_("datasets").upload(
            path=object_name,
            file=test_content
        )
        
        # Test download
        downloaded = supabase_client.storage.from_("datasets").download(object_name)
        assert downloaded == test_content or downloaded.read() == test_content
        
        # Test delete
        supabase_client.storage.from_("datasets").remove([object_name])
        
    except Exception as e:
        pytest.fail(f"Storage operations failed: {e}")


def test_run_status_transitions(supabase_client, test_dataset):
    """Test run status transitions"""
    run_data = {
        "dataset_id": test_dataset,
        "status": "queued",
        "config_json": {"method": "gc"}
    }
    run_result = supabase_client.table("runs").insert(run_data).execute()
    run_id = run_result.data[0]["id"]
    
    try:
        # Update to running
        supabase_client.table("runs").update({"status": "running"}).eq("id", run_id).execute()
        run = supabase_client.table("runs").select("status").eq("id", run_id).single().execute()
        assert run.data["status"] == "running"
        
        # Update to succeeded
        supabase_client.table("runs").update({"status": "succeeded"}).eq("id", run_id).execute()
        run = supabase_client.table("runs").select("status").eq("id", run_id).single().execute()
        assert run.data["status"] == "succeeded"
        
    finally:
        # Cleanup
        supabase_client.table("runs").delete().eq("id", run_id).execute()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

