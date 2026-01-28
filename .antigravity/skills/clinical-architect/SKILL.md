# Clinical Architect Skill
**Description:** Analyzes a clinical dataset schema and generates a JSON configuration for the synthetic data engine.

**Instructions:**
1.  Read the CSV header and first 100 rows provided by the user.
2.  Identify data types:
    * **Survival Data:** Look for "Time to Event" or "Censored" columns. -> Suggest `survival_gan`.
    * **Time-Series:** Look for "Visit Date" or "PatientID" duplicates. -> Suggest `timegan`.
    * **Static/Tabular:** Standard demographics/labs. -> Suggest `tvae` or `ctgan`.
3.  Execute `config_engine.py` to validate that the model name and params are valid in the current `synthcity` version.
4.  **Output:** A raw JSON block containing `{"model": "name", "params": {...}}`.

**Rules:**
* If the dataset has < 500 rows, do NOT use Deep Learning; suggest Bayesian Networks instead.
* Always set `n_iter` >= 2000 for "PROVEN" mode.
