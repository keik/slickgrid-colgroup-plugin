# slickgrid-colgroup-plugin

[![travis-ci](https://img.shields.io/travis/keik/slickgrid-colgroup-plugin.svg?style=flat-square)](https://travis-ci.org/keik/slickgrid-colgroup-plugin)
[![npm-version](https://img.shields.io/npm/v/slickgrid-colgroup-plugin.svg?style=flat-square)](https://npmjs.org/package/slickgrid-colgroup-plugin)

[SlickGrid](https://github.com/mleibman/SlickGrid) plugin to create column group in a header.

![](https://github.com/keik/slickgrid-colgroup-plugin/raw/master/screenshots/screenshot.png)

[demo](http://keik.github.io/slickgrid-colgroup-plugin/examples/)


# Installation

## Node

```
npm install slickgrid-colgroup-plugin
```

```javascript
require('slickgrid-colgroup-plugin') // export function globally like below
var colGroupPlugin = new Slick.Plugins.ColGroup()
```

When using with [Browserify](https://github.com/substack/node-browserify), `babelify` and `babel-preset-es2015` are required.


## Browser

Download via `npm` or [releases](https://github.com/keik/slickgrid-colgroup-plugin/releases) and load standalone build version [dist/slickgrid-colgroup-plugin.js](./dist/slick.colgroup.js)

```html
<script src="slickgrid-colgroup-plugin/dist/slick.colgroup.js"></script>
<script>
  var colGroupPlugin = new Slick.Plugins.ColGroup()
</script>
```


# Usage

Register plugin:

```
grid.registerPlugin(new Slick.Plugins.ColGroup())
```

To specify a colmun group structure, extend the column definition to add `children` property with array value, like so:

```
var columns = [
  {id: 'col1', name: 'col 1', children: [
    {id: 'col1-1', name: 'col 1-1', field: 'col1-1'},
    {id: 'col1-2', name: 'col 1-2', field: 'col1-2'}
  ]},
  {id: 'col2', name: 'col 2', children: [
    {id: 'col2-1', name: 'col 2-1', field: 'col2-1'},
    {id: 'col2-2', name: 'col 2-2', children: [
      {id: 'col2-2-1', name: 'col 2-2-1', field: 'col2-2-1'},
      {id: 'col2-2-2', name: 'col 2-2-2', field: 'col2-2-2'}
    ]}
  ]}
]
```


# Test

```
npm install
npm run test
```

or open [test/index](./test/index.html) with web browser which we want to test on after `npm install`.


# License

MIT (c) keik
