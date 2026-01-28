# Privacy Sentinel Skill
**Description:** Audits a generated synthetic dataset for privacy risks using Membership Inference Attacks (MIA).

**Instructions:**
1.  Receive path to `real_data.csv` and `synthetic_data.csv`.
2.  Run `privacy_check.py`.
3.  **Strict Gate:**
    * If `privacy_score` (MIA Risk) > 0.65, return **FAIL**.
    * If `k_anonymity` < 5, return **FAIL**.
4.  If FAIL, suggest specific parameter changes (e.g., "Increase `dp_epsilon` noise" or "Increase `batch_size`").

**Critical:** You are the Compliance Officer. Do not be lenient.
