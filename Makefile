.PHONY: help build up down restart clean logs logs-api logs-web logs-db logs-foundry shell-api shell-db ps health backup restore migrate-up migrate-down install dev prod stop start rebuild

# Default target
.DEFAULT_GOAL := help

# Docker command prefix (use 'sudo' if needed)
DOCKER := $(shell if groups | grep -q docker; then echo "docker"; else echo "sudo docker"; fi)
DOCKER_COMPOSE := $(DOCKER) compose

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

##@ General

help: ## Display this help message
	@echo "$(BLUE)Lazy Foundry VTT - Docker Management$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make $(GREEN)<target>$(NC)\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup & Installation

check-docker-group: ## Check if user is in docker group
	@if groups | grep -q docker; then \
		echo "$(GREEN)✓ User is in docker group$(NC)"; \
	else \
		echo "$(YELLOW)⚠ User is NOT in docker group$(NC)"; \
		echo "$(YELLOW)Docker commands will require sudo$(NC)"; \
		echo ""; \
		echo "To fix this, run:"; \
		echo "  $(GREEN)make setup-docker$(NC)"; \
	fi

setup-docker: ## Add current user to docker group (requires logout/login)
	@echo "$(YELLOW)Setting up Docker permissions...$(NC)"
	@if groups | grep -q docker; then \
		echo "$(GREEN)✓ User is already in docker group$(NC)"; \
	else \
		if ! getent group docker > /dev/null 2>&1; then \
			echo "$(YELLOW)Creating docker group...$(NC)"; \
			sudo groupadd docker; \
		fi; \
		echo "$(YELLOW)Adding user to docker group...$(NC)"; \
		sudo usermod -aG docker $$USER; \
		echo "$(GREEN)✓ User added to docker group$(NC)"; \
		echo ""; \
		echo "$(YELLOW)IMPORTANT: You must log out and log back in for this to take effect!$(NC)"; \
		echo "$(YELLOW)Or run: newgrp docker$(NC)"; \
		echo ""; \
		echo "After logging back in, verify with: $(GREEN)make check-docker-group$(NC)"; \
	fi

install: check-docker-group ## First time setup - build and start all services
	@echo "$(GREEN)Installing Lazy Foundry VTT...$(NC)"
	@make clean
	@make build
	@make up
	@echo "$(GREEN)Installation complete!$(NC)"
	@echo "$(YELLOW)Access the application at:$(NC)"
	@echo "  - Web UI: http://localhost:3000"
	@echo "  - API: http://localhost:3001"
	@echo "  - Foundry VTT: http://localhost:30000"

##@ Docker Operations

build: ## Build all Docker images
	@echo "$(GREEN)Building Docker images...$(NC)"
	$(DOCKER_COMPOSE) build

up: ## Start all services (detached)
	@echo "$(GREEN)Starting all services...$(NC)"
	$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)Services started!$(NC)"
	@make ps

down: ## Stop and remove all containers
	@echo "$(YELLOW)Stopping all services...$(NC)"
	$(DOCKER_COMPOSE) down

stop: ## Stop all containers (without removing)
	@echo "$(YELLOW)Stopping containers...$(NC)"
	$(DOCKER_COMPOSE) stop

start: ## Start existing containers
	@echo "$(GREEN)Starting containers...$(NC)"
	$(DOCKER_COMPOSE) start

restart: ## Restart all services
	@echo "$(YELLOW)Restarting all services...$(NC)"
	$(DOCKER_COMPOSE) restart
	@make ps

rebuild: ## Rebuild and restart all services
	@echo "$(GREEN)Rebuilding services...$(NC)"
	@make down
	@make build
	@make up

clean: ## Remove all containers, volumes, and networks
	@echo "$(RED)Cleaning up Docker resources...$(NC)"
	$(DOCKER_COMPOSE) down -v --remove-orphans
	@echo "$(GREEN)Cleanup complete!$(NC)"

ps: ## Show running containers
	@echo "$(BLUE)Running containers:$(NC)"
	@$(DOCKER_COMPOSE) ps

##@ Development

dev: ## Start in development mode with logs
	@echo "$(GREEN)Starting in development mode...$(NC)"
	$(DOCKER_COMPOSE) up

dev-build: ## Build and start in development mode
	@echo "$(GREEN)Building and starting in development mode...$(NC)"
	$(DOCKER_COMPOSE) up --build

##@ Logs

logs: ## Show logs for all services
	$(DOCKER_COMPOSE) logs -f

logs-api: ## Show API logs
	$(DOCKER_COMPOSE) logs -f api

logs-web: ## Show web frontend logs
	$(DOCKER_COMPOSE) logs -f web

logs-db: ## Show database logs
	$(DOCKER_COMPOSE) logs -f postgres

logs-foundry: ## Show Foundry VTT logs
	$(DOCKER_COMPOSE) logs -f foundry

logs-json: ## Show API logs in pretty JSON format
	@$(DOCKER_COMPOSE) logs api | grep -E '^\{' | jq -R 'fromjson? | select(type == "object")'

##@ Shell Access

shell-api: ## Open shell in API container
	$(DOCKER_COMPOSE) exec api sh

shell-db: ## Open PostgreSQL shell
	$(DOCKER_COMPOSE) exec postgres psql -U postgres -d lazy_foundry

shell-foundry: ## Open shell in Foundry container
	$(DOCKER_COMPOSE) exec foundry sh

##@ Database

migrate-up: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(NC)"
	$(DOCKER_COMPOSE) exec postgres psql -U postgres -d lazy_foundry < api/migrations/add-indexes.sql
	@echo "$(GREEN)Migrations complete!$(NC)"

migrate-down: ## Rollback database migrations (manual - edit as needed)
	@echo "$(YELLOW)Manual rollback required - connect to DB and drop indexes$(NC)"
	@make shell-db

backup: ## Create database backup
	@echo "$(GREEN)Creating database backup...$(NC)"
	@mkdir -p backups
	@$(DOCKER_COMPOSE) exec postgres pg_dump -U postgres lazy_foundry > backups/backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "$(GREEN)Backup created in backups/ directory$(NC)"

restore: ## Restore database from latest backup (WARNING: overwrites data)
	@echo "$(RED)WARNING: This will overwrite your database!$(NC)"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read confirm
	@echo "$(YELLOW)Restoring from latest backup...$(NC)"
	@LATEST=$$(ls -t backups/*.sql | head -1); \
	if [ -z "$$LATEST" ]; then \
		echo "$(RED)No backup files found!$(NC)"; \
		exit 1; \
	fi; \
	echo "Restoring from $$LATEST"; \
	$(DOCKER_COMPOSE) exec -T postgres psql -U postgres -d lazy_foundry < $$LATEST
	@echo "$(GREEN)Restore complete!$(NC)"

db-reset: ## Reset database (WARNING: deletes all data)
	@echo "$(RED)WARNING: This will delete ALL data!$(NC)"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read confirm
	@echo "$(YELLOW)Resetting database...$(NC)"
	$(DOCKER_COMPOSE) down postgres
	$(DOCKER) volume rm lazy-foundry-vtt_postgres_data || true
	$(DOCKER_COMPOSE) up -d postgres
	@echo "$(GREEN)Database reset complete!$(NC)"

##@ Health & Monitoring

health: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo ""
	@echo "$(GREEN)API Health:$(NC)"
	@curl -s http://localhost:3001/health/ready | jq . || echo "$(RED)API not responding$(NC)"
	@echo ""
	@echo "$(GREEN)API Metrics:$(NC)"
	@curl -s http://localhost:3001/health/metrics | jq . || echo "$(RED)Metrics not available$(NC)"
	@echo ""
	@echo "$(GREEN)Docker Container Status:$(NC)"
	@$(DOCKER_COMPOSE) ps

watch-logs: ## Watch logs with pretty formatting
	@$(DOCKER_COMPOSE) logs -f api | grep --line-buffered '{"' | jq -R 'fromjson? | select(type == "object") | "\(.timestamp) [\(.level | ascii_upcase)] \(.message)"' -r

##@ Production

prod: ## Start in production mode
	@echo "$(GREEN)Starting in production mode...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(RED)Error: .env file not found!$(NC)"; \
		echo "$(YELLOW)Copy .env.example to .env and configure it first.$(NC)"; \
		exit 1; \
	fi
	@if grep -q "change-this-secret-in-production" .env 2>/dev/null; then \
		echo "$(RED)Error: JWT_SECRET not configured!$(NC)"; \
		echo "$(YELLOW)Generate a secure secret with: openssl rand -base64 32$(NC)"; \
		exit 1; \
	fi
	@make clean
	@make build
	@make up
	@make migrate-up
	@make health

##@ Utilities

fix-permissions: ## Fix file permissions for development
	@echo "$(GREEN)Fixing permissions...$(NC)"
	sudo chown -R $$USER:$$USER .
	@echo "$(GREEN)Permissions fixed!$(NC)"

fix-foundry-permissions: ## Fix Foundry data volume permissions
	@echo "$(GREEN)Fixing Foundry data permissions...$(NC)"
	@echo "$(YELLOW)Stopping Foundry container...$(NC)"
	$(DOCKER_COMPOSE) stop foundry 2>/dev/null || true
	@echo "$(YELLOW)Fixing volume permissions...$(NC)"
	$(DOCKER_COMPOSE) run --rm --user root --entrypoint="" foundry sh -c "chown -R node:node /data 2>/dev/null || true"
	@echo "$(GREEN)Starting Foundry container...$(NC)"
	$(DOCKER_COMPOSE) up -d foundry
	@echo "$(GREEN)Foundry permissions fixed!$(NC)"

generate-jwt-secret: ## Generate a secure JWT secret
	@echo "$(GREEN)Generated JWT_SECRET:$(NC)"
	@openssl rand -base64 32

clean-logs: ## Clean old log files
	@echo "$(YELLOW)Cleaning old logs...$(NC)"
	@find logs -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true
	@echo "$(GREEN)Logs cleaned!$(NC)"

prune: ## Remove all unused Docker resources (images, containers, volumes)
	@echo "$(RED)WARNING: This will remove all unused Docker resources!$(NC)"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read confirm
	$(DOCKER) system prune -af --volumes

##@ Quick Commands

quick-restart: ## Quick restart of API only
	@echo "$(YELLOW)Restarting API...$(NC)"
	$(DOCKER_COMPOSE) restart api

quick-logs: ## Show last 50 lines of API logs
	@$(DOCKER_COMPOSE) logs --tail=50 api

test-api: ## Test API endpoint
	@echo "$(BLUE)Testing API endpoints...$(NC)"
	@echo ""
	@echo "$(GREEN)Health Check:$(NC)"
	@curl -s http://localhost:3001/health/live | jq .
	@echo ""
	@echo "$(GREEN)Readiness Check:$(NC)"
	@curl -s http://localhost:3001/health/ready | jq .

##@ Information

status: ## Show detailed status of all services
	@echo "$(BLUE)=== System Status ===$(NC)"
	@echo ""
	@echo "$(GREEN)Containers:$(NC)"
	@$(DOCKER_COMPOSE) ps
	@echo ""
	@echo "$(GREEN)Volumes:$(NC)"
	@$(DOCKER) volume ls | grep lazy-foundry
	@echo ""
	@echo "$(GREEN)Networks:$(NC)"
	@$(DOCKER) network ls | grep lazy-foundry
	@echo ""
	@echo "$(GREEN)Images:$(NC)"
	@$(DOCKER) images | grep lazy-foundry

version: ## Show version information
	@echo "$(BLUE)Lazy Foundry VTT$(NC)"
	@echo "Version: 1.0.0 (Phase 6 Complete)"
	@echo "Node: $$($(DOCKER_COMPOSE) exec -T api node --version 2>/dev/null || echo 'N/A')"
	@echo "PostgreSQL: $$($(DOCKER_COMPOSE) exec -T postgres psql --version 2>/dev/null || echo 'N/A')"
	@echo "Docker: $$($(DOCKER) --version)"
	@echo "Docker Compose: $$($(DOCKER_COMPOSE) version)"

urls: ## Show all service URLs
	@echo "$(BLUE)Service URLs:$(NC)"
	@echo "  $(GREEN)Web UI:$(NC)        http://localhost:3000"
	@echo "  $(GREEN)API:$(NC)           http://localhost:3001"
	@echo "  $(GREEN)API Health:$(NC)    http://localhost:3001/health/ready"
	@echo "  $(GREEN)API Metrics:$(NC)   http://localhost:3001/health/metrics"
	@echo "  $(GREEN)Foundry VTT:$(NC)   http://localhost:30000"
	@echo "  $(GREEN)PostgreSQL:$(NC)    localhost:5432"
