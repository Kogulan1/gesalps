# 2026-01-10 - Smart Preprocessing Rollout Plan - MainAgent

## Status
✅ Rollout Plan Created - Coordination Started

## Summary
CTO has approved adding OpenRouter LLM smart preprocessing to fix high KS Mean in synthetic runs. This rollout involves three agents: SyntheticDataSpecialist (lead), BackendAgent (integration), and ClinicalGradeDataScientist (validation). Coordinating implementation with clear handoffs and monitoring plan.

## Key Findings / Decisions

### ✅ **CTO Approval**: OpenRouter LLM Smart Preprocessing

**Problem Statement**:
- High KS Mean values in synthetic data runs
- KS Mean (Kolmogorov-Smirnov Mean) measures distribution similarity
- High values indicate poor distribution matching between real and synthetic data
- Threshold: KS Mean ≤ 0.10 for "all green" metrics

**Solution**: OpenRouter LLM Smart Preprocessing
- Use LLM to analyze dataset characteristics before generation
- Preprocess data intelligently based on LLM recommendations
- Improve distribution matching and reduce KS Mean

### 🎯 **Rollout Strategy**:

**Phase 1: Design & Prompt Engineering** (SyntheticDataSpecialist)
- Design LLM prompt for dataset analysis
- Create preprocessing logic based on LLM recommendations
- Test prompt effectiveness

**Phase 2: Worker Integration** (BackendAgent)
- Integrate preprocessing into worker pipeline
- Add OpenRouter API calls for dataset analysis
- Ensure proper error handling and fallbacks

**Phase 3: Validation & Thresholds** (ClinicalGradeDataScientist)
- Validate preprocessing improves KS Mean
- Verify thresholds are met
- Ensure compliance is maintained

**Phase 4: Testing** (All Agents)
- Full pipeline test on failing dataset
- Verify KS Mean improvement
- Confirm "all green" metrics achieved

### 📋 **Agent Responsibilities**:

**SyntheticDataSpecialist** (Lead):
- Design LLM prompt for dataset analysis
- Create preprocessing logic
- Test and refine approach
- Document preprocessing strategies

**BackendAgent** (Integration):
- Integrate into worker pipeline
- Add OpenRouter API calls
- Handle errors and fallbacks
- Ensure proper data flow

**ClinicalGradeDataScientist** (Validation):
- Validate KS Mean improvements
- Verify compliance thresholds
- Test on multiple datasets
- Document results

### 🔄 **Coordination Plan**:

1. **Send handoffs to all three agents**
2. **Monitor `/agent-logs/` for progress**
3. **Coordinate between agents as needed**
4. **Trigger full pipeline test once implemented**
5. **Verify KS Mean improvements**

## Code Changes Proposed/Applied (if any)
- None yet - rollout plan only

## Next Steps / Handoff

### → **SyntheticDataSpecialist**: 
**PRIORITY: High - Lead Prompt & Logic Design**

**Your Task**: Design OpenRouter LLM smart preprocessing to fix high KS Mean

**What to Do**:
1. **Design LLM Prompt**:
   - Create prompt to analyze dataset characteristics
   - Identify features that cause high KS Mean
   - Recommend preprocessing strategies
   - Consider: data types, distributions, outliers, missing values

2. **Create Preprocessing Logic**:
   - Implement preprocessing based on LLM recommendations
   - Handle different data types (numeric, categorical, datetime)
   - Apply transformations to improve distribution matching
   - Test on sample datasets

3. **Test and Refine**:
   - Test prompt on various datasets
   - Measure KS Mean improvement
   - Refine prompt and logic based on results
   - Document effective strategies

4. **Documentation**:
   - Document prompt design
   - Document preprocessing strategies
   - Create examples and test cases

**Expected Deliverables**:
- LLM prompt for dataset analysis
- Preprocessing logic implementation
- Test results showing KS Mean improvement
- Documentation

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent SyntheticDataSpecialist`

---

### → **BackendAgent**: 
**PRIORITY: High - Worker Integration**

**Your Task**: Integrate OpenRouter LLM smart preprocessing into worker pipeline

**What to Do**:
1. **Integrate OpenRouter API Calls**:
   - Add OpenRouter API call for dataset analysis
   - Use prompt from SyntheticDataSpecialist
   - Handle API responses and errors
   - Implement fallback if OpenRouter unavailable

2. **Add Preprocessing to Worker Pipeline**:
   - Integrate preprocessing logic into `worker.py`
   - Apply preprocessing before model training
   - Ensure data flow is correct
   - Maintain backward compatibility

3. **Error Handling**:
   - Handle OpenRouter API failures
   - Fallback to existing preprocessing
   - Log errors appropriately
   - Ensure worker doesn't crash

4. **Testing**:
   - Test integration with real datasets
   - Verify preprocessing is applied
   - Check error handling
   - Ensure worker pipeline works

**Expected Deliverables**:
- OpenRouter integration in worker
- Preprocessing applied in pipeline
- Error handling implemented
- Tests passing

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent BackendAgent`

---

### → **ClinicalGradeDataScientist**: 
**PRIORITY: High - Validation & Thresholds**

**Your Task**: Validate OpenRouter LLM smart preprocessing improves KS Mean and maintains compliance

**What to Do**:
1. **Validate KS Mean Improvements**:
   - Test preprocessing on datasets with high KS Mean
   - Measure KS Mean before and after
   - Verify improvements meet thresholds (KS Mean ≤ 0.10)
   - Test on multiple datasets

2. **Verify Compliance**:
   - Ensure preprocessing doesn't break compliance
   - Verify privacy thresholds still met (MIA AUC ≤ 0.60)
   - Check utility thresholds (Corr Delta ≤ 0.10)
   - Verify fairness is maintained

3. **Comprehensive Testing**:
   - Test on various dataset types
   - Test on datasets that previously failed
   - Measure all metrics (KS Mean, Corr Delta, MIA AUC, Dup Rate)
   - Document results

4. **Documentation**:
   - Document validation results
   - Create test report
   - Recommend any adjustments
   - Update compliance thresholds if needed

**Expected Deliverables**:
- Validation test results
- KS Mean improvement confirmation
- Compliance verification
- Test report

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent ClinicalGradeDataScientist`

---

### → **MainAgent** (Current Agent):
**Action**: Monitor progress and coordinate

**Monitoring Plan**:
1. ⏳ Monitor `/agent-logs/` for progress from all three agents
2. ⏳ Coordinate between agents as needed
3. ⏳ Resolve any blockers
4. ⏳ Trigger full pipeline test once all agents complete
5. ⏳ Verify KS Mean improvements on failing dataset

**Success Criteria**:
- ✅ LLM prompt designed and tested
- ✅ Preprocessing integrated into worker
- ✅ KS Mean improvements validated
- ✅ Full pipeline test passes
- ✅ "All green" metrics achieved on previously failing dataset

---

## Open Questions
- What specific datasets are failing with high KS Mean?
- What preprocessing strategies are most effective?
- How much improvement is expected?
- Should preprocessing be optional or always enabled?

---

Agent: MainAgent  
Date: 2026-01-10  
Priority: High - CTO Approved Feature  
Status: Rollout Plan Created - Coordination Started
