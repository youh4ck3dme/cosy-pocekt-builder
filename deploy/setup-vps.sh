#!/bin/bash
# setup-vps.sh - Idempotent VPS setup script for Cosy Pocket Builder
# Designed for Ubuntu 24.04 LTS on Hetzner CPX21/CPX31
# Run as: bash setup-vps.sh

set -euo pipefail

# Central configuration - all paths should reference these variables
# This ensures consistency between setup, cron, and manual operations
CONFIG_FILE="/etc/cosy-pocket-builder.env"
APP_DIR="/opt/cosy-pocket-builder"
DATA_DIR="/opt/cosy-pocket-builder/data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$(id -u)" -eq 0 ]; then
    log_error "Please run this script as a non-root user with sudo privileges"
    exit 1
fi

# ============================================================================
# STEP 1: System Check
# ============================================================================
log_info "=== System Check ==="

# Check OS
if ! command -v lsb_release &> /dev/null; then
    log_error "lsb_release not found. Please install it first."
    exit 1
fi

DISTRO=$(lsb_release -d | cut -d: -f2 | tr -d ' ' | tr '[:upper:]' '[:lower:]')
if [[ ! "$DISTRO" =~ ubuntu.*24.* ]]; then
    log_error "This script is designed for Ubuntu 24.04. Detected: $DISTRO"
    exit 1
fi
log_success "Ubuntu 24.04 detected"

# Check architecture
ARCH=$(uname -m)
if [ "$ARCH" != "x86_64" ] && [ "$ARCH" != "aarch64" ]; then
    log_warn "Unusual architecture: $ARCH. Playwright may not be fully compatible."
fi

# Check memory
TOTAL_MEM=$(free -b | awk '/Mem:/{print $2}')
MIN_MEM=$((2 * 1024 * 1024 * 1024)) # 2GB
if [ "$TOTAL_MEM" -lt "$MIN_MEM" ]; then
    log_error "Insufficient memory. Minimum 2GB required, found: $((TOTAL_MEM / 1024 / 1024 / 1024))GB"
    exit 1
fi
log_success "Memory: $((TOTAL_MEM / 1024 / 1024 / 1024))GB"

# ============================================================================
# STEP 2: Create app user
# ============================================================================
log_info "=== Creating app user ==="

if ! id "app" &> /dev/null; then
    sudo useradd -m -s /bin/bash -d /home/app app
    log_success "Created user 'app'"
else
    log_success "User 'app' already exists"
fi

# Add to docker group if it exists
if getent group docker > /dev/null; then
    sudo usermod -aG docker app
    log_success "Added 'app' to docker group"
else
    log_info "Docker group not found, skipping"
fi

# ============================================================================
# STEP 3: Install Dependencies
# ============================================================================
log_info "=== Installing dependencies ==="

# Update package lists
sudo apt-get update -y

# Install required packages
REQUIRED_PKGS=(
    curl
    wget
    git
    docker.io
    docker-compose-plugin
    ufw
    fail2ban
    logrotate
    htop
    net-tools
    jq
)

INSTALLED_PKGS=$(dpkg -l | grep -E "^ii\s+(${REQUIRED_PKGS[*]})\s" | awk '{print $2}' | tr '\n' ' ')

for pkg in "${REQUIRED_PKGS[@]}"; do
    if ! dpkg -l | grep -q "^ii  $pkg "; then
        log_info "Installing $pkg..."
        sudo apt-get install -y "$pkg"
        log_success "Installed $pkg"
    else
        log_success "$pkg already installed"
    fi
done

# ============================================================================
# STEP 4: Configure Docker
# ============================================================================
log_info "=== Configuring Docker ==="

# Ensure docker daemon is running
if ! sudo systemctl is-active --quiet docker; then
    sudo systemctl enable docker
    sudo systemctl start docker
    log_success "Docker started and enabled"
else
    log_success "Docker already running"
fi

# Add current user to docker group for testing
if ! groups | grep -q docker; then
    sudo usermod -aG docker $USER
    log_warn "Added $USER to docker group. You may need to log out and back in."
fi

# ============================================================================
# STEP 5: Setup Application Directory
# ============================================================================
log_info "=== Setting up application directory ==="

sudo mkdir -p "$APP_DIR" "$DATA_DIR"
sudo chown -R app:app "$APP_DIR" "$DATA_DIR"
sudo chmod -R 755 "$APP_DIR"
log_success "Created application directory at $APP_DIR"

# ============================================================================
# STEP 6: Clone Repository
# ============================================================================
log_info "=== Cloning repository ==="

if [ ! -d "$APP_DIR/.git" ]; then
    sudo -u app git clone https://github.com/youh4ck3dme/pocket-builder-cosy "$APP_DIR"
    log_success "Repository cloned"
else
    log_success "Repository already exists"
    sudo -u app git -C "$APP_DIR" pull
    log_success "Repository updated"
fi

# ============================================================================
# STEP 7: Configure UFW Firewall
# ============================================================================
log_info "=== Configuring firewall ==="

# Enable UFW
if ! sudo ufw status | grep -q "Status: active"; then
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow 22   # SSH
    sudo ufw allow 80   # HTTP
    sudo ufw allow 443  # HTTPS
    sudo ufw --force enable
    log_success "UFW configured and enabled"
else
    log_info "UFW already active"
    # Ensure our ports are allowed
    sudo ufw allow 22 > /dev/null 2>&1 || true
    sudo ufw allow 80 > /dev/null 2>&1 || true
    sudo ufw allow 443 > /dev/null 2>&1 || true
fi

# ============================================================================
# STEP 8: Configure Fail2Ban
# ============================================================================
log_info "=== Configuring Fail2Ban ==="

FAIL2BAN_CONF="/etc/fail2ban/jail.d/cosy.conf"

if [ ! -f "$FAIL2BAN_CONF" ]; then
    sudo tee "$FAIL2BAN_CONF" > /dev/null << 'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 1h
findtime = 10m

[sshd-ddos]
enabled = true
port = ssh
filter = sshd-ddos
logpath = /var/log/auth.log
maxretry = 5
bantime = 1h
EOF
    
    if sudo systemctl is-active --quiet fail2ban; then
        sudo systemctl restart fail2ban
    else
        sudo systemctl enable fail2ban
        sudo systemctl start fail2ban
    fi
    log_success "Fail2Ban configured"
else
    log_success "Fail2Ban already configured"
fi

# ============================================================================
# STEP 9: Setup Environment Variables
# ============================================================================
log_info "=== Setting up environment ==="

ENV_FILE="$APP_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    sudo -u app tee "$ENV_FILE" > /dev/null << 'EOF'
# Application
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# Self-Repair Loop
SELF_REPAIR_ENABLED=true
MAX_REPAIR_RETRIES=2
VALIDATION_TIMEOUT_MS=5000
VALIDATION_STRATEGY=auto
BROWSER_POOL_SIZE=2
VALIDATION_MAX_HTML_SIZE=500000

# AI Provider (set this in the private .env file)
MISTRAL_API_KEY=

# Domain (REPLACE WITH YOUR DOMAIN)
DOMAIN=yourdomain.com
EMAIL=admin@yourdomain.com
EOF
    log_warn "Created .env template. Please edit $ENV_FILE with actual values!"
    log_warn "Run: sudo -u app nano $ENV_FILE"
else
    log_success ".env file already exists"
fi

# Set permissions
sudo chown app:app "$ENV_FILE"
sudo chmod 600 "$ENV_FILE"

# ============================================================================
# STEP 9.5: Create configuration file for cron and scripts
# ============================================================================
log_info "=== Creating configuration file ==="

# Write configuration that can be sourced by cron jobs and other scripts
sudo tee "$CONFIG_FILE" > /dev/null << EOF
# Cosy Pocket Builder Configuration
# This file is sourced by cron jobs and scripts for path consistency

APP_DIR="$APP_DIR"
DATA_DIR="$DATA_DIR"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
LOG_DIR="$DATA_DIR/logs"
EOF

sudo chown root:root "$CONFIG_FILE"
sudo chmod 644 "$CONFIG_FILE"
log_success "Configuration file created at $CONFIG_FILE"

# ============================================================================
# STEP 11: Setup Docker Compose
# ============================================================================
log_info "=== Setting up Docker Compose ==="

# Create docker-compose.override.yml for production
OVERRIDE_FILE="$APP_DIR/docker-compose.override.yml"

if [ ! -f "$OVERRIDE_FILE" ]; then
    sudo -u app tee "$OVERRIDE_FILE" > /dev/null << 'EOF'
version: '3.8'

services:
  app:
    restart: unless-stopped
    
  caddy:
    restart: unless-stopped
    
  redis:
    restart: unless-stopped
EOF
    log_success "Created docker-compose.override.yml"
else
    log_success "docker-compose.override.yml already exists"
fi

# ============================================================================
# STEP 12: Build and Start
# ============================================================================
log_info "=== Building and starting application ==="

cd "$APP_DIR"

# Pull latest images
sudo -u app docker compose pull

# Build application
log_info "Building Docker image (this may take a while)..."
sudo -u app docker compose build --no-cache

# Start containers
log_info "Starting containers..."
sudo -u app docker compose up -d

# Wait for health check
log_info "Waiting for application to become healthy..."
ATTEMPTS=0
MAX_ATTEMPTS=30
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if curl -sf http://localhost:3000/api/health > /dev/null; then
        log_success "Application is healthy!"
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 2
    if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
        log_error "Application failed to start. Check logs:"
        sudo -u app docker compose logs app
        exit 1
    fi
done

# Verify health endpoint returns expected data
log_info "Verifying health endpoint response..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH_RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
    log_success "Health endpoint validation passed"
else
    log_error "Health endpoint validation failed: $HEALTH_RESPONSE"
    exit 1
fi

# ============================================================================
# STEP 12.5: Assertion - Verify all paths and configurations
# ============================================================================
log_info "=== Running assertion checks ==="

# Check that APP_DIR exists and has correct content
if [ ! -d "$APP_DIR" ]; then
    log_error "Assertion failed: APP_DIR $APP_DIR does not exist"
    exit 1
fi
log_success "APP_DIR exists: $APP_DIR"

# Check that docker-compose.yml exists
if [ ! -f "$APP_DIR/docker-compose.yml" ]; then
    log_error "Assertion failed: docker-compose.yml not found in $APP_DIR"
    exit 1
fi
log_success "docker-compose.yml found"

# Check that config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Assertion failed: Config file $CONFIG_FILE not found"
    exit 1
fi
log_success "Config file exists: $CONFIG_FILE"

# Verify cron will use the correct path
if ! grep -q "$APP_DIR" "$CONFIG_FILE"; then
    log_error "Assertion failed: CONFIG_FILE does not contain APP_DIR=$APP_DIR"
    exit 1
fi
log_success "Config file contains correct APP_DIR path"

# Verify validationHealth endpoint (for Docker healthcheck)
log_info "Verifying validationHealth endpoint..."
VALIDATION_HEALTH=$(curl -s http://localhost:3000/api/validationHealth)
if echo "$VALIDATION_HEALTH" | jq -e '.ok == true' > /dev/null 2>&1; then
    log_success "validationHealth endpoint validation passed"
else
    log_error "validationHealth endpoint validation failed: $VALIDATION_HEALTH"
    exit 1
fi

# Verify both /api/health and /api/validationHealth work
log_info "Verifying both health endpoints are accessible..."
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1 && \
   curl -sf http://localhost:3000/api/validationHealth > /dev/null 2>&1; then
    log_success "Both health endpoints are accessible"
else
    log_error "One or both health endpoints are not accessible"
    exit 1
fi

# ============================================================================
# STEP 13: Setup Logrotate
# ============================================================================
log_info "=== Setting up logrotate ==="

LOGROTATE_CONF="/etc/logrotate.d/cosy-pocket-builder"

if [ ! -f "$LOGROTATE_CONF" ]; then
    sudo tee "$LOGROTATE_CONF" > /dev/null << 'EOF'
/opt/cosy-pocket-builder/data/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 app app
    sharedscripts
    postrotate
        docker exec cosy-pocket-builder kill -USR1 1 2>/dev/null || true
    endscript
}
EOF
    log_success "Logrotate configured"
else
    log_success "Logrotate already configured"
fi

# ============================================================================
# STEP 14: Setup Systemd Service (Optional)
# ============================================================================
log_info "=== Setting up systemd service (optional) ==="

SERVICE_FILE="/etc/systemd/system/cosy-pocket-builder.service"

if [ ! -f "$SERVICE_FILE" ]; then
    sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=Cosy Pocket Builder
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable cosy-pocket-builder.service
    log_success "Systemd service created and enabled"
else
    log_success "Systemd service already exists"
fi

# ============================================================================
# STEP 15: Final Verification
# ============================================================================
log_info "=== Final Verification ==="

echo ""
echo "============================================================================"
echo "                        SETUP COMPLETE                                 "
echo "============================================================================"
echo ""

# Show version info
log_info "System Information:"
echo "  OS: $(lsb_release -d | cut -d: -f2 | tr -d ' ')"
echo "  Kernel: $(uname -r)"
echo "  Memory: $(free -h | awk '/Mem:/{print $4}') / $(free -h | awk '/Mem:/{print $2}')"
echo ""

# Show firewall status
log_info "Firewall Status:"
sudo ufw status | sed 's/^/  /'
echo ""

# Show Docker status
log_info "Docker Status:"
sudo systemctl is-active docker | sed 's/^/  /'
echo ""

# Show application status
log_info "Application Status:"
sudo -u app docker compose ps | sed 's/^/  /'
echo ""

# Show health check
log_info "Health Check:"
curl -s http://localhost:3000/api/health | jq . || echo "  Not available"
echo ""

# Show next steps
log_info "Next Steps:"
echo ""
echo "  1. Configure your domain in .env:"
echo "     - DOMAIN=yourdomain.com"
echo "     - EMAIL=admin@yourdomain.com"
echo "     - MISTRAL_API_KEY=your_api_key"
echo ""
echo "  2. Run the following commands:"
echo "     sudo -u app nano /opt/cosy-pocket-builder/.env"
echo "     sudo -u app docker compose down && sudo -u app docker compose up -d"
echo ""
echo "  3. Set up DNS:"
echo "     - Point your domain to this server's IP"
echo "     - Caddy will automatically provision SSL certificates"
echo ""
echo "  4. Verify:"
echo "     curl -f https://yourdomain.com/api/health"
echo ""
echo "============================================================================"
