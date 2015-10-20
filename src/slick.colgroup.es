/**
 * https://github.com/keik/slickgrid-colgroup-plugin
 * @version $VERSION
 * @author keik <k4t0.kei@gmail.com>
 * @license MIT
 */

let d = require('debug')('slickgrid-colgroup-plugin');

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
  d('Constructor');

  /*
   * DOM elements structure:
   *
   * `headerScroller`  (selector: .slick-header)
   *   `groupHeadesEl` (selector: .slick-header-columns.slick-header-columns-groups)
   *      [column...]  (selector: .slick-header-column.slick-header-columns-group)
   *   `origHeadersEl` (selector: .slick-header-columns)
   *      [column...]  (selector: .slick-header-column)
   */

  /** UID of a current target grid. this would be side-effected */
  let _uid,
      _handler = new Slick.EventHandler(),

      /** cache for a grid object and DOM elements associated with UID */
      _cache = {};

  function init(grid) {
    d('init');

    _uid = grid.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];
    _handler
      .subscribe(grid.onColumnsResized, handleColumnsResized);
    _cache[_uid] = {};
    _cache[_uid].grid = grid;
    _cache[_uid].headerScrollerEl = grid.getContainerNode().getElementsByClassName('slick-header')[0];
    _cache[_uid].origHeadersEl = _cache[_uid].headerScrollerEl.getElementsByClassName('slick-header-columns')[0];
    _cache[_uid].columnsDef = grid.getColumns();
    _cache[_uid].innerColumnsDef = genInnerColumnsDef(_cache[_uid].columnsDef);
    _cache[_uid].columnsDefByLevel = genColumnsDefByLevel(grid.getColumns());
    _cache[_uid].grid.setColumns(_cache[_uid].innerColumnsDef);

    // ------------------------------
    // overwrite methods
    // ------------------------------

    // accessors
    grid.setColumns = (function(originalSetColumns) {
      return function(columnsDef) {
        d('setColumns');

        // update current target grid UID
        _uid = this.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];

        _cache[_uid].columnsDef = columnsDef;
        _cache[_uid].innerColumnsDef = genInnerColumnsDef(columnsDef);
        originalSetColumns(_cache[_uid].innerColumnsDef);
        createColumnGroupHeaders();
      };
    }(grid.setColumns));

    grid.getColumns = (function(originalGetColumns) {
      return function() {
        d('getColumns');

        return _cache[_uid].columnsDef;
      };
    }(grid.getColumns));

    // no event fired when `autosizeColumns` called, so follow it by advicing below methods with column group resizing.
    ['invalidate', 'render'].forEach(function(fnName) {
      grid[fnName] = (function(origFn) {
        return function() {
          origFn(arguments);
          applyColumnGroupWidths();
        };
      }(grid[fnName]));
    });

    // ------------------------------
    // initializing advices
    // ------------------------------

    // depending on grid option `explicitInitialization`, change a timing of column group creation.
    if (grid.getOptions()['explicitInitialization']) {
      // grid are not yet rendered, so advice for `grid.init` with column group creation.
      grid.init = (function(originalInit) {
        return function() {
          originalInit();
          createColumnGroupHeaderRow();
          createColumnGroupHeaders();
          d('grid has been initialized with EXPLICIT mode');
        };
      }(grid.init));
    } else {
      createColumnGroupHeaderRow();
      createColumnGroupHeaders();
      d('grid has been initialized with IMPLICIT mode');
    }
  }

  function handleColumnsResized() {
    d('handleColumnsResized');

    applyColumnGroupWidths();
  }

  function measureCellHorizontalPaddingAndBorder() {
    d('measureCellHorizontalPaddingAndBorder');

    let computed = window.getComputedStyle(_cache[_uid].origHeadersEl.getElementsByClassName('slick-header-column')[0]);
    let headerColumnWidthDiff = 0;
    ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].forEach(function(val) {
      headerColumnWidthDiff += (parseFloat(computed[val]) || 0);
    });
    return headerColumnWidthDiff;
  }

  function applyColumnGroupWidths() {
    d('applyColumnGroupWidths');

    let i, len,
        columns = _cache[_uid].grid.getColumns(),
        tmpWidth = 0,
        colGroupIdx = 0;

    for (i = 0, len = _cache[_uid].groupHeadersEl.length; i < len; i++) {
      _cache[_uid].groupHeadersEl[i].style.width = getHeadersWidth();
    }
    // for (i = 0, len = columns.length; i < len; i++) {
    //   let columnWidth = parseInt(document.getElementById(`slickgrid_${ _uid + columns[i].id }`).offsetWidth, 10);
    //   let group = columns[i].group;
    //   tmpWidth += columnWidth;
    //   if (!columns[i + 1] || group !== columns[i + 1].group) {
    //     _cache[_uid].groupHeadersEl[0 /*TODO*/].getElementsByClassName('slick-header-columns-group')[colGroupIdx++].style.width =
    //       tmpWidth - measureCellHorizontalPaddingAndBorder() + 'px';
    //     tmpWidth = 0;
    //   }
    // }
  }

  function getHeadersWidth() {
    d('getHeadersWidth');

    return _cache[_uid].origHeadersEl.style.width;
  }

  function createColumnGroupHeaderRow() {
    d('createColumnGroupHeaderRow');

    _cache[_uid].groupHeadersEl = [];
    let columnsDefByLevel = _cache[_uid].columnsDefByLevel,
        fragment = document.createDocumentFragment();
    for (let i = 0, len = columnsDefByLevel.length; i < len - 1; i++) {
      let tmp = document.createElement('div');
      tmp.innerHTML = '<div class="slick-header-columns slick-header-columns-groups" style="left: -1000px" unselectable="on"></div>';
      d('  create groupHeadersEl[%d]', i);
      _cache[_uid].groupHeadersEl[i] = tmp.childNodes[0];
      fragment.appendChild(_cache[_uid].groupHeadersEl[i]);
    }
    _cache[_uid].headerScrollerEl.insertBefore(fragment, _cache[_uid].headerScrollerEl.firstChild);
  }

  function createColumnGroupHeaders() {
    d('createColumnGroupHeaders');

    let r, R, c, C,
        columnsDefByLevel = _cache[_uid].columnsDefByLevel;

    for (r = 0, R = columnsDefByLevel.length; r < R - 1; r++) {
      let columns = columnsDefByLevel[r],
          columnsGroupHtml = '';
      for (c = 0, C = columns.length; c < C; c++) {
        columnsGroupHtml += `
<div class="ui-state-default slick-header-column slick-header-columns-group">
  <span class="slick-column-name">${ columns[c].name }</span>
  <div class="slick-resizable-handle"></div>
</div>`;
      }
      d('  create groupHeadersEl[%d] with %s', r, columnsGroupHtml);

      _cache[_uid].groupHeadersEl[r].innerHTML = columnsGroupHtml;
    }
    applyColumnGroupWidths();

    // for horizontal scroll bar
    _cache[_uid].grid.resizeCanvas();
  }

  function genColumnsDefByLevel(columns, depth = 0, acc = []) {
    if (depth === 0) d('genColumnsDefByLevel (recursive)');

    for (var i = 0, len = columns.length; i < len; i++) {
      var column = columns[i];
      acc[depth] = acc[depth] || [];
      acc[depth].push(column);
      if (Object.prototype.toString.apply(column.children) === '[object Array]') {
        genColumnsDefByLevel(column.children, depth + 1, acc);
      }
    }
    return acc;
  }

  function genInnerColumnsDef(columns, acc = [], first = true /* DEV */) {
    if (first) d('genInnerColumnsDef (recursive)');

    for (var i = 0, len = columns.length; i < len; i++) {
      var column = columns[i];
      if (column.children == null) {
        acc.push(column);
      } else if (Object.prototype.toString.apply(column.children) === '[object Array]') {
        genInnerColumnsDef(column.children, acc, false /* DEV */);
      }
    }
    return acc;
  }

  $.extend(this, {
    init
  });
}
