#!/bin/bash
# Verify TabDDPM run after completion

if [ -z "$1" ]; then
    echo "Usage: $0 <run_id>"
    echo "Example: $0 baa9996f-f9fb-485a-9e74-5d9f99aea928"
    exit 1
fi

RUN_ID=$1

echo "🔍 Verifying TabDDPM run: $RUN_ID"
echo ""

# Check metrics
echo "📊 Checking metrics..."
ssh root@194.34.232.76 "docker exec gesalps_worker python3 -c \"
import supabase
import os
sb = supabase.create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
m = sb.table('metrics').select('payload_json').eq('run_id', '$RUN_ID').maybe_single().execute()
if m.data and m.data.get('payload_json'):
    payload = m.data['payload_json']
    meta = payload.get('meta', {})
    privacy = payload.get('privacy', {})
    utility = payload.get('utility', {})
    print('Model:', meta.get('model', 'N/A'))
    print('n_iter:', meta.get('n_iter', 'N/A'))
    print('batch_size:', meta.get('batch_size', 'N/A'))
    print('MIA AUC:', privacy.get('mia_auc', 'N/A'))
    print('KS Mean:', utility.get('ks_mean', 'N/A'))
\" 2>&1 | grep -v 'CONFIG'"

echo ""
echo "📝 Checking training logs..."
ssh root@194.34.232.76 "cd /root/gesalps_new/backend && docker compose logs synth-worker 2>&1 | grep -E '$RUN_ID|TabDDPM|ddpm.*training|n_iter.*200' | tail -20"

echo ""
echo "✅ Verification complete!"

