assert = chai.assert;

describe('slickgrid-colgroup-plugin', function () {

  beforeEach(function () {
    var $container = $('<div id="grid" style="width: 400px; height: 300px;"></div>').appendTo(document.body);

    var columns = [
      {id: "title", name: "Title", field: "title", group: "1"},
      {id: "duration", name: "Duration", field: "duration", group: "1"},
      {id: "%", name: "% Complete", field: "percentComplete", group: "2"},
      {id: "start", name: "Start", field: "start", group: "2"},
      {id: "finish", name: "Finish", field: "finish", group: "3"},
      {id: "effort-driven", name: "Effort Driven", field: "effortDriven", group: "3"}
    ];
    var options = {
      enableCellNavigation: true,
      enableColumnReorder: false
    };
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

    grid = new Slick.Grid('#grid', data, columns, options);
    grid.registerPlugin(new Slick.Plugins.ColGroup());
  });

  afterEach(function () {
    $('#grid').remove();
  });

  describe('Event', function () {
    describe('Resize', function () {
      it('should resize when a column resize (+300px)', function () {
        var base_width = $('.slick-header-column').eq(2).width();
        var sut_base_width = $('.slick-header-columns-group').eq(1).width();
        // exercise
        $('.slick-header-column').eq(2)
          .find('.slick-resizable-handle').simulate("drag", { dx: 300,  dy: 0 });
        // verify
        var result_width = $('.slick-header-column').eq(2).width();
        var sut_result_width = $('.slick-header-columns-group').eq(1).width();
        assert.equal(result_width - base_width, sut_result_width - sut_base_width);
      });

      it('should resize when a column resize (-300px)', function () {
        var base_width = $('.slick-header-column').eq(2).width();
        var sut_base_width = $('.slick-header-columns-group').eq(1).width();
        // exercise
        $('.slick-header-column').eq(2)
          .find('.slick-resizable-handle').simulate("drag", { dx: -300,  dy: 0 });
        // verify
        var result_width = $('.slick-header-column').eq(2).width();
        var sut_result_width = $('.slick-header-columns-group').eq(1).width();
        assert.equal(result_width - base_width, sut_result_width - sut_base_width);
      });
    });

    describe('reset Columns', function () {
      it('should shorten width when a part of child columns gone', function () {
        var base_width = $('.slick-header-columns-group').eq(0).width();
        // exercise
        var columns = grid.getColumns();
        columns.splice(1, 1);
        grid.setColumns(columns);
        // verify
        var dropped_width = $('.slick-header-column').eq(1).outerWidth();
        var result_width = $('.slick-header-columns-group').eq(0).width();
        assert.equal(dropped_width, base_width -  result_width);
      });
      it('should gone when all of child columns gone', function () {
        var colGroup1El = $('.slick-header-columns-group').eq(0)[0];
        // exercise
        var columns = grid.getColumns();
        columns.splice(0, 2);
        grid.setColumns(columns);
        // verify
        assert.notOk($.contains(document.body, colGroup1El));
      });
    });
  });
});
