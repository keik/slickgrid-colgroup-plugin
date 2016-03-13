MAIN        = src/slick.colgroup.js
DIST        = dist


# main targets

all: clean lint $(DIST)/slick.colgroup.js $(DIST)/slick.colgroup.min.js test

watch:
	@make -j 2 run-dev-server watch-js


# sub targets

$(DIST)/slick.colgroup.min.js: node_modules $(DIST)/slick.colgroup.js
	@node_modules/.bin/uglifyjs $(DIST)/slick.colgroup.js -cm --comments -o $@

$(DIST)/slick.colgroup.js: node_modules $(DIST)
	@node_modules/.bin/browserify -t [ babelify --presets es2015 ] -t undebuggify $(MAIN) -o $@
	@perl -i -pe 's/\$$VERSION/$(shell node -e 'console.log("v" + require("./package.json").version)')/' $@

watch-js: node_modules bower_components $(DIST)
	@node_modules/.bin/watchify -t [ babelify --presets es2015 ] -t undebuggify $(MAIN) -v -d

test: node_modules bower_components $(DIST)/slick.colgroup.js $(DIST)/slick.colgroup.min.js
	@node_modules/.bin/mocha-phantomjs test/index.html

lint: node_modules
	@node_modules/.bin/eslint src/*.js

$(DIST):
	@mkdir -p $@

bower_components: bower.json node_modules
	@node_modules/.bin/bower install

node_modules: package.json
	@npm install

clean:
	@rm -rf dist

.PHONY: all watch watch-js test link clean
