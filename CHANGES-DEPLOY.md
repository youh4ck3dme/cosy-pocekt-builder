# 📝 Změny pro VPS Deploy

Tento soubor popisuje změny provedené v projektu pro **úspěšné nasazení na VPS**.

---

## ✅ Co bylo opraveno/upraveno

### 1. **docker-compose.yml**
- ❌ **Odstraněn** `profiles: ["caddy"]` - Caddy se nyní spouští **automaticky** spolu s ostatními službami
- ✅ Caddy bude nyní běžet defaultně a automaticky získá SSL certifikáty od Let's Encrypt

### 2. **Dockerfile**
- ❌ **Změněn** start příkaz z `npm run dev` na `npm run start:prod`
- ✅ **Přidán** production build: `RUN npm run build:prod`
- ✅ Aplikace se nyní builduje pro produkci a následně serve built verzí
- ✅ **Upraven** healthcheck start_period z 10s na 30s a retries z 3 na 5 pro spolehlivější start

### 3. **package.json**
- ✅ **Přidán** nový skript `build:prod`:
  ```json
  "build:prod": "node scripts/with-app-env.mjs vite build --mode production"
  ```
- ✅ Tento skript **přeskočí** vývojové kontroly (analyze, bundle, budget) pro rychlejší production build

---

## 📄 Nové soubory

### 1. **`.env.production`**
- ✅ Kompletní template pro **produkční environment**
- ✅ Obsahuje všechny povinné i volitelná nastavení
- ✅ S komentáři a návody pro každou proměnnou
- ✅ Příklady hodnot pro snadné nastavení

### 2. **`DEPLOY-GUIDE.md`**
- ✅ **Kompletní průvodce** nasazením na VPS
- ✅ Krok-za-krokem pro začátečníky i pokročilé
- ✅ Obsahuje:
  - Požadavky na VPS
  - Instalace Dockeru
  - Nastavení environmentu
  - Spuštění aplikace
  - Nastavení DNS a SSL
  - Zabezpečení VPS (UFW, Fail2Ban)
  - Monitoring a údržba
  - Aktualizace
  - Troubleshooting

---

## 🔧 Co musíš udělat na svém VPS

### 1. Nahraj změněné soubory na VPS
```bash
# Zkopíruj změněné soubory
scp docker-compose.yml Dockerfile package.json DEPLOY-GUIDE.md app@tva-ip:/home/app/cosy-pocekt-builder/
```

### 2. Spusť deploy podle průvodce
```bash
# Přejdi do složky
cd /home/app/cosy-pocekt-builder

# Zkopíruj production template
cp .env.production .env

# Uprav .env soubor
nano .env

# Build a spusť
docker compose build --no-cache
docker compose up -d
```

---

## 📋 Co se změnilo v chování

| Před | Po | Důvod |
|------|-----|--------|
| Caddy se musel spouštět s `--profile caddy` | Caddy se spouští automaticky | Jednodušší deploy |
| Aplikace běžela v dev módu | Aplikace běží v production módu | Lepší výkon a stabilita |
| Build zahrnoval všechny kontroly | Build přeskočí dev kontroly | Rychlejší production build |
| Healthcheck měl krátký timeout | Healthcheck má delší timeout | Spolehlivější start |

---

## ⚠️ Důležité poznámky

1. **`npm run start:prod`** serve built aplikaci na portu **8080** uvnitř containeru
2. **Docker port mapping** je `3000:8080`, takže zvenku je přístupné na portu **3000**
3. **Caddy** proxyuje `80/443` → `app:8080`, takže finální přístup je na **HTTPS**
4. **Databáza:** Docker runtime používa produkčný `DATABASE_URL`; PGLite ostáva iba lokálny/dev fallback
5. **Redis** běží v samostatném containeru pro rate limiting

---

## 🎯 Shrnutí

Projekt má pripravený VPS deployment postup. Ostré spustenie stále vyžaduje reálne produkčné env premenné, rotáciu tajomstiev a end-to-end overenie na cieľovej doméne.

- ✅ Docker konfigurace optimalizována pro produkci
- ✅ Production build a serve
- ✅ Caddy pro HTTPS automaticky aktivován
- ✅ Kompletní dokumentace pro deploy
- ✅ Production environment template

**Stačí následovat [DEPLOY-GUIDE.md](./DEPLOY-GUIDE.md) a máš hotovo!**

---

*Poslední aktualizace: 13. září 2026*
