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
  let _uid, // like #slickgrid_1111111

      /** Event handler */
      _handler = new Slick.EventHandler(),

      /** Cache for a grid object and DOM elements associated with UID */
      _cache = {};

  function init(grid) {
    d('init');

    _uid = grid.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];
    _handler
      .subscribe(grid.onColumnsResized, handleColumnsResized);

    // --------------------------
    // cache grid relatives
    // --------------------------

    let cache = _cache[_uid] = {};
    cache.grid = grid;
    cache.headerScrollerEl = grid.getContainerNode().querySelector('.slick-header');
    cache.origHeadersEl = cache.headerScrollerEl.querySelector('.slick-header-columns');

    let originalColumnDef = grid.getColumns(),
        v = measureVCellPaddingAndBorder();
    cache.origHeadersEl.style.height = v.height + v.heightDiff + 'px';
    cache.origHeadersEl.style.overflow = 'visible';

    // ------------------------------
    // overwrite methods
    // ------------------------------

    // accessors
    grid.setColumns = (function(originalSetColumns) {
      return function(columnsDef) {
        d('setColumns');

        // update current target grid UID
        _uid = this.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];

        // -  columns definations
        let cache = _cache[_uid];
        cache.columnsDef = columnsDef;
        cache.innerColumnsDef = genInnerColumnsDef(columnsDef);
        cache.columnsDefByLevel = genColumnsDefByLevel(grid.getColumns());
        originalSetColumns(cache.innerColumnsDef);
        createColumnGroupHeaderRow();
        createColumnGroupHeaders();
        applyColumnGroupWidths();
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
          // update current target grid UID
          _uid = this.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];

          originalInit();

          measureHCellPaddingAndBorder = memoizeMeasureHCellPaddingAndBorder();
          grid.setColumns(originalColumnDef);
          createCssRules();
          d('grid has been initialized with EXPLICIT mode');
        };
      }(grid.init));
    } else {
      measureHCellPaddingAndBorder = memoizeMeasureHCellPaddingAndBorder();
      grid.setColumns(originalColumnDef);
      createCssRules();
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
   * @return {Number} Sum of horizontal padding and border pixels on a cell
   */
  var measureHCellPaddingAndBorder;
  function memoizeMeasureHCellPaddingAndBorder() {
    d('genMeasureCellHorizontalPaddingAndBorder');

    let headerColumnWidthDiff;

    return function() {
      d('measureHCellPaddingAndBorder');

      if (headerColumnWidthDiff != null)
        return headerColumnWidthDiff;

      let computed = window.getComputedStyle(_cache[_uid].origHeadersEl.getElementsByClassName('slick-header-column')[0]),
          h = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'];
      headerColumnWidthDiff = 0;
      h.forEach(function(val) {
        headerColumnWidthDiff += (parseFloat(computed[val]) || 0);
      });
      return headerColumnWidthDiff;
    };
  }

  /**
   * Measure a cell height and horizontal padding. (almost adapted from `measureCellPaddingAndBorder` in slick.grid.js)
   * @private
   * @returns {Object} height, and border plus padding
   */
  function measureVCellPaddingAndBorder() {

    let v = ['borderTopWidth', 'borderBottomWidth', 'paddingTop', 'paddingBottom'],
        $canvas = $(_cache[_uid].grid.getCanvasNode()),
        $r = $('<div class="slick-row" />').appendTo($canvas),
        $el = $('<div class="slick-cell" id="" style="visibility:hidden">-</div>').appendTo($r),
        height,
        heightDiff = 0;

    height = parseFloat($el.css('height'));
    v.forEach(function(val) {
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

    let cache = _cache[_uid],
        origHeadersWidth = getHeadersWidth(),
        groupHeadersEl = cache.groupHeadersEl,
        maxLevel = groupHeadersEl.length;

    for (let r = 0; r < maxLevel; r++) {
      groupHeadersEl[r].style.width = origHeadersWidth;
    }

    let hPadding = measureHCellPaddingAndBorder();
    setWidthRecursively(cache.columnsDef);
    function setWidthRecursively(columnsDef, level = 0, offsetsByLevel = {}) {
      for (let c = 0, C = columnsDef.length; c < C; c++) {
        let column = columnsDef[c],
            columnSelector = `#slickgrid_${ _uid + String(column.id).replace(/(#|,|\.)/g, '\\$1') }`,
            columnEl = cache.headerScrollerEl.querySelector(columnSelector);

        if (hasChildren(column)) {
          setWidthRecursively(column.children, level + 1, offsetsByLevel);
          let width = 0;
          for (let c2 = 0, C2 = column.children.length; c2 < C2; c2++) {
            let columnSelector = `#slickgrid_${ _uid + String(column.children[c2].id).replace(/(#|,|\.)/g, '\\$1') }`,
                columnEl = cache.headerScrollerEl.querySelector(columnSelector);
            width += columnEl.offsetWidth;
          }
          columnEl.style.width = width - hPadding + 'px';
          columnEl.style.marginLeft = offsetsByLevel[level] + 'px';
          offsetsByLevel[level] = 0;
        } else {
          for (let l = level; l < maxLevel; l++) {
            offsetsByLevel[l] = (offsetsByLevel[l] || 0) + columnEl.offsetWidth;
          }
        }
        d(column.id, level,  offsetsByLevel);
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

    let cache = _cache[_uid],
        headerScrollerEl = cache.headerScrollerEl,
        groupHeadersEl = cache.groupHeadersEl = cache.groupHeadersEl || [],
        columnsDefByLevel = cache.columnsDefByLevel;

    // destroy currents
    for (let i = 0, len = groupHeadersEl.length; i < len; i++) {
      headerScrollerEl.removeChild(cache.groupHeadersEl[i]);
    }

    // create and append newers
    let fragment = document.createDocumentFragment();
    for (let i = 0, len = columnsDefByLevel.length; i < len - 1; i++) {
      let tmp = document.createElement('div');
      tmp.innerHTML = '<div class="slick-header-columns slick-header-columns-groups" style="left: -1000px" unselectable="on"></div>';
      d('  create groupHeadersEl[%d]', i);
      groupHeadersEl[i] = tmp.childNodes[0];
      fragment.appendChild(groupHeadersEl[i]);
    }
    headerScrollerEl.insertBefore(fragment, cache.headerScrollerEl.firstChild);
  }

  /**
   * Create column group header elements
   */
  function createColumnGroupHeaders() {
    d('createColumnGroupHeaders');

    let cache = _cache[_uid],
        columnsDefByLevel = cache.columnsDefByLevel;

    for (let r = 0, R = cache.groupHeadersEl.length; r < R; r++) {
      let toCreateColumnsDef = columnsDefByLevel[r],
          columnsGroupHtml = '';

      for (let c = 0, C = toCreateColumnsDef.length; c < C; c++) {
        let column = toCreateColumnsDef[c];

        if (hasChildren(column)) {
          // the column which have children has a role for showing column name
          columnsGroupHtml += `
<div class="ui-state-default slick-header-column slick-header-columns-group ${ column.headerCssClass }"
  id="slickgrid_${ _uid + column.id }"
  title="${ column.toolTip }">
  <span class="slick-column-name">${ hasChildren(column) ? (column.name || '') : '' }</span>
</div>`;
          d('  create a "%s" cell in groupHeadersEl[%d]', column.id, r);
        } else {
          // the column which have no children is a tip column
          let tipColumn = cache.origHeadersEl.querySelector(`#slickgrid_${ _uid + String(column.id).replace(/(#|,|\.)/g, '\\$1') }`);
          tipColumn.className += ' h' + (columnsDefByLevel.length - r);
        }
      }
      cache.groupHeadersEl[r].innerHTML = columnsGroupHtml;
    }

    // // for horizontal scroll bar
    cache.grid.resizeCanvas();
  }

  /**
   * Create CSS rules for header's rowspan style, with
   * `style` element which will be appended to `head` element.
   */
  function createCssRules() {
    // create style rules
    let cache = _cache[_uid],
        v = measureVCellPaddingAndBorder(),
        rules = ['.hidden {visibility: hidden;}'],
        maxLevel = cache.columnsDefByLevel.length;

    for (let i = 1; i <= maxLevel; i++) {
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

    for (let i = 0, len = columns.length; i < len; i++) {
      let column = columns[i];
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

    for (let i = 0, len = columns.length; i < len; i++) {
      let column = columns[i];
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
      Object.prototype.toString.apply(column.children) === '[object Array]' ||
      false;
  }

  $.extend(this, {
    init
  });
}
