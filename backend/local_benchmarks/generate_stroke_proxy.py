import pandas as pd
import numpy as np
import random

# Schema: Brain Stroke Dataset
# id, gender, age, hypertension, heart_disease, ever_married, work_type, Residence_type, avg_glucose_level, bmi, smoking_status, stroke

def generate_stroke_proxy(n_rows=5000):
    print(f"Generating {n_rows} Brain Stroke Proxy rows...")
    
    data = []
    
    for i in range(n_rows):
        # 5% Stroke Rate
        stroke = 1 if random.random() < 0.05 else 0
        
        # Correlate Age with Stroke
        if stroke == 1:
            age = random.randint(40, 90)
            hypertension = 1 if random.random() < 0.6 else 0
        else:
            age = random.randint(18, 80)
            hypertension = 1 if random.random() < 0.1 else 0
            
        row = {
            "id": 1000 + i,
            "gender": random.choice(["Male", "Female"]),
            "age": age,
            "hypertension": hypertension,
            "heart_disease": 1 if random.random() < 0.05 else 0,
            "ever_married": random.choice(["Yes", "No"]),
            "work_type": random.choice(["Private", "Self-employed", "Govt_job", "children"]),
            "Residence_type": random.choice(["Urban", "Rural"]),
            "avg_glucose_level": round(np.random.normal(100, 20), 2),
            "bmi": round(np.random.normal(28, 5), 1),
            "smoking_status": random.choice(["formerly smoked", "never smoked", "smokes", "Unknown"]),
            "stroke": stroke
        }
        data.append(row)
        
    df = pd.DataFrame(data)
    output_path = "backend/local_benchmarks/raw/healthcare-dataset-stroke-data.csv"
    df.to_csv(output_path, index=False)
    print(f"✅ Generated {output_path}")

if __name__ == "__main__":
    generate_stroke_proxy()
