# Skill: Semantic Validator (`semantic-validator`)

## Purpose
The **Semantic Validator** provides a "Medical Logic Gate" to the synthetic data generation pipeline. While statistical models (VAE/Diffusion) capture data distributions, they lack innate medical knowledge. This skill uses Large Language Models (LLMs) to verify that generated patient records are clinically plausible.

## Core Capabilities
- **Clinical Consistency Analysis**: Checks for logical contradictions (e.g., Blood Pressure vs. Heart Rate vs. Diagnosis).
- **Demographic Alignment**: Ensures age/gender/ethnicity correlations follow medical reality.
- **Biochemical Plausibility**: Validates that laboratory values (e.g., Hemoglobin/Creatinine) are coherent within the context of the patient's record.

## Technical Architecture
- **Engine**: Local Ollama (Model: Llama 3.1 8B).
- **Input**: CSV/DataFrame row (converted to natural language).
- **Output**: Semantic Coherence Score (0.0 - 1.0) and Reason for Failure.

## Usage
Called during the **GreenGuard loop** after the statistical utility check and before the final compliance certification.
