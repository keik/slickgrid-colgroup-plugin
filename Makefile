MAIN        = src/slick.colgroup.es
DIST        = dist/slick.colgroup.js

# main targets

build: clean lint build-js test

watch:
	@make -j 2 run-dev-server watch-js


# sub targets

build-js: node_modules
	@mkdir -p dist && \
	node_modules/.bin/browserify -t babelify $(MAIN) -o $(DIST) && \
	perl -i -pe 's/\$$VERSION/$(shell node -e 'console.log("v" + require("./package.json").version)')/' $(DIST) && \
	node_modules/.bin/uglifyjs $(DIST) -cm --comments -o $(DIST:.js=.min.js)

run-dev-server: node_modules
	@node_modules/.bin/http-server

watch-js: node_modules
	@node_modules/.bin/watchify $(MAIN) -o $(DIST) -t babelify -v -d

test: node_modules
	@node_modules/.bin/mocha-phantomjs tests/index.html

lint: node_modules
	@node_modules/.bin/eslint src/*.es

bower_components: bower.json node_modules
	@node_modules/.bin/bower install

node_modules: package.json
	@npm install

clean:
	@rm -rf dist


#"install": "bower i",
#    "lint": "eslint src/*.es",
#    "start:dev": "http-server & watchify src/slick.colgroup.es -o dist/slick.colgroup.js -t babelify -v",
#    "test": "mocha-phantomjs tests/index.html",
#    "build": "npm run clean && npm run lint && npm run browserify && npm run replace:version && npm run uglify && npm run test",
#    "version": "npm run build && git add .",
#    "-----": "----------------------------------------------------------------",
#    "replace:version": "VERSION=$(node -e 'console.log(require(\"./package.json\").version)') && perl -i -pe 's/\\$VERSION/v'\"$VERSION\"'/' 'dist/slick.colgroup.js'",
#    "clean": "rimraf dist && mkdirp dist",
#    "browserify": "browserify -t babelify src/slick.colgroup.es > dist/slick.colgroup.js",
#    "uglify": "uglifyjs dist/slick.colgroup.js -cm --comments -o dist/slick.colgroup.min.js"
