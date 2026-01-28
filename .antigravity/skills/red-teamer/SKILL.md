# Red Team Skill ("The Adversary")
**Description:** The ultimate stress test. Actively attempts to hack the synthetic data to prove it is safe.

**Instructions:**
1.  **Load Data**: Real `clean_input.csv` (Target) and Synthetic `synthetic_out.csv` (Attack Surface).
2.  **Attack 1: Linkage Attack**
    *   Take "Quasi-Identifiers" (Age, Zip, Sex) from Real data.
    *   Try to find exact or near-exact matches in Synthetic data.
    *   If > 3 matches are found, **FAIL**.
3.  **Attack 2: Attribute Inference**
    *   Train a model on Synthetic data to predict a sensitive attribute (e.g., Diagnosis) based on Quasi-Identifiers.
    *   Test accuracy on Real data. If Accuracy > Baseline + 10%, **FAIL**.
4.  **Verdict**:
    *   Pass: "Adversarial Attack Failed. Data is Robust."
    *   Fail: "Attack Successful. Data Leaks Information."

**Why:** Compliance auditors love this. It proves we didn't just calculate a score; we tried to break it and failed.
