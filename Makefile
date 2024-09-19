SHELL = /bin/bash
ROOT = $(shell pwd)
BUILD_DIR = $(ROOT)/dist
NODE_BIN = $(ROOT)/node_modules/.bin
JEST = $(NODE_BIN)/jest --restoreMocks --colors --verbose --watch

.PHONY: \
	clean build \
	no-package-json-wild-cards lint lint\:fix \
	test\:fast test \
	start start-prod

clean:
	@rm -rf $(BUILD_DIR)

build: clean
	npm run build

no-package-json-wild-cards:
	@egrep '": "[~^*][0-9]+' package.json > /dev/null; \
	if [ $$? -eq "0" ]; \
	then \
		exit 1; \
	fi

lint: no-package-json-wild-cards
	@$(NODE_BIN)/eslint $(ROOT)/src $(ROOT)/test

lint\:fix:
	@$(NODE_BIN)/eslint --fix $(ROOT)/src $(ROOT)/test

test\:fast:
	NODE_ENV=test $(JEST)

test: lint
	NODE_ENV=test $(JEST) --ci --no-watch --collect-coverage

# development
start:
	NODE_ENV=development npm run dev

# staging or production - server is run on AWS ECS configured to restart automatically if exits
start-prod:
	NODE_ENV=production npm start
