#!/usr/bin/env python3
"""
Generate test CSV files for testing.
Usage:
    python scripts/generate_test_csv.py --rows 1000 --output test_1000.csv
    python scripts/generate_test_csv.py --rows 5000 --cols 50 --output test_wide.csv
"""

import argparse
import pandas as pd
import numpy as np
from pathlib import Path


def generate_csv(rows: int, cols: int = 10, output: str = "test.csv", seed: int = 42):
    """Generate a test CSV file with specified dimensions"""
    np.random.seed(seed)
    
    # Generate data
    data = {}
    
    for i in range(cols):
        col_name = f"col_{i+1}"
        
        # Mix of numeric and categorical
        if i % 3 == 0:
            # Numeric (int)
            data[col_name] = np.random.randint(0, 100, rows)
        elif i % 3 == 1:
            # Numeric (float)
            data[col_name] = np.random.randn(rows) * 10 + 50
        else:
            # Categorical
            categories = [f"cat_{j}" for j in range(min(10, rows // 10 + 1))]
            data[col_name] = np.random.choice(categories, rows)
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Add some missing values (5%)
    missing_mask = np.random.rand(rows, cols) < 0.05
    for i, col in enumerate(df.columns):
        df.loc[missing_mask[:, i], col] = np.nan
    
    # Save to CSV
    output_path = Path(output)
    df.to_csv(output_path, index=False)
    
    # Print summary
    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"✅ Generated {output_path}")
    print(f"   Rows: {len(df):,}")
    print(f"   Columns: {len(df.columns)}")
    print(f"   Size: {size_mb:.2f} MB")
    print(f"   Missing values: {df.isna().sum().sum():,} ({df.isna().sum().sum() / (rows * cols) * 100:.1f}%)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate test CSV files")
    parser.add_argument("--rows", type=int, default=1000, help="Number of rows")
    parser.add_argument("--cols", type=int, default=10, help="Number of columns")
    parser.add_argument("--output", type=str, default="test.csv", help="Output file path")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    
    args = parser.parse_args()
    
    generate_csv(args.rows, args.cols, args.output, args.seed)

