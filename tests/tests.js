assert = chai.assert;

/**
 * @param {Object} options SlickGrid grid options
 * @return {SlickGrid} SlickGrid object
 */
function createGrid(options) {
  var $container = $('<div id="grid" style="width: 400px; height: 300px;"></div>').appendTo(document.body);

  var columns = [
    {id: "title", name: "Title", field: "title", group: "1"},
    {id: "duration", name: "Duration", field: "duration", group: "1"},
    {id: "%", name: "% Complete", field: "percentComplete", group: "2"},
    {id: "start", name: "Start", field: "start", group: "2"},
    {id: "finish", name: "Finish", field: "finish", group: "3"},
    {id: "effort-driven", name: "Effort Driven", field: "effortDriven", group: "3"}
  ];

  var defaultOptions = {
    enableCellNavigation: true,
    enableColumnReorder: false
  };
  options = $.extend({}, defaultOptions, options)

  var data = [];
  for (var i = 0; i < 500; i++) {
    data[i] = {
      title: "Task " + i,
      duration: "5 days",
      percentComplete: Math.round(Math.random() * 100),
      start: "01/01/2009",
      finish: "01/05/2009",
      effortDriven: (i % 5 == 0)
    };
  }

  return new Slick.Grid('#grid', data, columns, options);
}

describe('slickgrid-colgroup-plugin', function () {

  afterEach(function () {
    $('#grid').remove();
  });

  describe('# Event', function () {

    describe('colmun group', function () {

      it('should be resized when a child column resize +300px.', function () {
        // setup
        var grid = createGrid(),
            $col3 = $('.slick-header-column').eq(2),
            $col4 = $('.slick-header-column').eq(3);
        grid.registerPlugin(new Slick.Plugins.ColGroup());
        // exercise
        $col3.find('.slick-resizable-handle').simulate("drag", { dx: 300,  dy: 0 });
        // verify
        var col3_width = $col3.outerWidth(),
            col4_width = $col4.outerWidth(),
            colgroup2_width = $('.slick-header-columns-group').eq(1).outerWidth();
        assert.equal(colgroup2_width, col3_width + col4_width);
      });

      it('should be resized when a child column resize -300px.', function () {
        // setup
        var grid = createGrid(),
            $col3 = $('.slick-header-column').eq(2),
            $col4 = $('.slick-header-column').eq(3);
        grid.registerPlugin(new Slick.Plugins.ColGroup());
        // exercise
        $col3.find('.slick-resizable-handle').simulate("drag", { dx: -300,  dy: 0 });
        // verify
        var col3_width = $col3.outerWidth(),
            col4_width = $col4.outerWidth(),
            colgroup2_width = $('.slick-header-columns-group').eq(1).outerWidth();
        assert.equal(colgroup2_width, col3_width + col4_width);
      });

      it('should be shorten width when a part of child columns gone.', function () {
        // setup
        var grid = createGrid(),
            col1_width = $('.slick-header-column').eq(0).outerWidth(),
            col2_width = $('.slick-header-column').eq(1).outerWidth();
        grid.registerPlugin(new Slick.Plugins.ColGroup());
        // exercise
        var columns = grid.getColumns();
        columns.splice(1, 1); // cut col2
        grid.setColumns(columns);
        // verify
        var colgroup1_width = $('.slick-header-columns-group').eq(0).outerWidth();
        assert.equal(colgroup1_width, col2_width);
      });

      it('should gone when all children columns gone.', function () {
        // setup
        var grid = createGrid();
        grid.registerPlugin(new Slick.Plugins.ColGroup());
        var colGroup1El = $('.slick-header-columns-group').eq(0)[0];
        // exercise
        var columns = grid.getColumns();
        columns.splice(0, 2); // cut col1, col2
        grid.setColumns(columns);
        // verify
        assert.notOk($.contains(document.body, colGroup1El));
      });

      it('should be shown when explicit init (SlickGrid option `explicitInitialization: true`)', function () {
        // setup
        var grid = createGrid({explicitInitialization: true});
        grid.registerPlugin(new Slick.Plugins.ColGroup());
        // exercise and verify
        var before_colgroupRowEl = $('.slick-header-columns-group');
        assert.equal(before_colgroupRowEl.length, 0);
        grid.init();
        var after_colgroupRowEl = $('.slick-header-columns-group');
        assert.equal(after_colgroupRowEl.length, 3);
      });

    });
  });
});
