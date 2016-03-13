(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';    /**
 * https://github.com/keik/slickgrid-colgroup-plugin
 * @version v1.1.0
 * @author keik <k4t0.kei@gmail.com>
 * @license MIT
 */
// register namespace
$.extend(true, window, { Slick: { Plugins: { ColGroup: ColGroup } } });
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
    var _uid = void 0,
        // like #slickgrid_1111111
        /** Event handler */
        _handler = new Slick.EventHandler(),
        /** Cache for a grid object and DOM elements associated with UID */
        _cache = {};
    function init(grid) {
        _uid = grid.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];
        _handler.subscribe(grid.onColumnsResized, handleColumnsResized);
        // --------------------------
        // cache grid relatives
        // --------------------------
        var cache = _cache[_uid] = {};
        cache.grid = grid;
        cache.headerScrollerEl = grid.getContainerNode().querySelector('.slick-header');
        cache.origHeadersEl = cache.headerScrollerEl.querySelector('.slick-header-columns');
        var originalColumnDef = grid.getColumns(), v = measureVCellPaddingAndBorder();
        cache.origHeadersEl.style.height = v.height + v.heightDiff + 'px';
        cache.origHeadersEl.style.overflow = 'visible';
        // ------------------------------
        // overwrite methods
        // ------------------------------
        // accessors
        grid.setColumns = function (originalSetColumns) {
            return function (columnsDef) {
                // update current target grid UID
                _uid = this.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];
                // -  columns definations
                var cache = _cache[_uid];
                cache.columnsDef = columnsDef;
                cache.innerColumnsDef = genInnerColumnsDef(columnsDef);
                cache.columnsDefByLevel = genColumnsDefByLevel(grid.getColumns());
                originalSetColumns(cache.innerColumnsDef);
                createColumnGroupHeaderRow();
                createColumnGroupHeaders();
                applyColumnGroupWidths();
            };
        }(grid.setColumns);
        grid.getColumns = function () {
            return _cache[_uid].columnsDef;
        };
        // no event fired when `autosizeColumns` called, so follow it by advicing below methods with column group resizing.
        [
            'invalidate',
            'render'
        ].forEach(function (fnName) {
            grid[fnName] = function (origFn) {
                return function () {
                    origFn(arguments);
                    applyColumnGroupWidths();
                };
            }(grid[fnName]);
        });
        // ------------------------------
        // initializing advices
        // ------------------------------
        // depending on grid option `explicitInitialization`, change a timing of column group creation.
        if (grid.getOptions()['explicitInitialization']) {
            // grid are not yet rendered, so advice for `grid.init` with column group creation.
            grid.init = function (originalInit) {
                return function () {
                    // update current target grid UID
                    _uid = this.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];
                    originalInit();
                    measureHCellPaddingAndBorder = memoizeMeasureHCellPaddingAndBorder();
                    grid.setColumns(originalColumnDef);
                    createCssRules();
                };
            }(grid.init);
        } else {
            measureHCellPaddingAndBorder = memoizeMeasureHCellPaddingAndBorder();
            grid.setColumns(originalColumnDef);
            createCssRules();
        }
    }
    /**
   * A Handler for onColumnsResized event.
   */
    function handleColumnsResized() {
        applyColumnGroupWidths();
    }
    /**
   * Return horizontal padding and border pixels on a cell.
   * @return {Number} Sum of horizontal padding and border pixels on a cell
   */
    var measureHCellPaddingAndBorder;
    function memoizeMeasureHCellPaddingAndBorder() {
        var headerColumnWidthDiff = void 0;
        return function () {
            if (headerColumnWidthDiff != null)
                return headerColumnWidthDiff;
            var h = [
                    'paddingLeft',
                    'paddingRight',
                    'borderLeftWidth',
                    'borderRightWidth'
                ], $r = $(_cache[_uid].origHeadersEl), $el = $('<div class="ui-state-default slick-header-column" id="" style="visibility:hidden">-</div>').appendTo($r), widthDiff = 0;
            h.forEach(function (val) {
                widthDiff += parseFloat($el.css(val)) || 0;
            });
            $el.remove();
            headerColumnWidthDiff = widthDiff;
            return headerColumnWidthDiff;
        };
    }
    /**
   * Measure a cell height and horizontal padding. (almost adapted from `measureCellPaddingAndBorder` in slick.grid.js)
   * @private
   * @returns {Object} height, and border plus padding
   */
    function measureVCellPaddingAndBorder() {
        var v = [
                'borderTopWidth',
                'borderBottomWidth',
                'paddingTop',
                'paddingBottom'
            ], $canvas = $(_cache[_uid].grid.getCanvasNode()), $r = $('<div class="slick-row" />').appendTo($canvas), $el = $('<div class="slick-cell" id="" style="visibility:hidden">-</div>').appendTo($r), height = void 0, heightDiff = 0;
        height = parseFloat($el.css('height'));
        v.forEach(function (val) {
            heightDiff += parseFloat($el.css(val)) || 0;
        });
        $r.remove();
        return {
            height: height,
            heightDiff: heightDiff
        };
    }
    // _measureVCellPaddingAndBorder
    /**
   * Apply column group header's widths.
   */
    function applyColumnGroupWidths() {
        var cache = _cache[_uid], origHeadersWidth = getHeadersWidth(), groupHeadersEl = cache.groupHeadersEl, maxLevel = groupHeadersEl.length;
        for (var r = 0; r < maxLevel; r++) {
            groupHeadersEl[r].style.width = origHeadersWidth;
        }
        var hPadding = measureHCellPaddingAndBorder();
        setWidthRecursively(cache.columnsDef);
        function setWidthRecursively(columnsDef) {
            var level = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
            var offsetsByLevel = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
            for (var c = 0, C = columnsDef.length; c < C; c++) {
                var column = columnsDef[c], columnSelector = '#slickgrid_' + (_uid + String(column.id).replace(/(#|,|\.)/g, '\\$1')), columnEl = cache.headerScrollerEl.querySelector(columnSelector);
                if (hasChildren(column)) {
                    setWidthRecursively(column.children, level + 1, offsetsByLevel);
                    var width = 0;
                    for (var c2 = 0, C2 = column.children.length; c2 < C2; c2++) {
                        var _columnSelector = '#slickgrid_' + (_uid + String(column.children[c2].id).replace(/(#|,|\.)/g, '\\$1')), _columnEl = cache.headerScrollerEl.querySelector(_columnSelector);
                        width += _columnEl.offsetWidth;
                    }
                    columnEl.style.width = width - hPadding + 'px';
                    columnEl.style.marginLeft = (offsetsByLevel[level] || 0) + 'px';
                    offsetsByLevel[level] = 0;
                } else {
                    for (var l = level; l < maxLevel; l++) {
                        offsetsByLevel[l] = (offsetsByLevel[l] || 0) + columnEl.offsetWidth;
                    }
                }
            }
        }
    }
    // applyColumnGroupWidths
    /**
   * Return headers width
   * @returns {String} String for headers width style
   */
    function getHeadersWidth() {
        return _cache[_uid].origHeadersEl.style.width;
    }
    /**
   * Create column group header row elements
   */
    function createColumnGroupHeaderRow() {
        var cache = _cache[_uid], headerScrollerEl = cache.headerScrollerEl, groupHeadersEl = cache.groupHeadersEl = cache.groupHeadersEl || [], columnsDefByLevel = cache.columnsDefByLevel;
        // destroy currents
        for (var i = 0, len = groupHeadersEl.length; i < len; i++) {
            headerScrollerEl.removeChild(cache.groupHeadersEl[i]);
        }
        // create and append newers
        var fragment = document.createDocumentFragment();
        for (var _i = 0, _len = columnsDefByLevel.length; _i < _len - 1; _i++) {
            var tmp = document.createElement('div');
            tmp.innerHTML = '<div class="slick-header-columns slick-header-columns-groups" style="left: -1000px" unselectable="on"></div>';
            groupHeadersEl[_i] = tmp.childNodes[0];
            fragment.appendChild(groupHeadersEl[_i]);
        }
        headerScrollerEl.insertBefore(fragment, cache.headerScrollerEl.firstChild);
    }
    /**
   * Create column group header elements
   */
    function createColumnGroupHeaders() {
        var cache = _cache[_uid], columnsDefByLevel = cache.columnsDefByLevel;
        for (var r = 0, R = cache.groupHeadersEl.length; r < R; r++) {
            var toCreateColumnsDef = columnsDefByLevel[r], columnsGroupHtml = '';
            for (var c = 0, C = toCreateColumnsDef.length; c < C; c++) {
                var column = toCreateColumnsDef[c];
                if (hasChildren(column)) {
                    // the column which have children has a role for showing column name
                    columnsGroupHtml += '\n<div class="ui-state-default slick-header-column slick-header-columns-group ' + (column.headerCssClass || '') + '"\n  id="slickgrid_' + (_uid + column.id) + '"\n  title="' + column.toolTip + '">\n  <span class="slick-column-name">' + (hasChildren(column) ? column.name || '' : '') + '</span>\n</div>';
                } else {
                    // the column which have no children is a tip column
                    var tipColumn = cache.origHeadersEl.querySelector('#slickgrid_' + (_uid + String(column.id).replace(/(#|,|\.)/g, '\\$1')));
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
        var cache = _cache[_uid], v = measureVCellPaddingAndBorder(), rules = ['.hidden {visibility: hidden;}'], maxLevel = cache.columnsDefByLevel.length;
        for (var i = 1; i <= maxLevel; i++) {
            rules.push('\n.slick-header-column.h' + i + ' {\n  margin: ' + (1 - i) * (v.height + v.heightDiff) + 'px 0 0 0;\n  font-size: inherit;\n  height: ' + (i * (v.height + v.heightDiff) - v.heightDiff * 2 + 1) + 'px;\n}');
        }
        var styleEl = $('<style type="text/css" rel="stylesheet" />').appendTo($('head'))[0];
        if (styleEl.styleSheet) {
            // IE
            styleEl.styleSheet.cssText = rules.join(' ');
        } else {
            styleEl.appendChild(document.createTextNode(rules.join(' ')));
        }
    }
    // _createCssRules
    function genColumnsDefByLevel(columns) {
        var depth = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
        var acc = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
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
    function genInnerColumnsDef(columns) {
        var acc = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
        var first = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];
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
        return column.children && column.children.length > 0 && Object.prototype.toString.apply(column.children) === '[object Array]' || false;
    }
    $.extend(this, { init: init });
}    

},{}]},{},[1]);
