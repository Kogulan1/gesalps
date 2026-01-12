# 2026-01-11 - Preprocessing Service Initial Design - PreprocessingAgent

## Status
✅ **Design Complete** - Independent preprocessing microservice designed and implemented

## Summary
Designed and implemented a separate, independent preprocessing microservice for Gesalp AI. This service analyzes datasets, uses OpenRouter LLM to generate intelligent preprocessing plans, and applies transformations to reduce KS Mean from 0.72-0.74 to ≤0.30-0.40, enabling the retry loop to reach "all green" (KS ≤0.10, compliance ≥80%) in fewer attempts.

## Service Architecture

### Core Components
1. **FastAPI Service** (`main.py`): REST API endpoints for preprocessing
2. **Dataset Analyzer** (`analyzer.py`): Analyzes datasets for issues (numeric column names, skewness, outliers)
3. **LLM Client** (`llm_client.py`): Communicates with OpenRouter to generate preprocessing plans
4. **Plan Executor** (`executor.py`): Applies preprocessing transformations safely

### Service Details
- **Port**: 8001 (avoiding 8000 used by main API)
- **Container**: Independent Docker container
- **Dependencies**: pandas, scikit-learn, httpx, fastapi, uvicorn
- **Communication**: HTTP REST API (can be called by synth-worker or other services)

## OpenRouter Prompt Design

### Core Prompt Strategy
The prompt is designed to:
1. **Focus on KS Mean reduction**: Target 30-50% reduction (from ~0.74 to ≤0.30-0.40)
2. **Research-based transformations**: Uses strategies from arXiv 2504.16506, NeurIPS 2024, ICLR 2023
3. **JSON-only output**: Structured, parseable JSON with no markdown or explanations
4. **Universal handler**: Handles all data types (numeric, categorical, datetime, boolean)

### Key Prompt Features
- **Dataset Analysis Input**: Column stats (mean, std, skew, outliers), data types, detected issues
- **Previous KS Context**: If retrying, includes previous KS Mean to guide improvements
- **Research-Based Strategies**:
  - Quantile Transformation (for skew > 2): 30-50% KS reduction
  - Winsorization (1%/99%): Prevents distribution collapse
  - Binary Discretization: For multimodal distributions (256 bins)
  - Log/Sqrt Transform: For right-skewed data (skew > 1)
  - Standardization: For large value ranges

### Prompt Output Format
```json
{
  "column_renames": {"old_name": "new_name"},
  "outlier_handling": {
    "column_name": {
      "method": "clip",
      "lower_percentile": 0.01,
      "upper_percentile": 0.99
    }
  },
  "transformations": {
    "column_name": {
      "method": "quantile" | "log" | "sqrt" | "standardize" | "minmax" | "winsorize_1_99" | "binary_discretize",
      "params": {}
    }
  },
  "missing_value_strategy": {
    "method": "fill_mean" | "fill_median" | "fill_mode" | "drop",
    "columns": ["col1", "col2"]
  },
  "data_type_corrections": {
    "column_name": "int64" | "float64" | "category" | "boolean_to_int" | "datetime_to_numeric"
  },
  "datetime_extractions": {
    "column_name": {
      "method": "timestamp" | "extract_features",
      "features": ["year", "month", "day"]
    }
  },
  "categorical_encoding": {
    "column_name": {
      "method": "one_hot" | "label" | "group_rare",
      "max_categories": 50
    }
  },
  "rationale": "Brief explanation"
}
```

## API Endpoints

### 1. `/health`
- **Method**: GET
- **Purpose**: Health check
- **Response**: Service status, OpenRouter availability

### 2. `/v1/preprocess/csv`
- **Method**: POST
- **Purpose**: Preprocess dataset from CSV file upload
- **Parameters**:
  - `file`: CSV file (multipart/form-data)
  - `previous_ks`: Optional float (previous KS Mean if retrying)
  - `return_format`: "csv" or "json" (default: "csv")
- **Response**: Preprocessed dataset (CSV or JSON) + preprocessing plan

### 3. `/v1/preprocess/json`
- **Method**: POST
- **Purpose**: Preprocess dataset from JSON payload
- **Request Body**:
  ```json
  {
    "data": [{"col1": 1, "col2": 2}, ...],
    "previous_ks": 0.72,
    "return_format": "json"
  }
  ```
- **Response**: PreprocessingResponse with preprocessed data, plan, and metadata

### 4. `/v1/preprocess/analyze`
- **Method**: POST
- **Purpose**: Analyze dataset without applying preprocessing (for debugging)
- **Parameters**: Either `file` (CSV) or `data` (JSON string)
- **Response**: Dataset analysis (statistics, issues, column info)

## Implementation Details

### Dataset Analyzer (`analyzer.py`)
- Detects numeric column names (e.g., '233.0', '2.3')
- Calculates statistics: mean, std, skew, outliers (IQR method)
- Identifies data types: numeric, categorical, datetime, boolean
- Flags issues: high skewness, outliers, high cardinality, missing values

### LLM Client (`llm_client.py`)
- Handles OpenRouter API communication
- Generates structured prompts with dataset analysis
- Parses JSON responses (handles markdown code blocks if present)
- Falls back gracefully if OpenRouter unavailable
- Supports gemma models (no system prompts, no response_format)

### Plan Executor (`executor.py`)
- Applies preprocessing plan step-by-step:
  1. Column renaming
  2. Data type corrections
  3. Datetime extractions
  4. Missing value handling
  5. Outlier handling (winsorization/clipping)
  6. Transformations (quantile, log, sqrt, standardize, minmax, winsorize_1_99, binary_discretize)
  7. Categorical encoding (one-hot, label, group_rare)
- Final validation: Ensures SynthCity compatibility (numeric, categorical, or string only)
- Error handling: Returns original DataFrame + error log if plan fails

## Safety & Validation

### Error Handling
- Graceful degradation: Returns original DataFrame if preprocessing fails
- Detailed logging: Every step logged for debugging
- Validation: Final output validated for SynthCity compatibility

### Data Preservation
- Original column order/types preserved where possible
- Non-destructive: Works on DataFrame copies
- Reversible transformations where applicable

## Docker Configuration

### Dockerfile
- Base: `python:3.11-slim`
- Port: 8001
- Health check: `/health` endpoint
- Production: Gunicorn with Uvicorn workers (2 workers)

### Requirements
- fastapi==0.111.0
- uvicorn[standard]==0.30.1
- pandas==2.2.2
- scikit-learn==1.5.2
- scipy==1.13.1
- httpx==0.25.2
- python-dotenv==1.0.1

## Testing Strategy

### Manual Testing
1. **Health Check**: `curl http://localhost:8001/health`
2. **CSV Upload**: `curl -X POST -F "file=@dataset.csv" http://localhost:8001/v1/preprocess/csv`
3. **JSON Payload**: POST to `/v1/preprocess/json` with dataset as JSON
4. **Analysis Only**: POST to `/v1/preprocess/analyze` to inspect dataset

### Integration Testing
- Test with real datasets (e.g., heart.csv)
- Verify preprocessing plan quality
- Measure KS Mean improvement
- Validate SynthCity compatibility

## Expected Outcomes

### KS Mean Reduction
- **Before preprocessing**: 0.72-0.74
- **After preprocessing**: ≤0.30-0.40 (30-50% reduction)
- **After retry loop**: ≤0.10 (all green)

### Common Issues Fixed
1. **Numeric column names**: Renamed to descriptive names (e.g., '233.0' → 'feature_233')
2. **Skewed distributions**: Quantile/log transforms applied
3. **Outliers**: Winsorization (1%/99%) prevents distribution collapse
4. **Type mismatches**: Datetime/boolean converted to numeric
5. **Missing values**: Filled with mean/median/mode appropriately

## Code Structure

```
backend/preprocessing_service/
├── main.py              # FastAPI service with endpoints
├── analyzer.py          # Dataset analysis logic
├── llm_client.py        # OpenRouter LLM client
├── executor.py          # Preprocessing plan execution
├── requirements.txt     # Python dependencies
└── Dockerfile           # Docker container definition
```

## Next Steps / Handoff

### → **BackendAgent**: Integration with synth-worker
- Add HTTP call to preprocessing service in `worker.py`
- Integrate preprocessing step before TabDDPM/CTGAN training
- Handle preprocessing service failures gracefully (fallback to original data)
- Update retry loop to use preprocessing service

### → **DevOpsAgent**: Docker Compose integration
- Add preprocessing-service to `docker-compose.yml`
- Configure port 8001
- Set environment variables (OPENROUTER_API_KEY, OPENROUTER_MODEL, etc.)
- Add health check and dependencies
- Test service startup and connectivity

### → **SyntheticDataSpecialist**: Preprocessing plan optimization
- Review preprocessing plan quality
- Suggest improvements to OpenRouter prompt
- Test with various datasets
- Measure KS Mean improvement metrics

## Deliverables

✅ **FastAPI Service Structure**: Complete with 4 endpoints
✅ **OpenRouter Prompt**: Research-based, JSON-only output
✅ **Dataset Analyzer**: Detects numeric column names, skewness, outliers
✅ **Plan Executor**: Applies transformations safely
✅ **Docker Configuration**: Independent container on port 8001
✅ **Requirements**: All dependencies specified
✅ **Documentation**: This log file with design details

## Notes

- Service is **independent** and can be tested standalone
- **No changes** to existing synth-worker code required (can be integrated later)
- **OpenRouter required**: Service requires OPENROUTER_API_KEY to function
- **Future-proof**: Easy to swap LLM provider (OpenRouter → Ollama for air-gapped)
- **Caching**: Optional caching for repeated datasets can be added later

---

**PreprocessingAgent ready. Focused only on separate preprocessing service. Design complete.**
