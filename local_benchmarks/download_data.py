
import os
import ssl
import pandas as pd
import numpy as np
from sklearn.datasets import load_breast_cancer

# Disable SSL verification for legacy UCI/Github raw links if needed
ssl._create_default_https_context = ssl._create_unverified_context

DATA_DIR = "local_benchmarks/data"
os.makedirs(DATA_DIR, exist_ok=True)

def download_adult():
    print("Downloading Adult dataset...")
    url = "https://archive.ics.uci.edu/ml/machine-learning-databases/adult/adult.data"
    cols = ["age", "workclass", "fnlwgt", "education", "education-num", "marital-status", 
            "occupation", "relationship", "race", "sex", "capital-gain", "capital-loss", 
            "hours-per-week", "native-country", "income"]
    try:
        df = pd.read_csv(url, names=cols, na_values=" ?", skipinitialspace=True)
        # Sample to 2000 rows for speed in local test if needed, but let's keep it full for realism (32k)
        # Actually, let's limit to 5000 for the benchmark to be responsive
        df = df.sample(n=5000, random_state=42)
        df.to_csv(f"{DATA_DIR}/adult.csv", index=False)
        print("Adult saved.")
    except Exception as e:
        print(f"Failed to download Adult: {e}")

def download_diabetes():
    print("Downloading Diabetes dataset...")
    url = "https://raw.githubusercontent.com/jbrownlee/Datasets/master/pima-indians-diabetes.data.csv"
    cols = ["Pregnancies","Glucose","BloodPressure","SkinThickness","Insulin","BMI","DiabetesPedigreeFunction","Age","Outcome"]
    try:
        df = pd.read_csv(url, names=cols)
        df.to_csv(f"{DATA_DIR}/diabetes.csv", index=False)
        print("Diabetes saved.")
    except Exception as e:
        print(f"Failed to download Diabetes: {e}")

def download_breast_cancer():
    print("Downloading Breast Cancer dataset...")
    try:
        data = load_breast_cancer()
        df = pd.DataFrame(data.data, columns=data.feature_names)
        df['target'] = data.target
        df.to_csv(f"{DATA_DIR}/breast_cancer.csv", index=False)
        print("Breast Cancer saved.")
    except Exception as e:
        print(f"Failed to download Breast Cancer: {e}")

def download_credit_fraud_proxy():
    print("Creating Credit Fraud Proxy (Imbalanced)...")
    try:
        # Create a synthetic imbalanced dataset resembling credit fraud
        # 10k rows, 30 cols, 0.5% fraud
        n_rows = 10000
        n_cols = 30
        X = np.random.randn(n_rows, n_cols)
        y = np.zeros(n_rows)
        # Inject 50 frauds
        fraud_indices = np.random.choice(n_rows, 50, replace=False)
        y[fraud_indices] = 1
        
        cols = [f"V{i}" for i in range(1, 29)] + ["Time", "Amount"]
        df = pd.DataFrame(X, columns=cols)
        df["Class"] = y
        df.to_csv(f"{DATA_DIR}/credit_fraud_proxy.csv", index=False)
        print("Credit Fraud Proxy saved.")
    except Exception as e:
        print(f"Failed to create Credit Fraud Proxy: {e}")

if __name__ == "__main__":
    download_adult()
    download_diabetes()
    download_breast_cancer()
    download_credit_fraud_proxy()
    # Synthea is too complex/large to auto-download easily, skipping for this quick bench 
    # unless user provides a path.
