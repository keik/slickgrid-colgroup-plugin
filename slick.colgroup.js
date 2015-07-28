/* global Slick */

(function ($) {
  'use strict';

  // register namespace
  $.extend(true, window, {
    'Slick': {
      'Plugins': {
        'ColGroup': ColGroup
      }
    }
  });

  /***
   * A plugin to create column group in a header.
   *
   * USAGE:
   *
   * To specify a colmun group, extend the column definition to add `group` property, like so:
   *
   *   var columns = [
   *     {id: 'myColumn1', name: 'My column 1', group: 'group-1'},
   *     {id: 'myColumn2', name: 'My column 2', group: 'group-1'},
   *     {id: 'myColumn3', name: 'My column 3', group: 'group-2'},
   *     {id: 'myColumn4', name: 'My column 4', group: 'group-2'}
   *   ];
   *
   * @class Slick.Plugins.ColGroup
   * @constructor
   */
  function ColGroup() {
    var _grid,
        _uid,
        _handler = new Slick.EventHandler(),
        _headerScrollerEl,
        _headersEl;

    function init(grid) {
      _grid = grid;
      _uid = _grid.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];
      _handler
        .subscribe(_grid.onColumnsResized, handleColumnsResized);

      _headerScrollerEl = _grid.getContainerNode().getElementsByClassName('slick-header')[0];

      _grid.setColumns = (function (originalSetColumns) {
        return function (columnDefinitions) {
          originalSetColumns(columnDefinitions);
          createColumnGroupHeaders();
        };
      }(_grid.setColumns));

      var tmp = document.createElement('div');
      tmp.innerHTML = '<div class="slick-header-columns-groups" style="left: -1000px" unselectable="on"></div>';
      _headersEl = tmp.childNodes[0];
      _headerScrollerEl.insertBefore(_headersEl, _headerScrollerEl.firstChild);
      createColumnGroupHeaders();
    }

    function handleColumnsResized() {
      applyColumnGroupWidths();
    }

    function measureCellHorizontalPaddingAndBorder() {
      var computed = window.getComputedStyle(_headerScrollerEl.getElementsByClassName('slick-header-column')[0]);
      var headerColumnWidthDiff = 0;
      $.each(['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'], function (n, val) {
        headerColumnWidthDiff += (parseFloat(computed[val]) || 0);
      });
      return headerColumnWidthDiff;
    }

    function applyColumnGroupWidths() {
      var i, len,
          columns = _grid.getColumns(),
          tmpWidth = 0,
          colGroupIdx = 0;

      _headersEl.style.width = getHeadersWidth();

      for (i = 0, len = columns.length; i < len; i++) {
        var columnWidth = parseInt(document.getElementById('slickgrid_' + _uid + columns[i].id).offsetWidth);
        var group = columns[i].group;
        tmpWidth += columnWidth;
        if (!columns[i + 1] || group !== columns[i + 1].group) {
          _headersEl.getElementsByClassName('slick-header-columns-group')[colGroupIdx++].style.width =
            tmpWidth - measureCellHorizontalPaddingAndBorder() + 'px';
          tmpWidth = 0;
        }
      }
    }

    function getHeadersWidth() {
      return document.getElementsByClassName('slick-header-columns')[0].style.width;
    }

    function createColumnGroupHeaders() {
      var i, len,
          columns = _grid.getColumns(),
          columnsGroupHtml = '';

      for (i = 0, len = columns.length; i < len; i++) {
        var group = columns[i].group;
        if (!columns[i + 1] || group !== columns[i + 1].group) {
          columnsGroupHtml += [
            '<div class="ui-state-default slick-header-columns-group">',
            '  <span class="slick-column-name">' + group + '</span>',
            '  <div class="slick-resizable-handle"></div>',
            '</div>'
          ].join('\n');
        }
      }
      _headersEl.innerHTML = columnsGroupHtml;
      applyColumnGroupWidths();
      _grid.resizeCanvas();
    }

    $.extend(this, {
      'init': init
    });
  }
})(jQuery);
