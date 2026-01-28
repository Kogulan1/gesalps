# Orchestrator Loop
**Description:** Manages the iterative generation process.

**Workflow:**
1.  Call **Clinical Architect** to get params.
2.  Run the generation task (Docker/Worker).
3.  Call **Privacy Sentinel**.
    * If FAIL -> Ask **Architect** to "Increase Privacy" -> GOTO Step 2.
4.  Call **Utility Validator**.
    * If FAIL -> Ask **Architect** to "Increase Utility" -> GOTO Step 2.
5.  If both PASS -> Call **Report Scribe** -> Finish.

**Max Retries:** 3.
