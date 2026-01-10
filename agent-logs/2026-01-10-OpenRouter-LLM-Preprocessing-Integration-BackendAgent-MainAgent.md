# 2026-01-10 - OpenRouter LLM Preprocessing Integration - BackendAgent - MainAgent

## Status
⏳ Assigned to BackendAgent - Waiting for SyntheticDataSpecialist Design

## Summary
BackendAgent assigned to integrate OpenRouter LLM smart preprocessing into worker pipeline. This is Phase 2 of the rollout - integrating the preprocessing logic designed by SyntheticDataSpecialist.

## Key Findings / Decisions

### 🎯 **Task**: Integrate OpenRouter LLM Smart Preprocessing into Worker

**Context**:
- SyntheticDataSpecialist is designing the LLM prompt and preprocessing logic
- BackendAgent will integrate once design is complete
- Integration needed in `backend/synth_worker/worker.py`

### 📋 **What BackendAgent Needs to Do**:

**1. Integrate OpenRouter API Calls**:
- Add OpenRouter API call for dataset analysis
- Use prompt from SyntheticDataSpecialist
- Handle API responses and errors
- Implement fallback if OpenRouter unavailable

**2. Add Preprocessing to Worker Pipeline**:
- Integrate preprocessing logic into `worker.py`
- Apply preprocessing before model training
- Ensure data flow is correct
- Maintain backward compatibility

**3. Error Handling**:
- Handle OpenRouter API failures gracefully
- Fallback to existing preprocessing
- Log errors appropriately
- Ensure worker doesn't crash

**4. Testing**:
- Test integration with real datasets
- Verify preprocessing is applied
- Check error handling
- Ensure worker pipeline works

### 🔧 **Technical Requirements**:

**Integration Points**:
- Worker file: `backend/synth_worker/worker.py`
- OpenRouter config: Already in environment variables
- Data flow: Before model training, after data loading

**OpenRouter Configuration**:
- `OPENROUTER_API_KEY` - Already configured
- `OPENROUTER_BASE` - Already configured
- `OPENROUTER_MODEL` - Already configured
- Fallback to Ollama if unavailable

**Worker Pipeline**:
- Current flow: Load data → Train model → Generate → Calculate metrics
- New flow: Load data → **LLM Analysis → Preprocessing** → Train model → Generate → Calculate metrics

**Error Handling**:
- If OpenRouter fails: Fallback to existing preprocessing
- If LLM response invalid: Use default preprocessing
- Log all errors for debugging
- Don't block worker execution

### 📊 **Expected Outcomes**:

**Success Criteria**:
- ✅ OpenRouter API calls integrated
- ✅ Preprocessing applied in pipeline
- ✅ Error handling implemented
- ✅ Tests passing
- ✅ Ready for ClinicalGradeDataScientist validation

## Next Steps / Handoff

### → **BackendAgent**: 
**PRIORITY: High - Worker Integration**

**Your Task**: Integrate OpenRouter LLM smart preprocessing into worker pipeline

**Action Items**:
1. **Wait for SyntheticDataSpecialist Design**:
   - Monitor for handoff with prompt and logic
   - Review design and understand approach
   - Ask questions if needed

2. **Integrate OpenRouter API Calls**:
   - Add API call for dataset analysis
   - Use prompt from SyntheticDataSpecialist
   - Handle responses and errors
   - Implement fallback

3. **Add Preprocessing to Pipeline**:
   - Integrate into `worker.py`
   - Apply before model training
   - Ensure correct data flow
   - Maintain compatibility

4. **Test Integration**:
   - Test with real datasets
   - Verify preprocessing works
   - Check error handling
   - Ensure pipeline works

**Deliverables**:
- OpenRouter integration in worker
- Preprocessing applied in pipeline
- Error handling implemented
- Tests passing

**Timeline**: Start after SyntheticDataSpecialist completes design

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent BackendAgent`

---

### → **SyntheticDataSpecialist**: 
**INFO: BackendAgent Ready for Integration**

**What This Means**:
- BackendAgent is assigned and ready
- Will integrate once you complete design
- Coordinate handoff when design is ready

**Check your tasks**: `python3 scripts/agent_handoff_parser.py --agent SyntheticDataSpecialist`

---

## Code Changes Proposed/Applied (if any)
- None yet - waiting for design

## Open Questions
- What format will LLM response be in?
- How should preprocessing be applied?
- What error handling is needed?

---

Agent: MainAgent  
Date: 2026-01-10  
Priority: High - CTO Approved Feature  
Status: Assigned to BackendAgent - Waiting for Design
