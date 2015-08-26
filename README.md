# slickgrid-colgroup-plugin

[SlickGrid](https://github.com/mleibman/SlickGrid) plugin to create column group in a header.

![](https://github.com/keik/slickgrid-colgroup-plugin/raw/master/screenshots/screenshot.png)

## Usage

Register plugin:

```
grid.registerPlugin(new Slick.Plugins.ColGroup());
```

To specify a colmun group, extend the column definition to add `group` property, like so:

```
var columns = [
  {id: 'col1', name: 'My column 1', group: 'group-1'},
  {id: 'col2', name: 'My column 2', group: 'group-1'},
  {id: 'col3', name: 'My column 3', group: 'group-2'},
  {id: 'col4', name: 'My column 4', group: 'group-2'}
];
```

## License

MIT (c) keik
