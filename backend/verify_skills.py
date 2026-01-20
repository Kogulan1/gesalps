import sys
import os
import pandas as pd
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("skill_verifier")

def verify_skills():
    logger.info("Verifying Robust Skill Integration...")
    
    # 1. Test Red Teamer
    try:
        from libs.skills.red_teamer import RedTeamer
        logger.info("[PASS] RedTeamer Import")
        
        rt = RedTeamer(run_id="test-run")
        real = pd.DataFrame({'id': [1,2,3], 'age': [10,20,30], 'zip': ['a','b','c']})
        synth = pd.DataFrame({'id': [1,2,3], 'age': [10,20,30], 'zip': ['a','b','c']})
        
        res = rt.execute(real, synth)
        if res['status'] == 'FAIL' and res['overall_success_rate'] == 1.0:
            logger.info(f"[PASS] RedTeamer Execution (Attack Succeeded as expected on identical data): {res}")
        else:
            logger.warning(f"[WARN] RedTeamer unexpected result: {res}")
            
    except ImportError as e:
        logger.error(f"[FAIL] RedTeamer Import Failed: {e}")
    except Exception as e:
        logger.error(f"[FAIL] RedTeamer Execution Failed: {e}")

    # 2. Test Clinical Guardian
    try:
        from libs.skills.clinical_guardian import ClinicalGuardian
        logger.info("[PASS] ClinicalGuardian Import")
        
        cg = ClinicalGuardian(dataset_name="Test Data")
        # Mocking the fetch if no API key, but ensuring class loads
        logger.info("[PASS] ClinicalGuardian Instantiation")
    except ImportError as e:
        logger.error(f"[FAIL] ClinicalGuardian Import Failed: {e}")

    # 3. Test Regulatory Auditor
    try:
        from libs.skills.regulatory_auditor import RegulatoryAuditor
        logger.info("[PASS] RegulatoryAuditor Import")
        
        ra = RegulatoryAuditor(run_id="test-run")
        metrics = {"privacy": {"mia_auc": 0.5, "dup_rate": 0.0, "linkage_attack_success": 0.0}}
        rep = ra.evaluate(metrics)
        if rep['overall_compliance'] == 'CERTIFIED':
             logger.info(f"[PASS] RegulatoryAuditor Logic (Certified): {ra.get_seal(rep)}")
        else:
             logger.warning(f"[WARN] RegulatoryAuditor Logic unexpected: {rep}")
             
    except ImportError as e:
        logger.error(f"[FAIL] RegulatoryAuditor Import Failed: {e}")

if __name__ == "__main__":
    verify_skills()
