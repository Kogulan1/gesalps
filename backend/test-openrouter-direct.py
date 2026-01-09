#!/usr/bin/env python3
"""
Direct test of OpenRouter integration in agent mode.
This script simulates an agent re-planning call to verify OpenRouter is working.
"""

import sys
import os
import json
from pathlib import Path

# Add worker directory to path
sys.path.insert(0, str(Path(__file__).parent / "synth_worker"))
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import worker functions
try:
    from synth_worker.worker import _agent_plan_ollama, USE_OPENROUTER, OPENROUTER_API_KEY, OPENROUTER_MODEL
    print("✅ Successfully imported worker functions")
except ImportError as e:
    print(f"❌ Failed to import worker functions: {e}")
    sys.exit(1)

def test_openrouter_integration():
    """Test OpenRouter integration by simulating an agent re-planning call."""
    
    print("\n" + "="*60)
    print("OpenRouter Integration Test")
    print("="*60)
    print()
    
    # Check configuration
    print("Configuration Check:")
    print(f"  USE_OPENROUTER: {USE_OPENROUTER}")
    print(f"  OPENROUTER_API_KEY: {'✅ SET' if OPENROUTER_API_KEY else '❌ NOT SET'}")
    if OPENROUTER_API_KEY:
        print(f"    Key length: {len(OPENROUTER_API_KEY)} characters")
    print(f"  OPENROUTER_MODEL: {OPENROUTER_MODEL}")
    print()
    
    if not USE_OPENROUTER:
        print("❌ OpenRouter is not enabled (OPENROUTER_API_KEY not set)")
        print("   Set OPENROUTER_API_KEY in .env file to enable OpenRouter")
        return False
    
    # Simulate agent re-planning scenario
    print("Simulating Agent Re-planning Call...")
    print("-" * 60)
    
    # Test dataset schema
    dataset_name = "test_dataset"
    schema_json = {
        "columns": [
            {"name": "age", "type": "numerical"},
            {"name": "gender", "type": "categorical"},
            {"name": "income", "type": "numerical"}
        ],
        "num_rows": 1000,
        "num_columns": 3
    }
    
    # Simulate failed metrics (triggering re-planning)
    last_metrics = {
        "privacy": {
            "mia_auc": 0.45,  # Good (below 0.60 threshold)
            "dup_rate": 0.01  # Good (below 0.10 threshold)
        },
        "utility": {
            "ks_mean": 0.15,  # Failed (above 0.10 threshold)
            "corr_delta": 0.05  # Good (below 0.10 threshold)
        }
    }
    
    user_prompt = "Improve utility metrics while maintaining privacy"
    
    print(f"Dataset: {dataset_name}")
    print(f"Schema: {len(schema_json['columns'])} columns, {schema_json['num_rows']} rows")
    print(f"Last Metrics: KS Mean = {last_metrics['utility']['ks_mean']:.3f} (FAILED)")
    print(f"User Prompt: {user_prompt}")
    print()
    
    # Call agent re-planning function
    print("Calling _agent_plan_ollama()...")
    try:
        plan = _agent_plan_ollama(
            dataset_name=dataset_name,
            schema_json=schema_json,
            last_metrics=last_metrics,
            user_prompt=user_prompt,
            provider=None,  # Let it use OpenRouter
            model=None  # Use default model
        )
        
        print()
        if plan:
            print("✅ Agent re-planning successful!")
            print()
            print("Agent Plan:")
            print(json.dumps(plan, indent=2))
            print()
            
            # Verify plan structure
            required_keys = ["method", "hparams"]
            missing_keys = [key for key in required_keys if key not in plan]
            
            if missing_keys:
                print(f"⚠️  Warning: Plan missing keys: {missing_keys}")
            else:
                print("✅ Plan structure valid")
            
            # Check if method is valid
            valid_methods = ["gc", "ctgan", "tvae", "ddpm"]
            method = plan.get("method", "").lower()
            if method in valid_methods:
                print(f"✅ Method '{method}' is valid")
            else:
                print(f"⚠️  Warning: Method '{method}' may not be valid")
            
            return True
        else:
            print("❌ Agent re-planning returned empty plan")
            return False
            
    except Exception as e:
        print(f"❌ Error during agent re-planning: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_openrouter_integration()
    print()
    print("="*60)
    if success:
        print("✅ OpenRouter Integration Test: PASSED")
    else:
        print("❌ OpenRouter Integration Test: FAILED")
    print("="*60)
    sys.exit(0 if success else 1)
