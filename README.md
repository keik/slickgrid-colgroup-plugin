# slickgrid-colgroup-plugin

[SlickGrid](https://github.com/mleibman/SlickGrid) plugin to create column group in a header.

![](https://github.com/keik/slickgrid-colgroup-plugin/raw/master/screenshots/screenshot.png)

[demo](http://keik.github.io/slickgrid-colgroup-plugin/examples/)

## Usage

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

## Test

```
npm install
npm run test
```

or open [test/index](./test/index.html) with web browser which we want to test on after `npm install`.


## License

MIT (c) keik
