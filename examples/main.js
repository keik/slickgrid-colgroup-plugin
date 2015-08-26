var columns = [
  {id: 'col1-1', name: 'col 1-1',  field: 'col1-1', group: 'group 1'},
  {id: 'col1-2', name: 'col 1-2',  field: 'col1-2', group: 'group 1'},
  {id: 'col2',   name: 'col 2',    field: 'col2',   group: 'group 2'},
  {id: 'col3-1', name: 'col 3-1',  field: 'col3-1', group: 'group 3'},
  {id: 'col3-2', name: 'col 3-2',  field: 'col3-2', group: 'group 3'}
];

var options = {
  enableCellNavigation: true,
  enableColumnReorder: false
};

var data = [];
for (var i = 0; i < 500; i++) {
  data[i] = {
    'col1-1': 'Task ' + i,
    'col1-2': '5 days',
    'col2':    Math.round(Math.random() * 100),
    'col3-1': '01/01/2009',
    'col3-2': '01/05/2009'
  };
}

var grid = new Slick.Grid('#myGrid', data, columns, options);
grid.registerPlugin(new Slick.Plugins.ColGroup());
