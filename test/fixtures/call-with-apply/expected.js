"use strict";

var _get2 = _interopRequireDefault(require("lodash/get"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var a = {
  b: 1
};

_get2["default"].apply(null, [a, 'b', '2']);