COMPOSE ?= docker compose

.DEFAULT_GOAL := help

.PHONY: help up web agent qdrant build pull down restart logs ps

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "DeepContext commands:\n\n"} /^[a-zA-Z_-]+:.*## / {printf "  %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Build and start the complete stack
	$(COMPOSE) up --build -d

web: ## Build and start the mocked web chat
	$(COMPOSE) up --build -d web

agent: ## Build and start the agent and its dependencies
	$(COMPOSE) up --build -d agent

qdrant: ## Start Qdrant
	$(COMPOSE) up -d qdrant

build: ## Build all local images
	$(COMPOSE) build

pull: ## Pull external images
	$(COMPOSE) pull

down: ## Stop and remove the stack containers
	$(COMPOSE) down

restart: down up ## Recreate the complete stack

logs: ## Follow logs from all services
	$(COMPOSE) logs -f

ps: ## Show stack service status
	$(COMPOSE) ps
