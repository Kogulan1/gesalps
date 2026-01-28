# Report Scribe Skill
**Description:** Generates natural language summaries for the Compliance PDF using the local LLM (Ollama).

**Instructions:**
1.  Read the JSON output from *Privacy Sentinel* and *Utility Validator*.
2.  Send the metrics to the local Ollama instance (port 11434).
3.  **Prompt:** "Write a reassuring executive summary for a hospital DPO explaining why a privacy risk of {mia_score} is acceptable."
4.  Save the text to `report_summary.txt` for the Report Service to pick up.
