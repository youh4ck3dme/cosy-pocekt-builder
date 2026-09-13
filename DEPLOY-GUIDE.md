# 🚀 Cosy Pocket Builder - Kompletní průvodce nasazením na VPS

Tento průvodce ti krok za krokem ukáže, jak **nasadit Cosy Pocket Builder na svůj VPS** (Ubuntu 22.04/24.04).

---

## 📋 Požadavky

| Požadavek | Popis |
|-----------|-------|
| **VPS** | Ubuntu 22.04 LTS nebo novější (doporučuji Hetzner CPX21/CPX31 s 2GB RAM+) |
| **Doména** | Vlastník domény s nastaveným DNS A záznamem na VPS IP |
| **API Klíč** | Alespň jeden AI API klíč (Mistral, Gemini, nebo OpenAI) |
| **Porty** | Otevřené: **22** (SSH), **80**, **443** |

---

## ⚡ Rychlý start (pro zkušené uživatele)

Pokud se vyznáš v Linuxu, můžeš spustit tento **jeden příkaz** na svém VPS:

```bash
# Stáhni a spusť setup skript
# Automaticky setup skript zatial nie je sucastou repozitara. Pouzi manualny postup nizsie.
```

**Nebo** pokračuj s podrobným průvodcem níže.

---

## 📁 Krok 1: Příprava VPS

### 1.1 Přihlášení k VPS

```bash
# Přihlas se jako root
ssh root@tva-ip-adresa

# Aktualizuj systém
apt update && apt upgrade -y
```

### 1.2 Vytvoření uživatele (doporučeno)

```bash
# Vytvoř uživatele 'app' pro běh aplikace
adduser app
usermod -aG sudo app
usermod -aG docker app  # Po instalaci Dockeru

# Přihlas se jako app
su - app
cd ~
```

---

## 🐳 Krok 2: Instalace Dockeru

```bash
# Instalace závislostí
sudo apt install -y ca-certificates curl gnupg

# Přidání Docker GPG klíče
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Přidání Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalace Dockeru
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Spuštění Dockeru
sudo systemctl enable docker
sudo systemctl start docker

# Přidání uživatele do docker skupiny
sudo usermod -aG docker $USER
newgrp docker  # Aktualizuj skupiny bez nového přihlášení

# Ověření
docker --version
docker compose version
```

---

## 📂 Krok 3: Klonování repozitáře

### 3.1 Nahraj projekt na VPS

**Možnost A: Přímo klonovat z GitHubu** (doporučeno)

```bash
# Nainstaluj git
sudo apt install -y git

# Klonuj repozitář
git clone https://github.com/youh4ck3dme/cosy-pocekt-builder.git
cd cosy-pocekt-builder

# Zkus pull nejnovějších změn
git fetch origin
git checkout cosy-full-release
git pull origin cosy-full-release
```

**Možnost B: Nahraj přes SCP** (pokud máš místní změny)

```bash
# Lokálně (na tvém počítači)
cd /c/dev/Active/pocket-builder-cosy
scp -r . app@tva-ip-adresa:/home/app/cosy-pocekt-builder

# Na VPS
cd /home/app/cosy-pocekt-builder
```

---

## ⚙️ Krok 4: Nastavení environment proměnných

### 4.1 Vytvoř `.env` soubor

```bash
# Zkopíruj production template
cp .env.production .env

# Uprav soubor
nano .env
```

### 4.2 Uprav následující POVINNÉ proměnné

```bash
# AI Provider - vyber alespoň jednoho
MISTRAL_API_KEY=<mistral-api-key>              # Doporučeno: https://console.mistral.ai/
# GEMINI_API_KEY=<gemini-api-key>             # Volitelné: https://aistudio.google.com/
# OPENAI_API_KEY=<openai-api-key>             # Volitelné: https://platform.openai.com/

# Autentizace
BETTER_AUTH_SECRET=<32-byte-hex-secret>       # Generuj lokálne a nevkladaj do chatu

# Doména (pro Caddy SSL)
DOMAIN=tva-domena.com
EMAIL=admin@tva-domena.com
```

### 4.3 (Volitelné) Externí databáze

Pro produkci doporučuji **Neon** (serverless PostgreSQL, zdarma):

1. Zaregistruj se na [https://neon.tech](https://neon.tech)
2. Vytvoř nový projekt a databázi
3. Získaj `DATABASE_URL` z nastavení projektu
4. Přidej do `.env`:

```bash
DATABASE_URL=<postgres-connection-string>
```

Pokud **nepoužíváš externí databázi**, PGLite (SQLite) se použije automaticky.

### 4.4 Nastav správná oprávnění

```bash
chmod 600 .env
```

---

## 🔥 Krok 5: Spuštění aplikace

### 5.1 Build Docker image

```bash
# Přejdi do složky s projektem
cd /home/app/cosy-pocekt-builder

# Build kontajnerů (trvá 5-15 minut)
docker compose build --no-cache
```

### 5.2 Spusť kontajnery

```bash
# Spusť všechny služby (app, redis, caddy)
docker compose up -d
```

### 5.3 Zkontroluj stav

```bash
# Zobraz běžící kontajnery
docker compose ps

# Zobraz logy (pro debug)
docker compose logs -f

# Zkontroluj health status
docker compose ps
```

---

## 🌐 Krok 6: Nastavení DNS a SSL

### 6.1 Nastav DNS záznam

1. Přejdi ke svému **DNS poskytovateli** (např. Cloudflare, Namecheap, atd.)
2. Vytvoř **A záznam** pro svou doménu, který směřuje na **IP tvého VPS**
3. Vytvoř **CNAME záznam** pro `www` (pokud chceš podporu www):
   - Typ: CNAME
   - Hodnota: `tva-domena.com`

### 6.2 Počkej na SSL certifikát

Caddy **automaticky** získá a obnoví SSL certifikát od Let's Encrypt. To může trvat **1-5 minut**.

### 6.3 Ověř funkčnost

```bash
# Zkontroluj, že HTTPS funguje
curl -I https://tva-domena.com

# Zkontroluj health endpoint
curl https://tva-domena.com/api/health

# Očekávaná odpověď: {"ok":true,...}
```

---

## 🔒 Krok 7: Zabezpečení VPS

### 7.1 Nastav firewall (UFW)

```bash
# Povol požadované porty
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Zakáž všechny ostatní příchozí spojení
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Povol UFW
sudo ufw --force enable

# Zkontroluj stav
sudo ufw status
```

### 7.2 Nastav Fail2Ban (ochrana před brute-force útoky)

```bash
# Nainstaluj Fail2Ban
sudo apt install -y fail2ban

# Vytvoř konfiguraci pro SSH
sudo tee /etc/fail2ban/jail.d/cosy.conf > /dev/null << 'EOF'
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

# Restartuj Fail2Ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

### 7.3 Zakáz přihlášení root přes SSH

```bash
# Uprav SSH konfiguraci
sudo nano /etc/ssh/sshd_config
```

Změň tyto řádky:
```
PermitRootLogin no
PasswordAuthentication no
```

Pak restartuj SSH:
```bash
sudo systemctl restart sshd
```

---

## 📊 Krok 8: Monitoring a údržba

### 8.1 Zkontroluj aplikaci

```bash
# Zobraz stav všech kontajnerů
docker compose ps

# Zobraz logy reálného času
docker compose logs -f app

# Zobraz spotřebu prostředků
docker stats
```

### 8.2 Automatické aktualizace (Watchtower)

```bash
# Spusť Watchtower pro automatické aktualizace kontajnerů
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --interval 30 \
  --cleanup
```

### 8.3 Zálohování

```bash
# Zálohuj data (PGLite, Redis, atd.)
cd /home/app/cosy-pocekt-builder
tar -czf backup-$(date +%F).tar.gz ./data

# Nahraj zálohu do cloudu (příklad s rclone)
rclone copy backup-*.tar.gz remote:backups/
```

---

## 🔄 Krok 9: Aktualizace aplikace

### 9.1 Aktualizace kódu

```bash
# Zastav kontajnery
cd /home/app/cosy-pocekt-builder
docker compose down

# Aktualizuj kód z GitHubu
git fetch origin
git checkout cosy-full-release
git pull origin cosy-full-release

# Rebuild a spusť
docker compose build --no-cache
docker compose up -d
```

### 9.2 Automatické aktualizace (cron)

```bash
# Vytvoř cron job pro denní aktualizace
crontab -e
```

Přidej tento řádek (spouští se každý den v 3:00):
```
0 3 * * * cd /home/app/cosy-pocekt-builder && git fetch origin && git checkout cosy-full-release && git pull origin cosy-full-release && docker compose build --no-cache && docker compose up -d
```

---

## 🛠️ Krok 10: Troubleshooting

### 🔴 Časté problémy a řešení

#### Problém: `Port 3000 already in use`

```bash
# Zjisti, který proces používá port 3000
sudo lsof -i :3000

# Zabij proces (nahraď PID číslem z předchozího příkazu)
sudo kill -9 PID

# Nebo změň port v docker-compose.yml
```

#### Problém: Docker build selže

```bash
# Vyčisti Docker cache
docker system prune -a --volumes

# Zkus build znovu
docker compose build --no-cache
```

#### Problém: Caddy neobdržel SSL certifikát

```bash
# Zkontroluj, že doména směřuje na správnou IP
ping tva-domena.com

# Zkontroluj, že port 80 a 443 jsou otevřené
sudo ufw status

# Restartuj Caddy
docker compose restart caddy
```

#### Problém: Aplikace nezobrazuje obsah

```bash
# Zkontroluj health endpoint
curl http://localhost:3000/api/health

# Zkontroluj logy
 docker compose logs app

# Zkontroluj, že container běží
docker compose ps
```

#### Problém: Chyby s API klíči

```bash
# Zkontroluj, že .env soubor má správné proměnné
cat .env | grep API_KEY

# Restartuj kontajnery
docker compose restart app
```

---

## 📝 Krok 11: Užitečné příkazy

| Akce | Příkaz |
|------|--------|
| **Zastavit aplikaci** | `docker compose down` |
| **Spustit aplikaci** | `docker compose up -d` |
| **Restartovat** | `docker compose restart` |
| **Zobrazit logy** | `docker compose logs -f` |
| **Zobrazit stav** | `docker compose ps` |
| **Smazat kontajnery** | `docker compose down -v` |
| **Smazat images** | `docker system prune -a` |
| **Připojit se do app containeru** | `docker exec -it cosy-pocket-builder sh` |

---

## 🎉 Hotovo!

✅ **Tvá aplikace by měla být přístupná na:** `https://tva-domena.com`

### Co dalšího zkusit:

1. **Přihlas se** do aplikace (pokud je autentizace zapnutá)
2. **Vyzkoušej generování** - zadej prompt jako "Create a landing page for my portfolio"
3. **Exportuj projekt** a stáhni si ho
4. **Nastav svou doménu** v aplikaci

---

## 📚 Doporučené další kroky

1. **Nastav automatické zálohování** databáze
2. **Monitoruj výkon** pomocí `htop` nebo `docker stats`
3. **Nastav notifikace** pro pády aplikace
4. **Zvaž použití** CDN pro statické soubory

---

## 🆘 Potřebuješ pomoc?

Pokud narazíš na problém, který není v tomto průvodci:

1. **Zkontroluj logy**: `docker compose logs -f app`
2. **Zkontroluj health endpoint**: `curl https://tva-domena.com/api/health`
3. **Restartuj kontajnery**: `docker compose restart`

Pokud problém přetrvává:
- Zkopíruj chybové hlášky
- Zkontroluj, že všechny POVINNÉ proměnné v `.env` jsou vyplněné
- Ujisti se, že máš dostatek paměti (minimálně 2GB)

---

**Připraveno pro produkci!** 🎊
