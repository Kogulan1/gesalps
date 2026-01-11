# 2026-01-11 - CTO All-Green Action Plan - MainAgent

## Status
✅ **PLAN RECEIVED AND ACKNOWLEDGED** - Execution Starting Immediately

## Summary

CTO has provided a comprehensive, research-backed action plan to achieve consistent "all green" metrics (KS Mean ≤0.10, Compliance ≥80%, MIA AUC ≤0.60, Corr Delta ≤0.10, Dup Rate ≤0.05) with all metrics calculated—no N/A.

**Target Timeline**: Jan 13–15, 2026  
**Target**: "All green" on heart.csv and 2–3 other clinical-like datasets  
**Resources**: VPS (primary), AWS credit available if needed ($5000 credit)

## Plan Overview

### **Phase 1: Immediate Blocker Fixes** (Today, Jan 11 – 4–8 Hours)
- Fix Preprocessing Agent Integration (Blocker #1)
- Fix CTGAN Fallback Parameter Error (Blocker #2)
- Fix Missing Metrics (Blocker #3)
- Initial Re-Test After Fixes

### **Phase 2: Preprocessing & Hyperparam Optimization** (Jan 11–12 – 1–2 Days)
- Enhance Preprocessing Agent (OpenRouter LLM)
- Hyperparam & Model Tweaks

### **Phase 3: Advanced Compute & Validation** (Jan 12–13 – 2 Days)
- Onboard ML/DL Specialist Agent (If Needed)
- Migrate Heavy Tuning to AWS (If VPS Insufficient)
- Full QA & User Validation

### **Phase 4: Deployment & Monitoring** (Jan 14 – 1 Day)
- Final Sign-Off
- Deploy to Live
- Post-Launch Monitoring

## Research Sources Cited

- SynthCity GitHub issues (#345)
- arXiv papers on TabDDPM and tabular synthesis
- CODATA 2025 benchmarks
- ICLR/OpenReview discussions
- "MIXED-TYPE TABULAR DATA SYNTHESIS WITH SCORE-BASED DIFFUSION" ICLR 2023
- "FEST: A Unified Framework for Evaluating Synthetic Tabular Data" ICETE 2025
- "A Comprehensive Survey of Synthetic Tabular Data Generation" arXiv 2504.16506, 2025
- NeurIPS 2024 binary transformation
- ICML 2023 TabDDPM paper
- CODATA 2025 CTAB-GAN+ benchmark

## Immediate Actions (Phase 1 - Starting Now)

### → **BackendAgent**: 
**PRIORITY: P0 - CRITICAL - Blocker #1**

**Task**: Fix Preprocessing Agent Integration (ModuleNotFoundError)

**Why Critical**: Preprocessing agent not in Docker container → never called → persistent high KS (no renaming of numeric columns like '233.0', no transforms for skewed features). Research confirms: Numeric column names cause parsing/normalization errors in TabDDPM.

**Steps**:
1. Verify `preprocessing_agent.py` exists in repo: `ls -la backend/synth_worker/preprocessing_agent.py`
2. Update Dockerfile: Add explicit COPY line:
   ```dockerfile
   COPY synth_worker/preprocessing_agent.py /app/synth_worker/preprocessing_agent.py
   ```
   (Or ensure `COPY synth_worker/* /app/synth_worker/` includes it)
3. Add logging in `worker.py`:
   - Before training: `logger.info("Fetching preprocessing plan...")`
   - After preprocessing: `logger.info("Applied preprocessing: {plan}")`
4. Test import locally: `python -c "from synth_worker.preprocessing_agent import get_preprocessing_plan; print('OK')"`

**Success Criteria**: 
- Preprocessing logs appear in next test
- KS Mean drops at least 20–30% (to ~0.5) due to renamed columns and basic transforms

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent BackendAgent`

---

### → **DevOpsAgent**: 
**PRIORITY: P0 - CRITICAL - Blocker #1 Deployment**

**Task**: Deploy Preprocessing Agent Fix to VPS

**Steps**:
1. SSH to VPS: `ssh root@194.34.232.76`
2. Navigate: `cd /opt/gesalps/backend`
3. Pull latest code: `git pull origin main`
4. Rebuild container: `docker compose -f docker-compose.prod.yml build --no-cache synth-worker`
5. Verify file: `docker exec gesalps_worker ls -la /app/synth_worker/preprocessing_agent.py`
6. Verify import: `docker exec gesalps_worker python -c "from synth_worker.preprocessing_agent import get_preprocessing_plan; print('Preprocessing OK')"`
7. Restart container: `docker compose -f docker-compose.prod.yml restart synth-worker`

**Success Criteria**: 
- File exists in container
- Import succeeds without error
- Container restarted successfully

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent DevOpsAgent`

---

### → **SyntheticDataSpecialist**: 
**PRIORITY: P0 - CRITICAL - Blocker #2 & #3**

**Task 1**: Fix CTGAN Fallback Parameter Error (epochs → num_epochs)

**Why**: SynthCity CTGAN uses `num_epochs` (confirmed in docs and GitHub issues); fallback fails, preventing model switch when TabDDPM KS is high.

**Steps**:
1. In `standalone_quality_test.py`: Replace all `epochs=...` with `num_epochs=...` (e.g., default 300–500)
2. In `worker.py` retry loop: Replace all `epochs=...` with `num_epochs=...`
3. Test standalone CTGAN: Run manual test with CTGAN only on heart.csv → confirm no error, KS output
4. Update fallback logic: If TabDDPM KS >0.25 after 3 retries, auto-switch to CTGAN/TVAE

**Success Criteria**: 
- Fallback triggers successfully in test
- CTGAN runs without assertion error

**Task 2**: Fix Missing Metrics (Corr Delta, Dup Rate = N/A)

**Why**: Likely silent exceptions or data shape mismatches post-generation (e.g., NaNs, mismatched columns). From "FEST: A Unified Framework for Evaluating Synthetic Tabular Data" (ICETE 2025), missing metrics often stem from unhandled NaNs or type errors.

**Steps**:
1. In metric functions (`_utility_metrics()`, `_privacy_metrics()`): Wrap in try/except:
   ```python
   try:
       corr_delta = calculate_corr_delta(real, synth)
       logger.info(f"Corr Delta: {corr_delta}")
   except Exception as e:
       logger.error(f"Corr Delta error: {str(e)}")
       corr_delta = float('nan')
   ```
2. Check synthetic data: After generation, assert `real.shape == synth.shape` and `synth.isna().sum() == 0`
3. Debug: Run metrics independently on sample data

**Success Criteria**: 
- All metrics compute (no N/A)
- Values appear in logs

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent SyntheticDataSpecialist`

---

### → **DevOpsAgent**: 
**PRIORITY: P0 - CRITICAL - Initial Re-Test**

**Task**: Deploy All Fixes and Run Initial Re-Test

**Steps**:
1. Deploy all Phase 1 fixes (preprocessing, CTGAN, metrics)
2. Run 3 full pipeline tests with:
   - Preprocessing enabled
   - n_iter=800
   - batch_size=256
3. Log KS before/after preprocessing
4. Report results to CTO

**Success Criteria**: 
- Preprocessing runs
- KS ≤0.4 (interim win)

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent DevOpsAgent`

---

## Phase 2 Tasks (Jan 11–12)

### → **SyntheticDataSpecialist**: 
**PRIORITY: High - Preprocessing Enhancement**

**Task**: Enhance Preprocessing Agent (OpenRouter LLM)

**Research Basis**: 30–50% KS reduction via targeted transforms for skewed data (arXiv 2504.16506, 2025). Binary transformation (NeurIPS 2024) avoids collapse.

**Steps**:
1. Update OpenRouter prompt in `preprocessing_agent.py`:
   - Include: columns, types, stats, skew
   - Detect: Numeric column names? Skewed features (>1 skew)? Multimodal?
   - Suggest: renames, transforms (quantile/log/winsorize), binary_discretize, model_fallback
2. Apply in worker: Use pandas for renames, sklearn for transforms, clip for outliers
3. Add binary discretization: Bin numericals (256 bins) → one-hot → diffuse → reverse

**Success Criteria**: 
- KS drops to ≤0.3 on heart.csv
- Column '233.0' KS ≤0.3

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent SyntheticDataSpecialist`

---

### → **SyntheticDataSpecialist**: 
**PRIORITY: High - Hyperparam Optimization**

**Task**: Hyperparam & Model Tweaks

**Steps**:
1. Increase n_iter to 50,000 (from ICML 2023 TabDDPM paper) in retries
2. Use DDIM sampling for faster inference (reduces time 10x)
3. Test score-based diffusion (ICLR 2023 paper—implement via SynthCity plugin if available)
4. If KS >0.25 after preprocessing: Auto-fallback to CTAB-GAN+ (CODATA 2025 benchmark)

**Success Criteria**: 
- KS ≤0.10 in ≤3 retries
- Compliance ≥80%

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent SyntheticDataSpecialist`

---

## Phase 3 Tasks (Jan 12–13)

### → **MainAgent**: 
**PRIORITY: Medium - Onboard ML/DL Specialist (If Needed)**

**Task**: Onboard ML/DL Specialist Agent (If KS >0.3 after Phase 2)

**Steps**:
1. Create new chat with prompt: "You are ML/DL Specialist. Debug TabDDPM collapse; suggest custom layers/transforms from research."
2. Assign deep TabDDPM debug tasks (custom noise schedules from GitHub issues)

**When**: If KS >0.3 after Phase 2

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent MainAgent`

---

### → **DevOpsAgent**: 
**PRIORITY: Medium - AWS Migration (If Needed)**

**Task**: Migrate Heavy Tuning to AWS (If VPS Insufficient)

**Why**: VPS CPU-only; high n_iter or CTAB-GAN+ training could be slow (>10 min/run). AWS EC2 with GPU speeds 20–50x.

**Steps** (Using ~$500–1000 of $5000 credit):
1. Launch EC2 instance: g5.xlarge ($1.01/hr, 24 GB GPU VRAM)
2. Install Docker, pull repo
3. Migrate worker: Run docker-compose.prod.yml on EC2
4. Test: Run 20+ hyperparam searches (grid on n_iter, epsilon)
5. Export tuned model weights back to VPS
6. Shutdown after completion

**Success Criteria**: 
- Training time <1 min
- KS convergence in tests

**Budget**: $200–500 (8–20 hours runtime)

**When**: If VPS CPU limits tuning (e.g., n_iter=50k takes >1 hour)

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent DevOpsAgent`

---

### → **QA Tester + EndUserTester**: 
**PRIORITY: High - Full QA & User Validation**

**Task**: Full QA & User Validation

**Steps**:
1. Run E2E on 5 datasets
2. Simulate hospital flow
3. Use FEST framework (ICETE 2025) for replicability checks

**Success Criteria**: 
- 100% "all green" runs
- User feedback: Trustworthy and seamless

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent QATester` / `--agent EndUserTester`

---

## Phase 4 Tasks (Jan 14)

### → **CTO + MainAgent**: 
**PRIORITY: High - Final Sign-Off**

**Task**: Review logs; approve if KS ≤0.10, all metrics green

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent MainAgent`

---

### → **DeploymentCoordinator**: 
**PRIORITY: High - Deploy to Live**

**Task**: Zero-downtime rollout; add monitoring (e.g., Sentry for errors)

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent DeploymentCoordinator`

---

## Key Research Insights Applied

1. **Numeric Column Names**: Cause parsing/normalization errors in TabDDPM (SynthCity issue #345)
2. **Preprocessing Impact**: 30–50% KS reduction via targeted transforms (arXiv 2504.16506, 2025)
3. **Binary Discretization**: Avoids collapse by discretizing numericals (NeurIPS 2024)
4. **High n_iter**: ICML 2023 TabDDPM paper suggests 50,000 iterations
5. **DDIM Sampling**: Reduces inference time 10x
6. **CTAB-GAN+**: Better for skewed clinical data (CODATA 2025 benchmark)
7. **Missing Metrics**: Often stem from unhandled NaNs or type errors (FEST framework, ICETE 2025)

## Success Metrics

**Target**: "All green" on heart.csv and 2–3 other clinical-like datasets by Jan 13–15, 2026

**All Green Criteria**:
- ✅ KS Mean ≤0.10
- ✅ Compliance ≥80%
- ✅ MIA AUC ≤0.60
- ✅ Corr Delta ≤0.10
- ✅ Dup Rate ≤0.05
- ✅ All metrics calculated (no N/A)

## Resource Allocation

- **Primary**: VPS (Contabo) - CPU-based, sufficient for most tasks
- **Escalation**: AWS EC2 g5.xlarge (GPU) - Only if VPS insufficient for heavy tuning
- **Budget**: $200–500 from $5000 AWS credit (if needed)
- **OpenRouter**: Free tier sufficient for preprocessing prompts

## Progress Tracking

All progress will be logged in `/agent-logs/` with clear status updates. CTO will be notified of escalations.

---

**Agent**: MainAgent  
**Date**: 2026-01-11  
**Priority**: P0 - Critical - CTO Strategic Plan  
**Status**: Plan Acknowledged - Execution Starting Immediately
