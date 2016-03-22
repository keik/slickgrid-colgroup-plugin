/* globals chai: false, describe: false, it: false, afterEach: false, each: false */
/* eslint camelcase: [0] */

var assert = chai.assert;

/**
 * @param {Object} options SlickGrid grid options
 * @return {SlickGrid} SlickGrid object
 */
function createGrid(options) {
  $('<div id="grid" style="width: 400px; height: 300px;"></div>').appendTo(document.body);

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
  ];

  var defaultOptions = {
    enableCellNavigation: true,
    enableColumnReorder: false
  };
  options = $.extend({}, defaultOptions, options);

  var data = [];
  for (var i = 0; i < 500; i++) {
    data[i] = {
      title: 'Task ' + i,
      duration: '5 days',
      percentComplete: Math.round(Math.random() * 100),
      start: '01/01/2009',
      finish: '01/05/2009',
      effortDriven: (i % 5 === 0)
    };
  }

  return new Slick.Grid('#grid', data, columns, options);
}

describe('slickgrid-colgroup-plugin', function() {

  var grid;
  afterEach(function() {
    grid.destroy();
    $('#grid').remove();
  });

  describe('# Event', function() {

    describe('colmun group', function() {

      it('should be resized when a child column resize +300px.', function() {
        // setup
        grid = createGrid();
        grid.registerPlugin(new Slick.Plugins.ColGroup());

        var $col1_1 = $('[id*=col1-1]'),
            $col1_2 = $('[id*=col1-2]');
        // exercise
        $col1_1.find('.slick-resizable-handle').simulate('drag', {dx: 300,  dy: 0});
        // verify
        var col1_1_width = $col1_1.outerWidth(),
            col1_2_width = $col1_2.outerWidth(),
            colgroup1_width = $('.slick-header-columns-group').eq(0).outerWidth();
        assert.equal(colgroup1_width, col1_1_width + col1_2_width);
      });

      it('should be resized when a child column resize -300px.', function() {
        // setup
        grid = createGrid();
        grid.registerPlugin(new Slick.Plugins.ColGroup());

        var $col1_1 = $('[id*=col1-1]'),
            $col1_2 = $('[id*=col1-2]');
        // exercise
        $col1_1.find('.slick-resizable-handle').simulate('drag', {dx: -300,  dy: 0});
        // verify
        var col1_1_width = $col1_1.outerWidth(),
            col1_2_width = $col1_2.outerWidth(),
            colgroup1_width = $('.slick-header-columns-group').eq(0).outerWidth();
        assert.equal(colgroup1_width, col1_1_width + col1_2_width);
      });

      it('should be shorten width when a part of child columns gone.', function() {
        // setup
        grid = createGrid();
        grid.registerPlugin(new Slick.Plugins.ColGroup());

        var col1_1_width = $('[id*=col1-1]').eq(0).outerWidth();
        // exercise
        var columns = grid.getColumns();
        columns[0].children.splice(1, 1); // cut col2
        grid.setColumns(columns);
        // verify
        var colgroup1_width = $('.slick-header-columns-group').eq(0).outerWidth();
        assert.equal(colgroup1_width, col1_1_width);
      });

      it('should gone when all children columns gone.', function() {
        // setup
        grid = window.grid = createGrid();
        grid.registerPlugin(new Slick.Plugins.ColGroup());
        var colGroup1El = $('.slick-header-columns-group').eq(0)[0];

        // exercise
        var columns = grid.getColumns();
        columns[0].children.splice(0, 2); // cut col1, col2
        grid.setColumns(columns);
        // verify
        assert.notOk($.contains(document.body, colGroup1El));
      });

      it('should be shown when explicit init (SlickGrid option `explicitInitialization: true`)', function() {
        // setup
        grid = createGrid({explicitInitialization: true});
        grid.registerPlugin(new Slick.Plugins.ColGroup());

        // exercise and verify
        var before_colgroupRowEl = $('.slick-header-columns');
        assert.equal(before_colgroupRowEl.length, 1);
        grid.init();
        var after_colgroupRowEl = $('.slick-header-columns');
        assert.equal(after_colgroupRowEl.length, 3);
      });

      it('should not leak element when creating and destroying again', function() {
        var afterCreate,
            afterDestroy;

        for (var i = 0; i < 10; i++) {
          // setup
          // exercise
          grid = createGrid();
          grid.registerPlugin(new Slick.Plugins.ColGroup());

          // verify
          if (afterCreate)
            assert.equal(afterCreate, document.getElementsByTagName('*').length);
          afterCreate = document.getElementsByTagName('*').length;

          // exercise
          grid.destroy();
          $('#grid').remove();

            // verify
          if (afterDestroy)
            assert.equal(afterDestroy, document.getElementsByTagName('*').length);
          afterDestroy = document.getElementsByTagName('*').length;
        }

        grid = createGrid();
      });

    });
  });
});
