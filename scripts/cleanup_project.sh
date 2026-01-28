#!/bin/bash

# GreenGuard Project Cleanup Script
# Purpose: Remove legacy artifacts and experimental logs to lighten the codebase.

echo "🧹 Starting GreenGuard Cleanup..."

# 1. Remove Legacy Benchmark Logs
echo "🗑️ Removing legacy benchmark logs..."
rm -f benchmark_*.txt
rm -f benchmark_results_*.txt
rm -f consolidation_log_v18.txt
rm -f benchmark_results.txt
rm -f benchmark_results_v2.txt
rm -f benchmark_results_v3.txt
rm -f benchmark_results_v4.txt

# 2. Archive Production Models (if they exist in root)
echo "📂 Archiving models..."
mkdir -p archive/models
mv -f clinical_preprocessor_v18.pkl archive/models/ 2>/dev/null
mv -f breast_cancer_tvae_v18_green.pkl archive/models/ 2>/dev/null
mv -f test_data.csv archive/models/ 2>/dev/null

# 3. Archive/Remove Legacy Scripts
echo "📜 Cleaning up redundant scripts..."
mkdir -p archive/scripts
mv -f verify_tabddpm_run.sh archive/scripts/ 2>/dev/null
mv -f deploy_sota_to_contabo.sh archive/scripts/ 2>/dev/null
mv -f monitor_tabddpm_test.sh archive/scripts/ 2>/dev/null

echo "✅ Project Lightened! Root directory cleaned."
