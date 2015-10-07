# slickgrid-colgroup-plugin

[SlickGrid](https://github.com/mleibman/SlickGrid) plugin to create column group in a header.

![](https://github.com/keik/slickgrid-colgroup-plugin/raw/master/screenshots/screenshot.png)

[demo](http://keik.info/products/slickgrid-colgroup-plugin/examples/)

## Usage

Register plugin:

```
grid.registerPlugin(new Slick.Plugins.ColGroup());
```

To specify a colmun group, extend the column definition to add `group` property, like so:

```
var columns = [
  {id: 'col1-1', name: 'col 1-1',  field: 'col1-1', group: 'group 1'},
  {id: 'col1-2', name: 'col 1-2',  field: 'col1-2', group: 'group 1'},
  {id: 'col2',   name: 'col 2',    field: 'col2',   group: 'group 2'},
  {id: 'col3-1', name: 'col 3-1',  field: 'col3-1', group: 'group 3'},
  {id: 'col3-2', name: 'col 3-2',  field: 'col3-2', group: 'group 3'}
];
```

## License

MIT (c) keik
