#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SQL_FILE="$ROOT_DIR/sql/schema.sql"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI not found. Install from https://supabase.com/docs/reference/cli/install"
  exit 1
fi

echo "Applying schema: $SQL_FILE"
# Requires 'supabase link' to be configured (or SUPABASE_ACCESS_TOKEN + project ref)
supabase db query < "$SQL_FILE"
echo "Done."

