(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * https://github.com/keik/slickgrid-colgroup-plugin
 * @version v0.1.2
 * @author keik <k4t0.kei@gmail.com>
 * @license MIT
 */

// register namespace
'use strict';

$.extend(true, window, {
  Slick: {
    Plugins: {
      ColGroup: ColGroup
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
  var _uid = undefined,
      _handler = new Slick.EventHandler(),

  /** cache for a grid object and DOM elements associated with UID */
  _cache = {};

  function init(grid) {
    _uid = grid.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];
    _handler.subscribe(grid.onColumnsResized, handleColumnsResized);
    _cache[_uid] = {};
    _cache[_uid].grid = grid;
    _cache[_uid].headerScrollerEl = grid.getContainerNode().getElementsByClassName('slick-header')[0];
    _cache[_uid].origHeadersEl = _cache[_uid].headerScrollerEl.getElementsByClassName('slick-header-columns')[0];

    grid.setColumns = (function (originalSetColumns) {
      return function (columnDefinitions) {
        // update current target grid UID
        _uid = this.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];

        originalSetColumns(columnDefinitions);
        createColumnGroupHeaders();
      };
    })(grid.setColumns);

    // no event fired when `autosizeColumns` called, so follow it by advicing below methods with column group resizing.
    ['invalidate', 'render'].forEach(function (fnName) {
      grid[fnName] = (function (origFn) {
        return function () {
          origFn(arguments);
          applyColumnGroupWidths();
        };
      })(grid[fnName]);
    });

    // depending on grid option `explicitInitialization`, change a timing of column group creation.
    if (grid.getOptions()['explicitInitialization']) {
      // grid are not yet rendered, so advice for `grid.init` with column group creation.
      grid.init = (function (originalInit) {
        return function () {
          originalInit();
          createColumnGroupHeaderRow();
          createColumnGroupHeaders();
        };
      })(grid.init);
    } else {
      // grid are already rendered, so create immidiately.
      createColumnGroupHeaderRow();
      createColumnGroupHeaders();
    }
  }

  function handleColumnsResized() {
    applyColumnGroupWidths();
  }

  function measureCellHorizontalPaddingAndBorder() {
    var computed = window.getComputedStyle(_cache[_uid].origHeadersEl.getElementsByClassName('slick-header-column')[0]);
    var headerColumnWidthDiff = 0;
    ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].forEach(function (val) {
      headerColumnWidthDiff += parseFloat(computed[val]) || 0;
    });
    return headerColumnWidthDiff;
  }

  function applyColumnGroupWidths() {
    var i = undefined,
        len = undefined,
        columns = _cache[_uid].grid.getColumns(),
        tmpWidth = 0,
        colGroupIdx = 0;

    _cache[_uid].groupHeadersEl.style.width = getHeadersWidth();

    for (i = 0, len = columns.length; i < len; i++) {
      var columnWidth = parseInt(document.getElementById('slickgrid_' + (_uid + columns[i].id)).offsetWidth, 10);
      var group = columns[i].group;
      tmpWidth += columnWidth;
      if (!columns[i + 1] || group !== columns[i + 1].group) {
        _cache[_uid].groupHeadersEl.getElementsByClassName('slick-header-columns-group')[colGroupIdx++].style.width = tmpWidth - measureCellHorizontalPaddingAndBorder() + 'px';
        tmpWidth = 0;
      }
    }
  }

  function getHeadersWidth() {
    return _cache[_uid].origHeadersEl.style.width;
  }

  function createColumnGroupHeaderRow() {
    var tmp = document.createElement('div');
    tmp.innerHTML = '<div class="slick-header-columns slick-header-columns-groups" style="left: -1000px" unselectable="on"></div>';
    _cache[_uid].groupHeadersEl = tmp.childNodes[0];
    _cache[_uid].headerScrollerEl.insertBefore(_cache[_uid].groupHeadersEl, _cache[_uid].headerScrollerEl.firstChild);
  }

  function createColumnGroupHeaders() {
    var i = undefined,
        len = undefined,
        columns = _cache[_uid].grid.getColumns(),
        columnsGroupHtml = '';

    for (i = 0, len = columns.length; i < len; i++) {
      var group = columns[i].group;
      if (!columns[i + 1] || group !== columns[i + 1].group) {
        columnsGroupHtml += '<div class="ui-state-default slick-header-column slick-header-columns-group">\n             <span class="slick-column-name">' + group + '</span>\n             <div class="slick-resizable-handle"></div>\n           </div>';
      }
    }
    _cache[_uid].groupHeadersEl.innerHTML = columnsGroupHtml;
    applyColumnGroupWidths();

    // for horizontal scroll bar
    _cache[_uid].grid.resizeCanvas();
  }

  $.extend(this, {
    init: init
  });
}

},{}]},{},[1]);
