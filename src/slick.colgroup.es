/**
 * https://github.com/keik/slickgrid-colgroup-plugin
 * @version $VERSION
 * @author keik <k4t0.kei@gmail.com>
 * @license MIT
 */

let d = require('debug')('slickgrid-colgroup-plugin');
localStorage.debug = '*';

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
 * To specify a colmun group, extend the column definition to add `children`
 * property with array value, like so:
 *
 *   var columns = [
 *     {id: 'col1', name: 'col 1', children: [
 *       {id: 'col1-1', name: 'col 1-1', field: 'col1-1'},
 *       {id: 'col1-2', name: 'col 1-2', field: 'col1-2'}
 *     ]},
 *     {id: 'col2', name: 'col 2', children: [
 *       {id: 'col2-1', name: 'col 2-1', field: 'col2-1'},
 *       {id: 'col2-2', name: 'col 2-2', children: [
 *         {id: 'col2-2-1', name: 'col 2-2-1', field: 'col2-2-1'},
 *         {id: 'col2-2-2', name: 'col 2-2-2', field: 'col2-2-2'}
 *       ]}
 *     ]}
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
   *   `groupHeadersEl` (selector: .slick-header-columns.slick-header-columns-groups)
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
    let v = measureVCellPaddingAndBorder();
    _cache[_uid].origHeadersEl.style.height = v.height + v.heightDiff + 'px';
    _cache[_uid].origHeadersEl.style.overflow = 'visible';
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
        _cache[_uid].columnsDefByLevel = genColumnsDefByLevel(grid.getColumns());
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
          measureCellHorizontalPaddingAndBorder = memoizeMeasureCellHorizontalPaddingAndBorder();
          createCssRules();
          createColumnGroupHeaderRow();
          createColumnGroupHeaders();
          d('grid has been initialized with EXPLICIT mode');
        };
      }(grid.init));
    } else {
      measureCellHorizontalPaddingAndBorder = memoizeMeasureCellHorizontalPaddingAndBorder();
      createCssRules();
      createColumnGroupHeaderRow();
      createColumnGroupHeaders();
      d('grid has been initialized with IMPLICIT mode');
    }
  }

  /**
   * A Handler for onColumnsResized event.
   */
  function handleColumnsResized() {
    d('handleColumnsResized');

    applyColumnGroupWidths();
  }

  /**
   * Return horizontal padding and border pixels on a cell.
   * @return {Number} Horizontal padding and border pixels on a cell
   */
  var measureCellHorizontalPaddingAndBorder;
  function memoizeMeasureCellHorizontalPaddingAndBorder() {
    d('genMeasureCellHorizontalPaddingAndBorder');

    let headerColumnWidthDiff;

    return function() {
      d('measureCellHorizontalPaddingAndBorder');

      if (headerColumnWidthDiff)
        return headerColumnWidthDiff;

      let computed = window.getComputedStyle(_cache[_uid].origHeadersEl.getElementsByClassName('slick-header-column')[0]);
      headerColumnWidthDiff = 0;
      ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].forEach(function(val) {
        headerColumnWidthDiff += (parseFloat(computed[val]) || 0);
      });
      return headerColumnWidthDiff;
    };
  }

  /**
   * Measure a cell height and horizontal padding. (almost adapted from `measureCellPaddingAndBorder` in slick.grid.js)
   * @private
   * @returns {undefined} undefined
   */
  function measureVCellPaddingAndBorder() {

    let v = ['borderTopWidth', 'borderBottomWidth', 'paddingTop', 'paddingBottom'],
        $canvas = $(_cache[_uid].grid.getCanvasNode()),
        $r = $('<div class="slick-row" />').appendTo($canvas),
        $el = $('<div class="slick-cell" id="" style="visibility:hidden">-</div>').appendTo($r);

    let height,
        heightDiff = 0;

    height = parseFloat($el.css('height'));
    $.each(v, function(n, val) {
      heightDiff += parseFloat($el.css(val)) || 0;
    });
    $r.remove();

    return {height, heightDiff};
  } // _measureVCellPaddingAndBorder

  /**
   * Apply column group header's widths.
   */
  function applyColumnGroupWidths() {
    d('applyColumnGroupWidths');

    let origHeadersEl = _cache[_uid].origHeadersEl,
        columnsDefByLevel = _cache[_uid].columnsDefByLevel,
        origHeadersWidth = getHeadersWidth(),
        groupHeadersEl = _cache[_uid].groupHeadersEl,
        colGroupDepth = groupHeadersEl.length;

    for (let r = 0; r < colGroupDepth; r++) {
      groupHeadersEl[r].style.width = origHeadersWidth;
    }

    let columnsDef = _cache[_uid].columnsDef;

    setWidthRecursively(columnsDef);
    function setWidthRecursively(columnsDef, depth = 0, colIdx = []) {
      for (let c = 0, C = columnsDef.length; c < C; c++) {
        // update index in the depth
        colIdx[depth] = (colIdx[depth] == null ? 0 : colIdx[depth] + 1);

        let width = -measureCellHorizontalPaddingAndBorder();
        let column = columnsDef[c];
        if (column.children && column.children.length > 0) {
          // process children at first
          setWidthRecursively(column.children, depth + 1, colIdx);
          if (depth < colGroupDepth - 1) {
            for (let c2 = 0, C2 = column.children.length; c2 < C2; c2++) {
              width += parseInt(groupHeadersEl[depth + 1].children[columnsDefByLevel[depth + 1].indexOf(column.children[c2])].offsetWidth, 10);
            }
            groupHeadersEl[depth].children[c].style.width = width + 'px';
          } else {
            for (let c2 = 0, C2 = column.children.length; c2 < C2; c2++) {
              width += parseInt(origHeadersEl.querySelector(`#slickgrid_${ _uid + column.children[c2].id }`).offsetWidth, 10);
            }
            groupHeadersEl[depth].children[columnsDefByLevel[depth].indexOf(column)].style.width = width + 'px';
          }

        } else if (depth < colGroupDepth) {
          // process the tip
          width += parseInt(origHeadersEl.querySelector(`#slickgrid_${ _uid + column.id }`).offsetWidth, 10);
          groupHeadersEl[depth].children[colIdx[depth]].style.width = width + 'px';
        }
      }
    }
  } // applyColumnGroupWidths

  /**
   * Return headers width
   * @returns {String} String for headers width style
   */
  function getHeadersWidth() {
    d('getHeadersWidth');

    return _cache[_uid].origHeadersEl.style.width;
  }

  /**
   * Create column group header row elements
   */
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

  /**
   * Create column group header elements
   */
  function createColumnGroupHeaders() {
    d('createColumnGroupHeaders');

    let r, R, c, C,
        columnsDefByLevel = _cache[_uid].columnsDefByLevel;

    for (r = 0, R = columnsDefByLevel.length; r < R - 1; r++) {
      let columns = columnsDefByLevel[r],
          columnsGroupHtml = '';
      for (c = 0, C = columns.length; c < C; c++) {
        let column = columns[c];
        columnsGroupHtml += `
<div class="ui-state-default slick-header-column slick-header-columns-group">
  <span class="slick-column-name">${ hasChildren(column) ? column.name : '' }</span>
</div>`;
        // apply CSS rule for rowspan to tip
        if (!hasChildren(column)) {
          let headersEl = _cache[_uid].origHeadersEl;
          let tipColumn = headersEl.querySelector(`#slickgrid_${ _uid + column.id }`);
          tipColumn.className += ' h' + (columnsDefByLevel.length - r);
        }
      }
      d('  create groupHeadersEl[%d]', r);

      _cache[_uid].groupHeadersEl[r].innerHTML = columnsGroupHtml;
    }
    applyColumnGroupWidths();

    // for horizontal scroll bar
    _cache[_uid].grid.resizeCanvas();
  }

  /**
   * Create CSS rules for header's rowspan style, with
   * `style` element which will be appended to `head` element.
   */
  function createCssRules() {
    // create style rules
    let v = measureVCellPaddingAndBorder();
    let rules = ['.hidden {visibility: hidden;}'];

    let maxrow = 30; // TODO to be intelligent
    for (let i = 0; i < maxrow; i++) {
      rules.push(`
.slick-header-column.h${ i } {
  margin: ${ (1 - i) * (v.height + v.heightDiff) }px 0 0 0;
  font-size: inherit;
  height: ${ i * (v.height + v.heightDiff) - v.heightDiff * 2 + 1 }px;
}`);
    }

    let styleEl = $('<style type="text/css" rel="stylesheet" />').appendTo($('head'))[0];
    if (styleEl.styleSheet) { // IE
      styleEl.styleSheet.cssText = rules.join(' ');
    } else {
      styleEl.appendChild(document.createTextNode(rules.join(' ')));
    }
  } // _createCssRules

  function genColumnsDefByLevel(columns, depth = 0, acc = []) {
    if (depth === 0) d('genColumnsDefByLevel (recursive)');

    for (var i = 0, len = columns.length; i < len; i++) {
      var column = columns[i];
      acc[depth] = acc[depth] || [];
      acc[depth].push(column);
      if (hasChildren(column)) {
        genColumnsDefByLevel(column.children, depth + 1, acc);
      }
    }
    return acc;
  }

  /**
   * Create the flatten array of column definations for original `Slick.Grid#setColumn`,
   * from structured column definations.
   * @param {Array.<Object>} columns structured column definations
   * @returns {Array.<Object>} Array of column definations
   */
  function genInnerColumnsDef(columns, acc = [], first = true) {
    if (first) d('genInnerColumnsDef (recursive)');

    for (var i = 0, len = columns.length; i < len; i++) {
      var column = columns[i];
      if (!hasChildren(column)) {
        acc.push(column);
      } else {
        genInnerColumnsDef(column.children, acc, false);
      }
    }
    return acc;
  }

  /**
   * Determine whether the column has children.
   * @param {Object} column defination
   * @returns {Boolean} has children or not
   */
  function hasChildren(column) {
    return column.children &&
      column.children.length > 0 &&
      Object.prototype.toString.apply(column.children) === '[object Array]';
  }

  $.extend(this, {
    init
  });
}
