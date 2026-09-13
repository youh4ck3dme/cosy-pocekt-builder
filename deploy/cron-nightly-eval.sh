#!/bin/bash
# Nightly evaluation cron job for Cosy Pocket Builder
# This script runs the evaluation suite and logs results
# Designed to be run from cron: 0 3 * * * /opt/cosy-pocket-builder/deploy/cron-nightly-eval.sh

set -euo pipefail

# Load central configuration
CONFIG_FILE="/etc/cosy-pocket-builder.env"

if [ -f "$CONFIG_FILE" ]; then
    # Shellcheck disable=SC1090 - We control the file content
    source "$CONFIG_FILE"
else
    # Fallback to defaults
    APP_DIR="/opt/cosy-pocket-builder"
    DATA_DIR="/opt/cosy-pocket-builder/data"
    COMPOSE_FILE="$APP_DIR/docker-compose.yml"
    LOG_DIR="$DATA_DIR/logs"
fi

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Log file with date
LOG_FILE="$LOG_DIR/eval-$(date +%Y%m%d).log"

# Colors for output (may not work in cron, but safe to include)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [OK] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" | tee -a "$LOG_FILE"
}

log_info "Starting nightly evaluation..."

# Change to app directory
cd "$APP_DIR"

# Check if docker compose is available
if ! command -v docker compose &> /dev/null; then
    log_error "docker compose not found. Is Docker installed?"
    exit 1
fi

# Run evaluation inside the app container
log_info "Running evaluation suite..."

# Use docker compose exec to run eval in the app container
# First, ensure containers are running
if ! docker compose ps | grep -q "cosy-pocket-builder"; then
    log_info "Starting containers..."
    docker compose up -d
    
    # Wait for app to be healthy
    ATTEMPTS=0
    MAX_ATTEMPTS=30
    while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
        if curl -sf http://localhost:3000/api/health > /dev/null; then
            break
        fi
        ATTEMPTS=$((ATTEMPTS + 1))
        sleep 2
    done
fi

# Run the evaluation
EVAL_OUTPUT=$(docker compose exec -T app npm run eval 2>&1) || true

# Log the output
log_info "Evaluation output:"
echo "$EVAL_OUTPUT" | tee -a "$LOG_FILE"

# Extract pass rate if available
PASS_RATE=$(echo "$EVAL_OUTPUT" | grep -oP '\d+%' | head -1 || echo "unknown")

if [ "$PASS_RATE" != "unknown" ]; then
    log_success "Evaluation completed with pass rate: $PASS_RATE"
else
    log_info "Evaluation completed (pass rate not detected in output)"
fi

# Keep logs for 30 days
find "$LOG_DIR" -name "eval-*.log" -mtime +30 -delete 2>/dev/null || true

log_info "Nightly evaluation completed"
