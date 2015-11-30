(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":2}],2:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":3}],3:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],4:[function(require,module,exports){
/**
 * https://github.com/keik/slickgrid-colgroup-plugin
 * @version v1.0.0
 * @author keik <k4t0.kei@gmail.com>
 * @license MIT
 */

'use strict';

var d = require('debug')('slickgrid-colgroup-plugin');
localStorage.debug = '*';

// register namespace
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
  var _uid = undefined,
      _handler = new Slick.EventHandler(),

  /** cache for a grid object and DOM elements associated with UID */
  _cache = {};

  function init(grid) {
    d('init');

    _uid = grid.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];
    _handler.subscribe(grid.onColumnsResized, handleColumnsResized);
    _cache[_uid] = {};
    _cache[_uid].grid = grid;
    _cache[_uid].headerScrollerEl = grid.getContainerNode().getElementsByClassName('slick-header')[0];
    _cache[_uid].origHeadersEl = _cache[_uid].headerScrollerEl.getElementsByClassName('slick-header-columns')[0];
    var v = measureVCellPaddingAndBorder();
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
    grid.setColumns = (function (originalSetColumns) {
      return function (columnsDef) {
        d('setColumns');

        // update current target grid UID
        _uid = this.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];

        _cache[_uid].columnsDef = columnsDef;
        _cache[_uid].innerColumnsDef = genInnerColumnsDef(columnsDef);
        _cache[_uid].columnsDefByLevel = genColumnsDefByLevel(grid.getColumns());
        originalSetColumns(_cache[_uid].innerColumnsDef);
        createColumnGroupHeaders();
      };
    })(grid.setColumns);

    grid.getColumns = (function (originalGetColumns) {
      return function () {
        d('getColumns');

        return _cache[_uid].columnsDef;
      };
    })(grid.getColumns);

    // no event fired when `autosizeColumns` called, so follow it by advicing below methods with column group resizing.
    ['invalidate', 'render'].forEach(function (fnName) {
      grid[fnName] = (function (origFn) {
        return function () {
          origFn(arguments);
          applyColumnGroupWidths();
        };
      })(grid[fnName]);
    });

    // ------------------------------
    // initializing advices
    // ------------------------------

    // depending on grid option `explicitInitialization`, change a timing of column group creation.
    if (grid.getOptions()['explicitInitialization']) {
      // grid are not yet rendered, so advice for `grid.init` with column group creation.
      grid.init = (function (originalInit) {
        return function () {
          // update current target grid UID
          _uid = this.getContainerNode().className.match(/(?: |^)slickgrid_(\d+)(?!\w)/)[1];

          originalInit();
          measureCellHorizontalPaddingAndBorder = memoizeMeasureCellHorizontalPaddingAndBorder();
          createCssRules();
          createColumnGroupHeaderRow();
          createColumnGroupHeaders();
          d('grid has been initialized with EXPLICIT mode');
        };
      })(grid.init);
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

    var headerColumnWidthDiff = undefined;

    return function () {
      d('measureCellHorizontalPaddingAndBorder');

      if (headerColumnWidthDiff) return headerColumnWidthDiff;

      var computed = window.getComputedStyle(_cache[_uid].origHeadersEl.getElementsByClassName('slick-header-column')[0]);
      headerColumnWidthDiff = 0;
      ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].forEach(function (val) {
        headerColumnWidthDiff += parseFloat(computed[val]) || 0;
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

    var v = ['borderTopWidth', 'borderBottomWidth', 'paddingTop', 'paddingBottom'],
        $canvas = $(_cache[_uid].grid.getCanvasNode()),
        $r = $('<div class="slick-row" />').appendTo($canvas),
        $el = $('<div class="slick-cell" id="" style="visibility:hidden">-</div>').appendTo($r);

    var height = undefined,
        heightDiff = 0;

    height = parseFloat($el.css('height'));
    $.each(v, function (n, val) {
      heightDiff += parseFloat($el.css(val)) || 0;
    });
    $r.remove();

    return { height: height, heightDiff: heightDiff };
  } // _measureVCellPaddingAndBorder

  /**
   * Apply column group header's widths.
   */
  function applyColumnGroupWidths() {
    d('applyColumnGroupWidths');

    var origHeadersEl = _cache[_uid].origHeadersEl,
        columnsDefByLevel = _cache[_uid].columnsDefByLevel,
        origHeadersWidth = getHeadersWidth(),
        groupHeadersEl = _cache[_uid].groupHeadersEl,
        colGroupDepth = groupHeadersEl.length;

    for (var r = 0; r < colGroupDepth; r++) {
      groupHeadersEl[r].style.width = origHeadersWidth;
    }

    var columnsDef = _cache[_uid].columnsDef;

    setWidthRecursively(columnsDef);
    function setWidthRecursively(columnsDef) {
      var depth = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
      var colIdx = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

      for (var c = 0, C = columnsDef.length; c < C; c++) {
        // update index in the depth
        colIdx[depth] = colIdx[depth] == null ? 0 : colIdx[depth] + 1;

        var width = -measureCellHorizontalPaddingAndBorder();
        var column = columnsDef[c];
        if (column.children && column.children.length > 0) {
          // process children at first
          setWidthRecursively(column.children, depth + 1, colIdx);
          if (depth < colGroupDepth - 1) {
            for (var c2 = 0, C2 = column.children.length; c2 < C2; c2++) {
              width += parseInt(groupHeadersEl[depth + 1].children[columnsDefByLevel[depth + 1].indexOf(column.children[c2])].offsetWidth, 10);
            }
            groupHeadersEl[depth].children[c].style.width = width + 'px';
          } else {
            for (var c2 = 0, C2 = column.children.length; c2 < C2; c2++) {
              width += parseInt(origHeadersEl.querySelector('#slickgrid_' + (_uid + column.children[c2].id)).offsetWidth, 10);
            }
            groupHeadersEl[depth].children[columnsDefByLevel[depth].indexOf(column)].style.width = width + 'px';
          }
        } else if (depth < colGroupDepth) {
          // process the tip
          width += parseInt(origHeadersEl.querySelector('#slickgrid_' + (_uid + column.id)).offsetWidth, 10);
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
    var columnsDefByLevel = _cache[_uid].columnsDefByLevel,
        fragment = document.createDocumentFragment();
    for (var i = 0, len = columnsDefByLevel.length; i < len - 1; i++) {
      var tmp = document.createElement('div');
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

    var r = undefined,
        R = undefined,
        c = undefined,
        C = undefined,
        columnsDefByLevel = _cache[_uid].columnsDefByLevel;

    for (r = 0, R = columnsDefByLevel.length; r < R - 1; r++) {
      var columns = columnsDefByLevel[r],
          columnsGroupHtml = '';
      for (c = 0, C = columns.length; c < C; c++) {
        var column = columns[c];
        columnsGroupHtml += '\n<div class="ui-state-default slick-header-column slick-header-columns-group">\n  <span class="slick-column-name">' + (hasChildren(column) ? column.name : '') + '</span>\n</div>';
        // apply CSS rule for rowspan to tip
        if (!hasChildren(column)) {
          var headersEl = _cache[_uid].origHeadersEl;
          var tipColumn = headersEl.querySelector('#slickgrid_' + (_uid + column.id));
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
    var v = measureVCellPaddingAndBorder();
    var rules = ['.hidden {visibility: hidden;}'];

    var maxrow = 30; // TODO to be intelligent
    for (var i = 0; i < maxrow; i++) {
      rules.push('\n.slick-header-column.h' + i + ' {\n  margin: ' + (1 - i) * (v.height + v.heightDiff) + 'px 0 0 0;\n  font-size: inherit;\n  height: ' + (i * (v.height + v.heightDiff) - v.heightDiff * 2 + 1) + 'px;\n}');
    }

    var styleEl = $('<style type="text/css" rel="stylesheet" />').appendTo($('head'))[0];
    if (styleEl.styleSheet) {
      // IE
      styleEl.styleSheet.cssText = rules.join(' ');
    } else {
      styleEl.appendChild(document.createTextNode(rules.join(' ')));
    }
  } // _createCssRules

  function genColumnsDefByLevel(columns) {
    var depth = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
    var acc = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

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
  function genInnerColumnsDef(columns) {
    var acc = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
    var first = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];

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
    return column.children && column.children.length > 0 && Object.prototype.toString.apply(column.children) === '[object Array]';
  }

  $.extend(this, {
    init: init
  });
}

},{"debug":1}]},{},[4]);
