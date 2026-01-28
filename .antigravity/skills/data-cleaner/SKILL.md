# Data Cleaner Skill ("The Cleaner")
**Description:** The first line of defense. Sanitizes raw clinical data before it ever touches the AI models.

**Instructions:**
1.  **Ingest Raw CSV**: Read the file provided by the user.
2.  **Standardize**:
    *   **Dates**: Convert all date strings (DD/MM/YYYY, MM-DD-YY, etc.) to ISO 8601 (`YYYY-MM-DD`).
    *   **Nulls**: Unify missing values (`NA`, `null`, `?`, empty string) to actual `NaN`.
    *   **Categorical**: Fix case inconsistencies (`Male`, `male`, `M` -> `Male`).
3.  **De-Identify (Hard Rule)**:
    *   Detect columns looking like Names, SSNs, or Phone Numbers.
    *   **Drop them immediately.** The AI does not need to learn personal identifiers.
4.  **Output**: Save valid rows to `clean_input.csv` for The Architect.

**Why:** Bad input = Bad output. We fix it here so the Architect doesn't crash.
