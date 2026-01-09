# 2026-01-08 - State-of-the-Art Architecture Recommendations - ArchitectureAgent

## Status
✅ Completed

## Summary
Comprehensive analysis of current architecture and identification of 15+ SOTA features and improvements to achieve industry-leading position in privacy-preserving synthetic healthcare data generation. Recommendations span privacy enhancements, model improvements, agent intelligence, scalability, and clinical-specific features, all aligned with our privacy-first, agent-driven, on-prem ready vision.

## Key Findings / Decisions

### Current Architecture Strengths
- ✅ TabDDPM (diffusion) already integrated - SOTA for 2025
- ✅ SynthCity preferred backend with SDV fallback
- ✅ Agent-driven planning with LLM integration
- ✅ Privacy gates with MIA AUC, dup rate thresholds
- ✅ DP support (epsilon/delta tracking)
- ✅ On-prem deployment ready

### SOTA Gaps Identified
1. **Privacy**: Missing advanced DP composition, zero-knowledge proofs, federated learning
2. **Models**: Missing latest 2025-2026 models (TabCSDI, TimeGAN, PrivacyGAN variants)
3. **Agent**: Using basic LLM prompts, missing few-shot learning, RAG for clinical context
4. **Metrics**: Missing advanced privacy metrics (k-anonymity, l-diversity, t-closeness)
5. **Scalability**: No distributed training, no model caching, no incremental learning
6. **Clinical**: Missing survival analysis awareness, longitudinal data handling, trial-aware synthesis

## Code Changes Proposed/Applied (if any)

### Priority 1: Privacy Enhancements (High Impact, Medium Effort)

#### 1.1 Advanced Differential Privacy Composition
**File**: `backend/synth_worker/models/dp_composition.py` (new)
```python
"""
Advanced DP composition tracking for multi-query scenarios.
Implements Rényi DP, zCDP, and advanced composition theorems.
"""
class DPCompositionTracker:
    def __init__(self, initial_epsilon: float, delta: float = 1e-5):
        self.epsilon = initial_epsilon
        self.delta = delta
        self.queries = []
    
    def add_query(self, epsilon_i: float, mechanism: str):
        """Track query and update composed privacy budget."""
        # Implement advanced composition (2025 SOTA)
        # Rényi DP for tighter bounds
        self.queries.append((epsilon_i, mechanism))
        self.epsilon = self._compose_renyi_dp(epsilon_i)
    
    def _compose_renyi_dp(self, epsilon_i: float) -> float:
        """Rényi DP composition (tighter than basic composition)."""
        # Implementation of Rényi DP composition
        pass
```

**Integration**: Update `worker.py` to track DP composition across multiple runs/queries.

#### 1.2 K-Anonymity, L-Diversity, T-Closeness Metrics
**File**: `backend/synth_worker/metrics/privacy_advanced.py` (new)
```python
"""
Advanced privacy metrics beyond MIA and dup rate.
Implements k-anonymity, l-diversity, t-closeness (2025 SOTA).
"""
def k_anonymity_score(real_df: pd.DataFrame, synth_df: pd.DataFrame, 
                      quasi_identifiers: List[str], k: int = 5) -> float:
    """Calculate k-anonymity compliance score."""
    # Implementation
    
def l_diversity_score(real_df: pd.DataFrame, synth_df: pd.DataFrame,
                     sensitive_attr: str, l: int = 2) -> float:
    """Calculate l-diversity score."""
    # Implementation
    
def t_closeness_score(real_df: pd.DataFrame, synth_df: pd.DataFrame,
                     sensitive_attr: str, t: float = 0.1) -> float:
    """Calculate t-closeness score."""
    # Implementation
```

**Integration**: Add to `_privacy_metrics()` in `worker.py`, update privacy gates.

#### 1.3 Zero-Knowledge Proofs for Privacy Verification
**File**: `backend/libs/zkp_privacy.py` (new)
```python
"""
Zero-knowledge proofs for privacy verification without revealing data.
Enables third-party audit without data access (2025 SOTA).
"""
class PrivacyZKP:
    def generate_proof(self, metrics: Dict, threshold: float) -> Proof:
        """Generate ZKP that privacy threshold is met without revealing metrics."""
        # Implementation using zk-SNARKs or zk-STARKs
        pass
```

**Use Case**: Enable external auditors to verify privacy without seeing actual data.

### Priority 2: Model Enhancements (High Impact, High Effort)

#### 2.1 TabCSDI (Time-Series Diffusion Model)
**File**: `backend/synth_worker/models/tabcsdi.py` (new)
```python
"""
TabCSDI: Tabular Conditional Score-based Diffusion Model for Imputation
2025 SOTA for time-series and longitudinal clinical data.
"""
class TabCSDISynthesizer(BaseSynthesizer):
    """Handles irregular time-series, survival data, censoring."""
    def fit(self, real_df: pd.DataFrame, metadata: SingleTableMetadata):
        # Implementation
        pass
```

**Why**: Critical for clinical trials with longitudinal vitals/labs, survival analysis.

#### 2.2 PrivacyGAN Variants (2025-2026)
**File**: `backend/synth_worker/models/privacy_gan.py` (new)
```python
"""
Latest PrivacyGAN variants with improved DP guarantees.
- PATE-GAN v2 (improved teacher ensemble)
- DP-SGD-GAN (gradient clipping + noise)
- Wasserstein-DP-GAN (WGAN with DP)
"""
```

**Why**: Better privacy-utility tradeoff than current DP methods.

#### 2.3 Transformer-Based Models
**File**: `backend/synth_worker/models/transformer_synth.py` (new)
```python
"""
TabTransformer and GPT-style models for tabular data.
2025 SOTA for high-dimensional categorical data.
"""
class TabTransformerSynthesizer(BaseSynthesizer):
    """Attention-based model for complex categorical relationships."""
    pass
```

**Why**: Better handling of high-cardinality categoricals than CTGAN.

### Priority 3: Agent Intelligence Upgrades (Medium Impact, Medium Effort)

#### 3.1 Few-Shot Learning with Clinical Examples
**File**: `backend/libs/agent_fewshot.py` (new)
```python
"""
Few-shot learning for agent with clinical dataset examples.
Improves method selection for healthcare-specific patterns.
"""
CLINICAL_EXAMPLES = [
    {
        "dataset_type": "EHR_longitudinal",
        "best_method": "tabcsdi",
        "rationale": "Time-series with irregular sampling"
    },
    {
        "dataset_type": "clinical_trial",
        "best_method": "ddpm",
        "rationale": "High-dimensional mixed types"
    },
    # ... more examples
]
```

**Integration**: Update `_agent_plan_internal()` to use few-shot examples.

#### 3.2 RAG (Retrieval-Augmented Generation) for Clinical Context
**File**: `backend/libs/agent_rag.py` (new)
```python
"""
RAG system with clinical data synthesis papers and best practices.
Enables agent to reference latest research when planning.
"""
class ClinicalRAG:
    def __init__(self):
        self.vector_db = # Load embeddings of clinical synthesis papers
        self.papers = # Load PDFs/papers on synthetic clinical data
    
    def retrieve_context(self, dataset_summary: Dict) -> str:
        """Retrieve relevant clinical synthesis context."""
        # Semantic search over papers
        pass
```

**Integration**: Enhance agent prompts with retrieved clinical context.

#### 3.3 Multi-Model Agent Ensemble
**File**: `backend/libs/agent_ensemble.py` (new)
```python
"""
Ensemble multiple LLMs for agent planning.
Vote/consensus mechanism for better reliability.
"""
class AgentEnsemble:
    def __init__(self):
        self.models = [
            "anthropic/claude-3.5-sonnet",
            "openai/gpt-4o",
            "xai/grok-4.1-fast"
        ]
    
    def plan(self, dataset_summary: Dict) -> Dict:
        """Get plans from all models, return consensus."""
        plans = [m.plan(dataset_summary) for m in self.models]
        return self._consensus(plans)
```

**Why**: Reduces single-model failures, improves reliability.

### Priority 4: Scalability & Performance (Medium Impact, High Effort)

#### 4.1 Distributed Training Support
**File**: `backend/synth_worker/training/distributed.py` (new)
```python
"""
Distributed training for large datasets using Ray or Horovod.
Enables training on datasets >100K rows efficiently.
"""
class DistributedTrainer:
    def train(self, model, data, num_workers: int = 4):
        """Distribute training across workers."""
        # Implementation using Ray or Horovod
        pass
```

**Why**: Current single-worker training limits scalability.

#### 4.2 Model Caching & Incremental Learning
**File**: `backend/synth_worker/models/cache.py` (new)
```python
"""
Cache trained models for similar datasets.
Enable incremental learning for dataset updates.
"""
class ModelCache:
    def get_cached_model(self, dataset_hash: str) -> Optional[BaseSynthesizer]:
        """Retrieve cached model if dataset is similar."""
        pass
    
    def cache_model(self, dataset_hash: str, model: BaseSynthesizer):
        """Cache trained model for reuse."""
        pass
```

**Why**: Reduces training time for similar datasets, enables incremental updates.

#### 4.3 Streaming Data Generation
**File**: `backend/synth_worker/generation/streaming.py` (new)
```python
"""
Stream synthetic data generation for large outputs.
Avoids memory issues for >1M row generation.
"""
def generate_streaming(synthesizer, num_rows: int, batch_size: int = 10000):
    """Generate data in batches, yield as stream."""
    for batch in range(0, num_rows, batch_size):
        yield synthesizer.sample(min(batch_size, num_rows - batch))
```

**Why**: Enables generation of very large synthetic datasets without OOM.

### Priority 5: Clinical-Specific Features (High Impact for Healthcare, Medium Effort)

#### 5.1 Survival Analysis Awareness
**File**: `backend/synth_worker/clinical/survival.py` (new)
```python
"""
Survival analysis-aware synthesis.
Preserves censoring, time-to-event distributions.
"""
class SurvivalAwareSynthesizer:
    def fit(self, real_df: pd.DataFrame, 
            event_col: str, time_col: str, censor_col: str):
        """Fit model aware of survival structure."""
        pass
```

**Why**: Critical for clinical trials, oncology data.

#### 5.2 Longitudinal Data Handling
**File**: `backend/synth_worker/clinical/longitudinal.py` (new)
```python
"""
Handle irregular time-series, multiple visits per patient.
Preserves temporal correlations and visit patterns.
"""
class LongitudinalSynthesizer:
    def fit(self, patient_data: Dict[str, pd.DataFrame]):
        """Fit on patient-level time-series."""
        pass
```

**Why**: EHR data is inherently longitudinal, current models don't handle this well.

#### 5.3 Clinical Trial Simulation
**File**: `backend/synth_worker/clinical/trial_sim.py` (new)
```python
"""
Generate synthetic clinical trials with proper randomization.
Preserves treatment effects, stratification, blinding.
"""
class TrialSimulator:
    def simulate_trial(self, protocol: Dict, n_patients: int):
        """Generate synthetic trial data following protocol."""
        pass
```

**Why**: Enables synthetic control arms, power analysis.

### Priority 6: Architecture Improvements (Low Impact, Low Effort)

#### 6.1 Real-Time Progress Streaming
**File**: `backend/api/websocket.py` (enhancement)
```python
"""
WebSocket endpoint for real-time run progress.
Streams training metrics, privacy scores as they're computed.
"""
@app.websocket("/v1/runs/{run_id}/stream")
async def stream_run_progress(websocket: WebSocket, run_id: str):
    """Stream real-time updates during run execution."""
    # Implementation
    pass
```

**Why**: Better UX, users see progress without polling.

#### 6.2 Batch API for Multiple Datasets
**File**: `backend/api/main.py` (enhancement)
```python
@app.post("/v1/runs/batch")
def start_batch_runs(bodies: List[StartRun], user: Dict = Depends(require_user)):
    """Start multiple runs in parallel."""
    # Implementation
    pass
```

**Why**: Enables bulk processing for enterprise customers.

#### 6.3 Model Versioning & A/B Testing
**File**: `backend/synth_worker/models/versioning.py` (new)
```python
"""
Version models and enable A/B testing.
Track which model version generated which synthetic data.
"""
class ModelVersion:
    def __init__(self, method: str, hyperparams: Dict, version: str):
        self.method = method
        self.hyperparams = hyperparams
        self.version = version
        self.performance_metrics = {}
```

**Why**: Enables model improvement tracking, rollback capability.

## Next Steps / Handoff

### Immediate (Next Sprint)
- → **CTO**: Review and prioritize recommendations, approve roadmap
- → **Synthetic Data Specialist**: Evaluate TabCSDI integration feasibility
- → **Clinical-Grade Data Scientist**: Design survival analysis and longitudinal features
- → **Frontend Developer**: Design UI for new privacy metrics (k-anonymity, l-diversity)

### Short-Term (Next Quarter)
- → **Synthetic Data Specialist**: Implement TabCSDI for time-series data
- → **Synthetic Data Specialist**: Add PrivacyGAN variants (PATE-GAN v2, DP-SGD-GAN)
- → **DevOps Agent**: Design distributed training infrastructure (Ray/Horovod)
- → **Architecture Agent**: Design model caching system

### Medium-Term (6 Months)
- → **Synthetic Data Specialist**: Implement zero-knowledge proofs for privacy verification
- → **Clinical-Grade Data Scientist**: Build survival analysis-aware synthesis
- → **Architecture Agent**: Implement RAG system for clinical context
- → **DevOps Agent**: Deploy distributed training infrastructure

### Long-Term (12 Months)
- → **CTO**: Evaluate federated learning architecture for multi-tenant scenarios
- → **Architecture Agent**: Design confidential computing integration (TEEs)
- → **DevOps Agent**: Implement streaming data generation for >1M rows

## Open Questions

1. **Privacy Budget Management**: Should we implement per-user or per-organization DP budgets? (Enterprise feature)
2. **Model Licensing**: TabCSDI and latest PrivacyGAN variants - licensing considerations?
3. **Infrastructure Cost**: Distributed training requires significant compute - ROI analysis needed?
4. **Clinical Validation**: Survival analysis and longitudinal features need clinical expert review?
5. **Zero-Knowledge Proofs**: Which ZKP library? (zk-SNARKs vs zk-STARKs tradeoffs)
6. **Federated Learning**: Is multi-tenant federated learning a customer requirement?

## Recommended Implementation Order

1. **Week 1-2**: Advanced privacy metrics (k-anonymity, l-diversity) - High value, low risk
2. **Week 3-4**: Few-shot learning for agent - Quick win, improves reliability
3. **Month 2**: TabCSDI integration - Critical for clinical use cases
4. **Month 3**: Model caching - Reduces costs, improves UX
5. **Month 4-6**: Survival analysis and longitudinal features - Clinical differentiator
6. **Month 6+**: Distributed training, ZKP, federated learning - Enterprise scaling

## Success Metrics

- **Privacy**: Achieve k-anonymity ≥5 for 95% of synthetic datasets
- **Utility**: Maintain KS mean ≤0.10 while improving privacy
- **Performance**: Reduce training time by 50% via caching and distributed training
- **Clinical**: Support survival analysis for 10+ clinical trial datasets
- **Agent**: Improve method selection accuracy to >90% via few-shot + RAG

Agent: ArchitectureAgent  
Date: 2026-01-08
