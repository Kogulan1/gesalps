# 2026-01-10 - OpenRouter LLM Preprocessing Design - SyntheticDataSpecialist - MainAgent

## Status
⏳ Assigned to SyntheticDataSpecialist

## Summary
SyntheticDataSpecialist assigned to lead design of OpenRouter LLM smart preprocessing to fix high KS Mean in synthetic runs. This is the first phase of the rollout - designing the LLM prompt and preprocessing logic.

## Key Findings / Decisions

### 🎯 **Task**: Design OpenRouter LLM Smart Preprocessing

**Problem**: High KS Mean values in synthetic data runs
- KS Mean (Kolmogorov-Smirnov Mean) measures distribution similarity
- High values indicate poor distribution matching
- Threshold: KS Mean ≤ 0.10 for "all green" metrics

**Solution**: Use LLM to analyze dataset and recommend preprocessing

### 📋 **What SyntheticDataSpecialist Needs to Do**:

**1. Design LLM Prompt for Dataset Analysis**:
- Analyze dataset characteristics
- Identify features causing high KS Mean
- Recommend preprocessing strategies
- Consider: data types, distributions, outliers, missing values

**2. Create Preprocessing Logic**:
- Implement preprocessing based on LLM recommendations
- Handle different data types (numeric, categorical, datetime)
- Apply transformations to improve distribution matching
- Test on sample datasets

**3. Test and Refine**:
- Test prompt on various datasets
- Measure KS Mean improvement
- Refine prompt and logic based on results
- Document effective strategies

**4. Documentation**:
- Document prompt design
- Document preprocessing strategies
- Create examples and test cases

### 🔧 **Technical Requirements**:

**LLM Integration**:
- Use OpenRouter API (already configured)
- Model: `mistralai/mistral-small-24b-instruct:free` (or configured model)
- Fallback to Ollama if OpenRouter unavailable

**Preprocessing Considerations**:
- Numeric features: scaling, normalization, outlier handling
- Categorical features: encoding, rare category handling
- Datetime features: feature extraction, normalization
- Missing values: imputation strategies
- Distribution matching: transformations to improve KS Mean

**Integration Points**:
- Worker pipeline: `backend/synth_worker/worker.py`
- OpenRouter config: Already in environment
- Data flow: Before model training

### 📊 **Expected Outcomes**:

**Success Criteria**:
- ✅ LLM prompt designed and tested
- ✅ Preprocessing logic implemented
- ✅ KS Mean improvement demonstrated
- ✅ Documentation complete
- ✅ Ready for BackendAgent integration

**Metrics to Track**:
- KS Mean before preprocessing
- KS Mean after preprocessing
- Improvement percentage
- Other metrics (Corr Delta, MIA AUC, Dup Rate)

## Next Steps / Handoff

### → **SyntheticDataSpecialist**: 
**PRIORITY: High - Lead Prompt & Logic Design**

**Your Task**: Design OpenRouter LLM smart preprocessing to fix high KS Mean

**Action Items**:
1. **Design LLM Prompt**:
   - Create prompt to analyze dataset
   - Identify high KS Mean causes
   - Recommend preprocessing strategies
   - Test prompt effectiveness

2. **Implement Preprocessing Logic**:
   - Create preprocessing functions
   - Handle different data types
   - Apply LLM recommendations
   - Test on sample datasets

3. **Test and Refine**:
   - Test on datasets with high KS Mean
   - Measure improvements
   - Refine approach
   - Document results

4. **Create Documentation**:
   - Document prompt design
   - Document preprocessing strategies
   - Create examples
   - Share with BackendAgent

**Deliverables**:
- LLM prompt for dataset analysis
- Preprocessing logic implementation
- Test results showing KS Mean improvement
- Documentation file

**Timeline**: Start immediately, coordinate with BackendAgent for integration

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent SyntheticDataSpecialist`

---

### → **BackendAgent**: 
**INFO: Waiting for SyntheticDataSpecialist Design**

**What This Means**:
- SyntheticDataSpecialist is designing the prompt and logic
- You'll integrate once design is complete
- Monitor for handoff from SyntheticDataSpecialist

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent BackendAgent`

---

## Code Changes Proposed/Applied (if any)
- None yet - design phase

## Open Questions
- What specific datasets are failing with high KS Mean?
- What preprocessing strategies are most effective?
- How should LLM recommendations be structured?

---

Agent: MainAgent  
Date: 2026-01-10  
Priority: High - CTO Approved Feature  
Status: Assigned to SyntheticDataSpecialist
