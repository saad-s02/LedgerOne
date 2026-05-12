.PHONY: dev test check check-backend check-frontend backend-dev frontend-dev clean

dev:
	@echo "Starting backend and frontend (Ctrl+C exits both)..."
	@(trap 'kill 0' SIGINT; \
	  (cd backend && dotnet run --project LedgerOne.Api) & \
	  (cd frontend && npm run dev) & \
	  wait)

backend-dev:
	cd backend && dotnet run --project LedgerOne.Api

frontend-dev:
	cd frontend && npm run dev

test: check-backend check-frontend

check-backend:
	cd backend && dotnet test

check-frontend:
	cd frontend && npx playwright test

check:
	cd backend && dotnet format --verify-no-changes
	cd frontend && npx eslint . && npx prettier --check . && npx tsc --noEmit
	$(MAKE) test

clean:
	cd backend && dotnet clean
	rm -rf backend/**/bin backend/**/obj
	rm -rf frontend/node_modules frontend/dist
