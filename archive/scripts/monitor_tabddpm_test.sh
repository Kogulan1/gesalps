#!/bin/bash
# Monitor TabDDPM test run and verify fixes

echo "🔍 Monitoring for new TabDDPM runs..."
echo "📊 This script will check logs when a TabDDPM run starts"
echo ""
echo "To start a test run:"
echo "  1. Go to gesalpai.ch"
echo "  2. Upload heart.csv (or use existing dataset)"
echo "  3. Select TabDDPM method"
echo "  4. Start the run"
echo ""
echo "Monitoring worker logs for TabDDPM activity..."
echo "Press Ctrl+C to stop"
echo ""

ssh root@194.34.232.76 "cd /root/gesalps_new/backend && docker compose logs -f synth-worker 2>&1" | grep --line-buffered -E "TabDDPM|ddpm|factory.*TabDDPM|n_iter|training.*ddpm|model.*ddpm" | while read line; do
    echo "[$(date '+%H:%M:%S')] $line"
done

