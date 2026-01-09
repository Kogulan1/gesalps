# Clinical-Grade Compliance Implementation for Gesalp AI

## Overview

This document describes the clinical-grade compliance features implemented for hospital integrations, including HIPAA-like privacy thresholds, differential privacy proofs, secure database connections, and automated model selection.

## Components

### 1. Compliance Module (`backend/libs/compliance.py`)

**Purpose:** Implements regulatory compliance thresholds and evaluation.

**Features:**
- **Compliance Levels:**
  - `HIPAA_LIKE`: Standard healthcare privacy requirements
  - `CLINICAL_STRICT`: Stricter thresholds for sensitive clinical data
  - `RESEARCH`: More lenient thresholds for research use cases
  - `GDPR_LIKE`: European privacy standards

- **Privacy Thresholds:**
  - MIA AUC: ≤ 0.60 (Membership Inference Attack)
  - Duplicate Rate: ≤ 5%
  - k-Anonymity: ≥ 5 (minimum)
  - Identifiability Score: ≤ 0.10
  - DP Epsilon: ≤ 1.0 (Differential Privacy)
  - DP Delta: ≤ 1e-5

- **Utility Thresholds:**
  - KS Mean: ≤ 0.10
  - Correlation Delta: ≤ 0.10
  - Jensen-Shannon Divergence: ≤ 0.15
  - AUROC: ≥ 0.80 (for downstream tasks)
  - C-Index: ≥ 0.70 (for survival analysis)

- **Fairness Thresholds:**
  - Rare Coverage: ≥ 70%
  - Frequency Skew: ≤ 0.30

**Usage:**
```python
from libs.compliance import get_compliance_evaluator

evaluator = get_compliance_evaluator("hipaa_like")
result = evaluator.evaluate(metrics)
# Returns: {"passed": bool, "violations": [...], "score": 0.0-1.0}
```

### 2. Database Connector (`backend/libs/db_connector.py`)

**Purpose:** Secure SQLAlchemy-based connections for on-premise hospital databases.

**Features:**
- Support for PostgreSQL, MySQL, SQL Server, Oracle
- Connection pooling and SSL/TLS encryption
- Secure credential management via environment variables
- Table schema inspection
- Data sampling and filtering
- Query execution with parameterization

**Usage:**
```python
from libs.db_connector import DatabaseConnector, create_connector_from_env

# From environment variables
connector = create_connector_from_env()

# Or explicit configuration
connector = DatabaseConnector(
    db_type="postgresql",
    host="hospital-db.example.com",
    database="clinical_data",
    username="readonly_user",
    password="secure_password",
    ssl_mode="require"
)

# Pull data
df = connector.pull_table(
    "patient_encounters",
    columns=["patient_id", "diagnosis", "date"],
    where_clause="date >= '2024-01-01'",
    limit=10000
)
```

**Environment Variables:**
```bash
DB_TYPE=postgresql
DB_HOST=hospital-db.example.com
DB_PORT=5432
DB_NAME=clinical_data
DB_USER=readonly_user
DB_PASSWORD=secure_password
DB_SSL_MODE=require
# OR use full connection string:
DB_CONNECTION_STRING=postgresql://user:pass@host:port/db?sslmode=require
```

### 3. Enhanced Report Service (`backend/report_service/main.py`)

**Purpose:** Hardened report generation with compliance validation and error handling.

**Improvements:**
- Input validation with Pydantic models
- Comprehensive error handling and logging
- Compliance evaluation integration
- Enhanced HTML reports with violation details
- New endpoints:
  - `POST /validate`: Validate metrics against compliance thresholds
  - `GET /thresholds`: Get current threshold configuration
  - Enhanced `POST /render`: PDF generation with compliance badges

**Usage:**
```bash
# Validate metrics
curl -X POST http://localhost:8010/validate \
  -H "Content-Type: application/json" \
  -d '{"metrics": {"privacy": {...}, "utility": {...}}}'

# Get thresholds
curl http://localhost:8010/thresholds
```

### 4. Clinical Model Selector (`backend/libs/model_selector.py`)

**Purpose:** LLM-powered model selection with clinical data awareness.

**Features:**
- Automatic clinical data detection
- PII detection and DP recommendations
- High-cardinality column handling
- Compliance-aware model selection
- Fallback selection without LLM

**Usage:**
```python
from libs.model_selector import select_model_for_dataset
import pandas as pd

df = pd.read_csv("clinical_data.csv")
plan = select_model_for_dataset(
    df,
    compliance_level="hipaa_like",
    preference={"tradeoff": "privacy_first"},
    goal="Generate synthetic data for research while maintaining privacy"
)
# Returns: {"choice": {"method": "ddpm"}, "hyperparams": {...}, "dp": {...}}
```

### 5. Experiment Framework (`backend/libs/experiments.py`)

**Purpose:** Systematic testing and validation of synthetic data generation.

**Features:**
- Single experiment execution with compliance checks
- Model comparison across multiple configurations
- Threshold sensitivity analysis
- Monte Carlo simulations for compliance validation
- Automated report generation

**Usage:**
```python
from libs.experiments import ExperimentRunner, run_compliance_simulation

# Single experiment
runner = ExperimentRunner(compliance_level="hipaa_like")
results = runner.run_single_experiment(
    real_data=real_df,
    synthetic_data=synth_df,
    metrics=computed_metrics,
    experiment_name="clinical_dataset_v1"
)

# Model comparison
results = runner.run_model_comparison(
    real_data=real_df,
    model_configs=[
        {"method": "ddpm", "hyperparams": {"n_iter": 500}},
        {"method": "ctgan", "hyperparams": {"epochs": 400}},
    ],
    synthesizer_fn=my_synthesizer_function
)

# Monte Carlo simulation
simulation_results = run_compliance_simulation(
    real_data=real_df,
    synthesizer_fn=my_synthesizer_function,
    n_iterations=10,
    compliance_level="hipaa_like"
)
```

## Integration Guide

### Step 1: Install Dependencies

```bash
# Core dependencies
pip install sqlalchemy pandas httpx pydantic

# Database-specific drivers (choose as needed)
pip install psycopg2-binary  # PostgreSQL
pip install pymysql          # MySQL
pip install pyodbc           # SQL Server
pip install cx_Oracle        # Oracle
```

### Step 2: Configure Environment

Create `.env` file or set environment variables:

```bash
# Compliance
COMPLIANCE_LEVEL=hipaa_like  # or clinical_strict, research

# Database (for on-prem connections)
DB_TYPE=postgresql
DB_HOST=your-hospital-db.example.com
DB_NAME=clinical_data
DB_USER=readonly_user
DB_PASSWORD=secure_password
DB_SSL_MODE=require

# LLM for model selection
OLLAMA_BASE=http://ollama:11434
AGENT_MODEL=llama3.1:8b
```

### Step 3: Update Worker Integration

In `backend/synth_worker/worker.py`, integrate compliance evaluation:

```python
from libs.compliance import get_compliance_evaluator

# In execute_pipeline function, after computing metrics:
compliance_evaluator = get_compliance_evaluator()
compliance_result = compliance_evaluator.evaluate(metrics)

# Add to metrics payload
metrics["compliance"] = compliance_result
```

### Step 4: Update API Endpoints

In `backend/api/main.py`, add compliance validation:

```python
from libs.compliance import get_compliance_evaluator

@app.get("/v1/runs/{run_id}/compliance")
def get_compliance_status(run_id: str, user: Dict = Depends(require_user)):
    metrics = get_run_metrics(run_id)
    evaluator = get_compliance_evaluator()
    result = evaluator.evaluate(metrics)
    return result
```

## Compliance Thresholds Summary

### HIPAA-Like (Default)
- **Privacy:** MIA ≤ 0.60, Dup ≤ 5%, k ≥ 5
- **Utility:** KS ≤ 0.10, Corr ≤ 0.10
- **DP:** Recommended but not required

### Clinical Strict
- **Privacy:** MIA ≤ 0.50, Dup ≤ 3%, k ≥ 10, DP required
- **Utility:** KS ≤ 0.08, Corr ≤ 0.08
- **DP:** Required (ε ≤ 0.5)

### Research
- **Privacy:** MIA ≤ 0.65, Dup ≤ 10%, k ≥ 3
- **Utility:** KS ≤ 0.12, Corr ≤ 0.12
- **DP:** Optional

## Suggested Experiments

### 1. Baseline Compliance Validation
```python
from libs.experiments import ExperimentRunner

runner = ExperimentRunner(compliance_level="hipaa_like")
results = runner.run_single_experiment(
    real_data=clinical_df,
    synthetic_data=synthetic_df,
    metrics=metrics,
    experiment_name="baseline_validation"
)
```

### 2. Model Comparison for Clinical Data
```python
configs = [
    {"method": "ddpm", "hyperparams": {"n_iter": 500}},
    {"method": "ddpm", "hyperparams": {"n_iter": 1000}},
    {"method": "ctgan", "hyperparams": {"epochs": 400}},
]
results = runner.run_model_comparison(clinical_df, configs, synthesizer_fn)
```

### 3. Threshold Sensitivity Analysis
```python
thresholds = [
    {"privacy": {"mia_auc_max": 0.50}, "utility": {"ks_mean_max": 0.08}},
    {"privacy": {"mia_auc_max": 0.60}, "utility": {"ks_mean_max": 0.10}},
    {"privacy": {"mia_auc_max": 0.70}, "utility": {"ks_mean_max": 0.12}},
]
results = runner.run_threshold_sensitivity(real_df, synth_df, metrics, thresholds)
```

### 4. Monte Carlo Compliance Simulation
```python
from libs.experiments import run_compliance_simulation

results = run_compliance_simulation(
    real_data=clinical_df,
    synthesizer_fn=lambda df: generate_synthetic(df),
    n_iterations=20,
    compliance_level="clinical_strict"
)
print(f"Pass rate: {results['summary']['pass_rate']:.2%}")
```

## Security Considerations

1. **Database Connections:**
   - Always use SSL/TLS (ssl_mode="require")
   - Use read-only database users
   - Store credentials securely (environment variables, secrets manager)
   - Implement connection timeouts and pooling limits

2. **Compliance Logging:**
   - All compliance evaluations are logged
   - Violations are tracked in experiment results
   - Audit trails maintained for regulatory review

3. **Data Handling:**
   - No PHI stored in logs
   - Synthetic data validated before release
   - Access controls enforced via API authentication

## Next Steps

1. **Integration Testing:**
   - Test database connector with hospital test environment
   - Validate compliance thresholds with real clinical datasets
   - Run Monte Carlo simulations to establish baseline pass rates

2. **Performance Optimization:**
   - Optimize database query performance
   - Cache compliance evaluations for repeated runs
   - Parallelize model comparison experiments

3. **Documentation:**
   - Create API documentation for new endpoints
   - Document hospital integration procedures
   - Create compliance certification reports

## Support

For questions or issues:
- Review compliance module: `backend/libs/compliance.py`
- Check experiment framework: `backend/libs/experiments.py`
- Review database connector: `backend/libs/db_connector.py`

