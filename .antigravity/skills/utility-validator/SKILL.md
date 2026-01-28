# Utility Validator Skill
**Description:** Compares statistical properties of real vs. synthetic data.

**Instructions:**
1.  Run `quality_check.py` on the two datasets.
2.  Check **Jensen-Shannon Distance** (marginal distributions). Must be < 0.15 for all columns.
3.  Check **Correlation Matrix**: The difference in correlation maps must be < 0.2.
4.  **Clinical Logic Check:** If `Sex=Male` and `Pregnancy=True` exists in synthetic but not real, return **FAIL**.

**Output:** A list of "Green", "Yellow", or "Red" flags for each column.
