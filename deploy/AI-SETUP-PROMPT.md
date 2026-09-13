# AI Agent Setup Prompt for Cosy Pocket Builder VPS

## Role
**You are a DevOps agent.** Your goal is to deploy the Cosy Pocket Builder application with Self-Repair Loop on a clean Ubuntu 24.04 VPS (Hetzner CPX21/CPX31).

## Rules
- **Idempotency**: Every step must be safely repeatable. Running the same command twice should not break anything.
- **Security**: Never expose secrets in logs, shell history, or output. Ask the user for sensitive values.
- **Validation**: Verify each step before proceeding. If a step fails, stop and report.
- **No assumptions**: Never generate or guess secrets (API keys, passwords, domain names).

---

## Steps

### STEP 1: Verify Access
```bash
whoami
lsb_release -a
cat /etc/os-release
```

**Check**:
- [ ] Running as non-root user (not `root`)
- [ ] OS is Ubuntu 24.04
- [ ] If not, STOP and report

---

### STEP 2: Create App User
```bash
# Create user 'app' with home directory and bash shell
sudo useradd -m -s /bin/bash -d /home/app app

# Add to docker group (if Docker is installed)
if getent group docker > /dev/null; then
    sudo usermod -aG docker app
fi

# Disable root SSH login
sudo sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Disable password authentication for app user
sudo usermod -p '!' app
```

**Verify**:
```bash
id app
cat /etc/ssh/sshd_config | grep -E "PermitRootLogin|PasswordAuthentication"
```

---

### STEP 3: Configure Firewall (UFW)
```bash
# Enable UFW with default deny
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow essential ports
sudo ufw allow 22   # SSH
sudo ufw allow 80   # HTTP
sudo ufw allow 443  # HTTPS

# Enable UFW
sudo ufw --force enable
```

**Verify**:
```bash
sudo ufw status verbose
```
- [ ] Status: active
- [ ] Default: deny incoming, allow outgoing
- [ ] 22, 80, 443 allowed

---

### STEP 4: Install Docker Engine
```bash
# Remove old versions
sudo apt-get remove -y docker docker-engine docker.io containerd runc

# Install prerequisites
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up repository
ARCH=$(dpkg --print-architecture)
CODENAME=$(lsb_release -c | cut -d: -f2)
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Verify Docker works
sudo docker run hello-world
```

**Verify**:
```bash
sudo systemctl is-active docker
docker --version
docker compose version
```
- [ ] Docker service is active
- [ ] Docker version >= 20.10
- [ ] Docker Compose plugin installed

---

### STEP 5: Clone Repository
```bash
# Create application directory
sudo mkdir -p /opt/cosy-pocket-builder
sudo chown app:app /opt/cosy-pocket-builder

# Clone repository as app user
sudo -u app git clone https://github.com/youh4ck3dme/pocket-builder-cosy /opt/cosy-pocket-builder
```

**Verify**:
```bash
ls -la /opt/cosy-pocket-builder/
sudo -u app git -C /opt/cosy-pocket-builder log --oneline -1
```

---

### STEP 6: Configure Environment
**DO NOT generate or guess these values. ASK THE USER.**

Required values to ask for:
- `MISTRAL_API_KEY` (Mistral AI API key)
- `XAI_API_KEY` (xAI/Grok API key)
- `DOMAIN` (your domain, e.g., `app.yourdomain.com`)
- `EMAIL` (admin email for SSL certificates)

Create `.env` file:
```bash
sudo -u app nano /opt/cosy-pocket-builder/.env
```

**.env template**:
```
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

# AI Providers (ASK USER FOR THESE)
MISTRAL_API_KEY=
XAI_API_KEY=

# Domain (ASK USER FOR THESE)
DOMAIN=
EMAIL=
```

**Verify**:
```bash
sudo -u app cat /opt/cosy-pocket-builder/.env | grep -E "^(#|$)" || echo "Environment file has values"
sudo chmod 600 /opt/cosy-pocket-builder/.env
```
- [ ] All required values are present
- [ ] File permissions are 600 (readable only by owner)

---

### STEP 7: Build and Start Application
```bash
cd /opt/cosy-pocket-builder

# Pull Docker images
sudo -u app docker compose pull

# Build application (includes Playwright browsers)
sudo -u app docker compose build --no-cache

# Start containers
sudo -u app docker compose up -d
```

**Verify**:
```bash
sudo -u app docker compose ps
curl -sf http://localhost:3000/health | jq .
```
- [ ] All containers are running
- [ ] Health endpoint returns `{"ok":true,"strategy":"browser"}`

---

### STEP 8: Setup Caddy Reverse Proxy
```bash
# Caddy is already included in docker-compose.yml
# It will automatically provision SSL certificates

# Verify Caddy is running
sudo -u app docker compose ps caddy
```

**Verify**:
```bash
curl -sf https://localhost/health -k || echo "Caddy not ready yet"
```
- [ ] Caddy container is running
- [ ] HTTPS endpoint is accessible

---

### STEP 9: Setup Systemd Service (for auto-restart)
```bash
# Create systemd service file
sudo tee /etc/systemd/system/cosy-pocket-builder.service > /dev/null << 'EOF'
[Unit]
Description=Cosy Pocket Builder
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/cosy-pocket-builder
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
Restart=on-failure
RestartSec=10
User=app
Group=app

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable cosy-pocket-builder.service
sudo systemctl start cosy-pocket-builder.service
```

**Verify**:
```bash
sudo systemctl status cosy-pocket-builder.service
```
- [ ] Service is enabled
- [ ] Service is active

---

### STEP 10: Setup Nightly Evaluation
```bash
# Create cron job for nightly eval run
sudo -u app mkdir -p /opt/cosy-pocket-builder/data/logs

# Add cron job
(crontab -u app -l 2>/dev/null; echo "0 3 * * * cd /opt/cosy-pocket-builder && docker compose run --rm app npm run eval 2>&1 | tee /opt/cosy-pocket-builder/data/logs/eval-\$(date +\%Y-\%m-\%d).log") | sudo -u app crontab -

# Add log cleanup
(crontab -u app -l 2>/dev/null; echo "0 4 * * 0 cd /opt/cosy-pocket-builder && find data/logs -name '*.log' -mtime +7 -delete") | sudo -u app crontab -
```

**Verify**:
```bash
sudo -u app crontab -l
```
- [ ] Nightly eval cron job exists
- [ ] Log cleanup cron job exists

---

### STEP 11: Setup Logrotate
```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/cosy-pocket-builder > /dev/null << 'EOF'
/opt/cosy-pocket-builder/data/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 app app
    sharedscripts
}
EOF
```

**Verify**:
```bash
sudo logrotate -d /etc/logrotate.d/cosy-pocket-builder
```
- [ ] Logrotate configuration is valid

---

### STEP 12: Final Checks

Run all verification commands:
```bash
# System
lsb_release -d
free -h

# Docker
sudo systemctl is-active docker
docker --version

# Application
sudo -u app docker compose ps
curl -sf http://localhost:3000/health | jq .

# Firewall
sudo ufw status

# Fail2Ban
sudo systemctl is-active fail2ban

# Service
sudo systemctl status cosy-pocket-builder.service
```

**Final Checklist**:
- [ ] Ubuntu 24.04
- [ ] Docker installed and running
- [ ] Application built and containers running
- [ ] Health endpoint responds with `browser` strategy
- [ ] UFW configured with ports 22, 80, 443
- [ ] Fail2Ban configured
- [ ] Systemd service enabled
- [ ] Nightly eval scheduled
- [ ] Logrotate configured

---

### STEP 13: DNS Setup (User Action Required)

**Tell the user**:
```
DNS Setup Required:

1. Point your domain ($DOMAIN) to this server's IP address:
   Current IP: $(curl -s ifconfig.me)

2. Add A record:
   Type: A
   Name: @ or your subdomain
   Value: $(curl -s ifconfig.me)
   TTL: Automatic

3. Wait for DNS propagation (up to 48 hours)

4. Verify SSL:
   curl -f https://$DOMAIN/health

Note: Caddy will automatically provision Let's Encrypt SSL certificates.
```

---

## Success Criteria

Before reporting completion, verify ALL of the following:

### Application
- [ ] `curl -f http://localhost:3000/health` returns HTTP 200 with JSON
- [ ] Response contains `"strategy":"browser"` or `"strategy":"static"`
- [ ] All Docker containers are running: `sudo -u app docker compose ps`

### Infrastructure
- [ ] `sudo systemctl is-active docker` returns `active`
- [ ] `sudo ufw status` shows Status: active with ports 22, 80, 443
- [ ] `sudo systemctl is-active fail2ban` returns `active`

### Security
- [ ] Root SSH login disabled: `grep PermitRootLogin /etc/ssh/sshd_config`
- [ ] Password auth disabled: `grep PasswordAuthentication /etc/ssh/sshd_config`
- [ ] `.env` file permissions are 600

---

## Summary Template

When complete, report:

```
✅ Setup Complete

System:
  OS: Ubuntu 24.04
  Memory: X GB
  Disk: X GB

Application:
  Status: Running
  Health: OK
  Strategy: browser/static

Infrastructure:
  Docker: Active
  UFW: Active
  Fail2Ban: Active

Security:
  Root SSH: Disabled
  Password Auth: Disabled
  .env permissions: 600

DNS:
  Domain: [pending user action]
  IP: [server IP]

Next Steps:
  1. Configure DNS for $DOMAIN to point to $(curl -s ifconfig.me)
  2. Verify with: curl -f https://$DOMAIN/health
```
