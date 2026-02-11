# Makefile Reference Guide

The Lazy Foundry VTT project includes a comprehensive Makefile for easy management of Docker services, database operations, and development workflows.

## 📋 Quick Reference

### Most Common Commands

```bash
# Setup
make install       # First time installation
make help          # Show all commands

# Daily Development
make dev           # Start with logs visible
make up            # Start all services (detached)
make down          # Stop all services
make restart       # Restart everything
make logs-api      # Watch API logs

# Database
make backup        # Backup database
make migrate-up    # Apply migrations

# Troubleshooting
make clean         # Clean everything and start fresh
make health        # Check service health
make ps            # Show running containers
```

---

## 🚀 Setup & Installation

### `make install`
Complete first-time installation. This command:
1. Cleans up any existing containers
2. Builds all Docker images
3. Starts all services
4. Shows running containers

**When to use:** First time setting up the project

```bash
make install
```

### `make help`
Display all available commands with descriptions.

```bash
make help
```

---

## 🐳 Docker Operations

### `make build`
Build all Docker images from scratch.

```bash
make build
```

**Use case:** After changing Dockerfile or dependencies

### `make up`
Start all services in detached mode (background).

```bash
make up
```

**Output:** Shows running container status

### `make down`
Stop and remove all containers (preserves volumes/data).

```bash
make down
```

### `make stop`
Stop containers without removing them.

```bash
make stop
```

### `make start`
Start previously stopped containers.

```bash
make start
```

### `make restart`
Restart all services.

```bash
make restart
```

**Use case:** After changing environment variables

### `make rebuild`
Complete rebuild: stop, build, and start.

```bash
make rebuild
```

**Use case:** After major code changes

### `make clean`
⚠️ **WARNING:** Removes all containers, volumes, and data.

```bash
make clean
```

**Use case:** Fresh start or troubleshooting persistent issues

### `make ps`
Show status of all running containers.

```bash
make ps
```

---

## 💻 Development

### `make dev`
Start in development mode with logs streaming to console.

```bash
make dev
```

**Use case:** Active development, want to see logs in real-time

Press `Ctrl+C` to stop.

### `make dev-build`
Build and start in development mode.

```bash
make dev-build
```

---

## 📝 Logs

### `make logs`
Stream logs from all services.

```bash
make logs
```

### `make logs-api`
Stream API logs only.

```bash
make logs-api
```

### `make logs-web`
Stream web frontend logs.

```bash
make logs-web
```

### `make logs-db`
Stream PostgreSQL logs.

```bash
make logs-db
```

### `make logs-foundry`
Stream Foundry VTT logs.

```bash
make logs-foundry
```

### `make logs-json`
Show API logs in pretty JSON format (requires `jq`).

```bash
# Install jq first if needed
sudo apt install jq

# Then view formatted logs
make logs-json
```

### `make watch-logs`
Watch logs with pretty formatting in real-time.

```bash
make watch-logs
```

### `make quick-logs`
Show last 50 lines of API logs (quick troubleshooting).

```bash
make quick-logs
```

---

## 🔧 Shell Access

### `make shell-api`
Open an interactive shell in the API container.

```bash
make shell-api
```

**Use case:** Debug, run commands, inspect files

```bash
# Example: Inside the container
$ ls -la
$ cat logs/error.log
$ exit
```

### `make shell-db`
Open PostgreSQL interactive shell.

```bash
make shell-db
```

**Use case:** Run SQL queries directly

```bash
# Example: Inside psql
lazy_foundry=# SELECT * FROM users;
lazy_foundry=# \dt
lazy_foundry=# \q
```

### `make shell-foundry`
Open shell in Foundry VTT container.

```bash
make shell-foundry
```

---

## 🗄️ Database Operations

### `make migrate-up`
Apply database migrations (add indexes).

```bash
make migrate-up
```

**Output:**
```
Running database migrations...
CREATE INDEX CONCURRENTLY...
Migrations complete!
```

### `make backup`
Create timestamped database backup.

```bash
make backup
```

**Output:** Creates `backups/backup-YYYYMMDD-HHMMSS.sql`

```bash
# List backups
ls -lh backups/
```

### `make restore`
⚠️ **WARNING:** Restore database from latest backup (overwrites current data).

```bash
make restore
```

**Interactive:** Press Enter to confirm or Ctrl+C to cancel

### `make db-reset`
⚠️ **DANGER:** Delete all database data and start fresh.

```bash
make db-reset
```

**Interactive:** Confirmation required

**Use case:** Complete database reset for testing

---

## 🏥 Health & Monitoring

### `make health`
Comprehensive health check of all services.

```bash
make health
```

**Checks:**
- API readiness
- API metrics
- Container status
- Database connectivity

### `make test-api`
Test API endpoints.

```bash
make test-api
```

**Output:**
```json
{
  "status": "alive",
  "timestamp": "2026-02-10T12:34:56.789Z"
}
```

### `make status`
Detailed status of all services, volumes, and networks.

```bash
make status
```

### `make ps`
Quick container status.

```bash
make ps
```

---

## 🏭 Production

### `make prod`
Start in production mode with validation.

```bash
make prod
```

**Validates:**
- `.env` file exists
- `JWT_SECRET` is set (not default value)
- Runs migrations
- Checks health

**Use case:** Production deployment

---

## 🛠️ Utilities

### `make fix-permissions`
Fix file permissions (useful in WSL/Linux).

```bash
make fix-permissions
```

### `make generate-jwt-secret`
Generate a secure random JWT secret.

```bash
make generate-jwt-secret
```

**Output:**
```
Generated JWT_SECRET:
dGhpc0lzQVJhbmRvbVNlY3JldEtleUZvckpXVA==
```

Copy this to your `.env` file:
```bash
JWT_SECRET=dGhpc0lzQVJhbmRvbVNlY3JldEtleUZvckpXVA==
```

### `make clean-logs`
Remove old log files (>7 days).

```bash
make clean-logs
```

### `make prune`
⚠️ **WARNING:** Remove ALL unused Docker resources system-wide.

```bash
make prune
```

**Use case:** Free up disk space

---

## ⚡ Quick Commands

### `make quick-restart`
Restart only the API service (fast).

```bash
make quick-restart
```

**Use case:** After changing API code

---

## ℹ️ Information

### `make urls`
Show all service URLs.

```bash
make urls
```

**Output:**
```
Service URLs:
  Web UI:        http://localhost:3000
  API:           http://localhost:3001
  API Health:    http://localhost:3001/health/ready
  API Metrics:   http://localhost:3001/health/metrics
  Foundry VTT:   http://localhost:30000
  PostgreSQL:    localhost:5432
```

### `make version`
Show version information.

```bash
make version
```

**Output:**
```
Lazy Foundry VTT
Version: 1.0.0 (Phase 6 Complete)
Node: v20.x.x
PostgreSQL: 15.x
Docker: xx.x.x
```

---

## 🎯 Common Workflows

### First Time Setup
```bash
# 1. Clone and configure
git clone <repo>
cd Lazy-Foundry-VTT
cp .env.example .env
# Edit .env with your values

# 2. Install
make install

# 3. Check status
make health
make urls
```

### Daily Development
```bash
# Start working
make dev           # or make up for background

# View logs
make logs-api

# Make code changes...

# Restart API only
make quick-restart

# Full restart if needed
make restart
```

### Troubleshooting
```bash
# Check status
make ps
make health

# View logs
make logs-api
make quick-logs

# Check specific service
make shell-api
make shell-db

# Nuclear option - start fresh
make clean
make install
```

### Database Management
```bash
# Regular backup
make backup

# Apply new migrations
make migrate-up

# Emergency restore
make restore

# Reset everything (testing)
make db-reset
```

### Production Deployment
```bash
# 1. Configure for production
make generate-jwt-secret  # Copy to .env
# Set NODE_ENV=production in .env

# 2. Deploy
make prod

# 3. Verify
make health
make test-api

# 4. Monitor
make logs
make status
```

---

## 🔍 Debugging Tips

### Container won't start?
```bash
# Check logs
make logs-api
make logs-db

# Check container status
make ps

# Try rebuilding
make rebuild
```

### Database issues?
```bash
# Connect to database
make shell-db

# Check tables
\dt

# Check connections
SELECT * FROM pg_stat_activity;
```

### Permission issues?
```bash
make fix-permissions
```

### Disk space issues?
```bash
# Clean old resources
make prune

# Clean old logs
make clean-logs
```

### Conflict errors?
```bash
# Container name conflicts
make clean
make up
```

---

## 📦 Requirements

### System Requirements
- Docker & Docker Compose
- Make (install: `sudo apt install make`)
- Optional: `jq` for pretty JSON logs (`sudo apt install jq`)

### Sudo Usage
The Makefile automatically detects if you need `sudo` for Docker commands:
- If you're in the `docker` group: uses `docker` directly
- If not: uses `sudo docker`

To avoid sudo, add yourself to docker group:
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

---

## 🎓 Advanced Usage

### Custom Commands
You can chain Make commands:

```bash
# Clean and rebuild
make clean && make build && make up

# Backup before resetting
make backup && make db-reset
```

### Environment Variables
Override defaults:

```bash
# Use specific compose file
COMPOSE_FILE=docker-compose.prod.yml make up
```

### Background Tasks
Start in background and monitor:

```bash
make up
watch -n 5 'make ps'  # Update every 5 seconds
```

---

## 📚 Related Documentation

- [README.md](../README.md) - Project overview
- [PHASE_6_QUICK_REFERENCE.md](PHASE_6_QUICK_REFERENCE.md) - Phase 6 features
- [PHASE_6_IMPLEMENTATION_COMPLETE.md](PHASE_6_IMPLEMENTATION_COMPLETE.md) - Implementation details
- [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md) - Environment setup

---

## 🆘 Getting Help

1. **Check logs:** `make logs-api` or `make quick-logs`
2. **Check health:** `make health`
3. **Check status:** `make status`
4. **View help:** `make help`
5. **Fresh start:** `make clean && make install`

**Still stuck?** Check the logs with correlation IDs:
```bash
make logs-api | grep "requestId"
```

Every error includes a `requestId` for tracking across logs!
