/**
 * https://github.com/keik/slickgrid-colgroup-plugin
 * @version $VERSION
 * @author keik <k4t0.kei@gmail.com>
 * @license MIT
 */

// register namespace
$.extend(true, window, {
  Slick: {
    Plugins: {
      ColGroup
    }
  }
});

/**
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
  let _grid,
      _uid,
      _handler = new Slick.EventHandler(),

      /*
       * DOM elements structure
       * _headerScroller
       *   _origHeadersEl
       *   _groupHeadesEl
       */
      _headerScrollerEl,
      _groupHeadersEl,
      _origHeadersEl;


  function init(grid) {
    _grid = grid;
    _uid = _grid.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];
    _handler
      .subscribe(_grid.onColumnsResized, handleColumnsResized);
    _headerScrollerEl = _grid.getContainerNode().getElementsByClassName('slick-header')[0];
    _origHeadersEl = document.getElementsByClassName('slick-header-columns')[0];

    _grid.setColumns = (function(originalSetColumns) {
      return function(columnDefinitions) {
        originalSetColumns(columnDefinitions);
        createColumnGroupHeaders();
      };
    }(_grid.setColumns));

    // depending on grid option `explicitInitialization`, change a timing of column group creation.
    if (grid.getOptions()['explicitInitialization']) {
      // grid are not yet rendered, so advice for `_grid.init` with column group creation.
      _grid.init = (function(originalInit) {
        return function() {
          originalInit();
          createColumnGroupHeaderRow();
          createColumnGroupHeaders();
        };
      }(_grid.init));
    } else {
      // grid are already rendered, so create immidiately.
      createColumnGroupHeaderRow();
      createColumnGroupHeaders();
    }

    _grid.resizeCanvas();
  }

  function handleColumnsResized() {
    applyColumnGroupWidths();
  }

  function measureCellHorizontalPaddingAndBorder() {
    let computed = window.getComputedStyle(_origHeadersEl.getElementsByClassName('slick-header-column')[0]);
    let headerColumnWidthDiff = 0;
    ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].forEach(function(val) {
      headerColumnWidthDiff += (parseFloat(computed[val]) || 0);
    });
    return headerColumnWidthDiff;
  }

  function applyColumnGroupWidths() {
    let i, len,
        columns = _grid.getColumns(),
        tmpWidth = 0,
        colGroupIdx = 0;

    _groupHeadersEl.style.width = getHeadersWidth();

    for (i = 0, len = columns.length; i < len; i++) {
      let columnWidth = parseInt(document.getElementById(`slickgrid_${ _uid + columns[i].id }`).offsetWidth, 10);
      let group = columns[i].group;
      tmpWidth += columnWidth;
      if (!columns[i + 1] || group !== columns[i + 1].group) {
        _groupHeadersEl.getElementsByClassName('slick-header-columns-group')[colGroupIdx++].style.width =
          tmpWidth - measureCellHorizontalPaddingAndBorder() + 'px';
        tmpWidth = 0;
      }
    }
  }

  function getHeadersWidth() {
    return _origHeadersEl.style.width;
  }

  function createColumnGroupHeaderRow() {
    let tmp = document.createElement('div');
    tmp.innerHTML = '<div class="slick-header-columns slick-header-columns-groups" style="left: -1000px" unselectable="on"></div>';
    _groupHeadersEl = tmp.childNodes[0];
    _headerScrollerEl.insertBefore(_groupHeadersEl, _headerScrollerEl.firstChild);
  }

  function createColumnGroupHeaders() {
    let i, len,
        columns = _grid.getColumns(),
        columnsGroupHtml = '';

    for (i = 0, len = columns.length; i < len; i++) {
      let group = columns[i].group;
      if (!columns[i + 1] || group !== columns[i + 1].group) {
        columnsGroupHtml +=
          `<div class="ui-state-default slick-header-column slick-header-columns-group">
             <span class="slick-column-name">${ group }</span>
             <div class="slick-resizable-handle"></div>
           </div>`;
      }
    }
    _groupHeadersEl.innerHTML = columnsGroupHtml;
    applyColumnGroupWidths();
  }

  $.extend(this, {
    init
  });
}
