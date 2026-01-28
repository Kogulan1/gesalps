import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Schema: MIMIC-IV Admissions
# subject_id, hadm_id, admittime, dischtime, deathtime, admission_type, admission_location, discharge_location, insurance, language, marital_status, ethnicity, edregtime, edouttime, hospital_expire_flag

def generate_mimic_proxy(n_rows=1000):
    print(f"Generating {n_rows} MIMIC-IV Proxy rows...")
    
    data = []
    base_date = datetime(2100, 1, 1)
    
    for i in range(n_rows):
        subject_id = 10000000 + i
        hadm_id = 20000000 + i
        
        # Temporal Logic
        los_days = random.randint(1, 30)
        admittime = base_date + timedelta(days=random.randint(0, 365*3))
        dischtime = admittime + timedelta(days=los_days)
        
        # Death Logic
        expire_flag = 0
        deathtime = None
        if random.random() < 0.1: # 10% mortality
            expire_flag = 1
            deathtime = dischtime # died at discharge
            
        row = {
            "subject_id": subject_id,
            "hadm_id": hadm_id,
            "admittime": admittime.strftime("%Y-%m-%d %H:%M:%S"),
            "dischtime": dischtime.strftime("%Y-%m-%d %H:%M:%S"),
            "deathtime": deathtime.strftime("%Y-%m-%d %H:%M:%S") if deathtime else None,
            "admission_type": random.choice(["EW EMER.", "URGENT", "DIRECT EMER.", "OBSERVATION ADMIT"]),
            "admission_location": random.choice(["EMERGENCY ROOM", "PHYSICIAN REFERRAL", "TRANSFER FROM HOSPITAL"]),
            "discharge_location": random.choice(["HOME", "HOME HEALTH CARE", "SKILLED NURSING FACILITY", "DIED"]),
            "insurance": random.choice(["Other", "Medicare", "Medicaid"]),
            "language": "ENGLISH",
            "marital_status": random.choice(["MARRIED", "SINGLE", "WIDOWED", "DIVORCED"]),
            "ethnicity": random.choice(["WHITE", "BLACK/AFRICAN AMERICAN", "HISPANIC/LATINO", "ASIAN"]),
            "hospital_expire_flag": expire_flag
        }
        data.append(row)
        
    df = pd.DataFrame(data)
    output_path = "backend/local_benchmarks/raw/mimic_iv_proxy_admissions.csv"
    df.to_csv(output_path, index=False)
    print(f"✅ Generated {output_path}")

if __name__ == "__main__":
    generate_mimic_proxy()
