MAIN        = src/slick.colgroup.js
DIST        = dist/slick.colgroup.js

# main targets

build: clean lint build-js test

watch:
	@make -j 2 run-dev-server watch-js


# sub targets

build-js: node_modules bower_components
	@mkdir -p dist && \
	node_modules/.bin/browserify -t babelify $(MAIN) -o $(DIST) && \
	perl -i -pe 's/\$$VERSION/$(shell node -e 'console.log("v" + require("./package.json").version)')/' $(DIST) && \
	node_modules/.bin/uglifyjs $(DIST) -cm --comments -o $(DIST:.js=.min.js)

run-dev-server: node_modules
	@node_modules/.bin/http-server

watch-js: node_modules bower_components
	@mkdir -p dist && \
	node_modules/.bin/watchify $(MAIN) -o $(DIST) -t babelify -v -d

test: node_modules bower_components
	@node_modules/.bin/mocha-phantomjs tests/index.html

lint: node_modules
	@node_modules/.bin/eslint src/*.js

bower_components: bower.json node_modules
	@node_modules/.bin/bower install

node_modules: package.json
	@npm install

clean:
	@rm -rf dist
