'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Field = exports.InvalidFieldError = exports.ValidatorError = undefined;

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _typeable = require('typeable');

var _deepEqual = require('deep-equal');

var _deepEqual2 = _interopRequireDefault(_deepEqual);

var _validatable = require('validatable');

var _utils = require('./utils');

var _schemas = require('./schemas');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
* Exposing validatable ValidatorError.
*/

exports.ValidatorError = _validatable.ValidatorError;

/*
* A validation error class.
*/

class InvalidFieldError extends Error {

  /*
  * Class constructor.
  */

  constructor() {
    let path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    let errors = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    let related = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
    let message = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'Field validation failed';
    let code = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 422;

    super();

    this.name = this.constructor.name;
    this.path = path;
    this.errors = errors;
    this.related = related;
    this.message = message;
    this.code = code;
  }
}

exports.InvalidFieldError = InvalidFieldError; /*
                                               * Document field class.
                                               */

class Field {

  /*
  * Class constructor.
  */

  constructor(document, name) {
    Object.defineProperty(this, '$document', {
      value: document
    });
    Object.defineProperty(this, '$name', {
      value: name
    });
    Object.defineProperty(this, '_value', {
      value: this.defaultValue,
      writable: true
    });
    Object.defineProperty(this, '_initialValue', {
      value: this._value,
      writable: true
    });
  }

  /*
  * Return field value.
  */

  get value() {
    let get = this.$document.$schema.fields[this.$name].get;


    let value = this._value;
    if (get) {
      // transformation with custom getter
      value = get.call(this.$document, value);
    }
    return value;
  }

  /*
  * Sets field value.
  */

  set value(value) {
    var _$document$$schema$fi = this.$document.$schema.fields[this.$name];
    let set = _$document$$schema$fi.set,
        type = _$document$$schema$fi.type;


    value = this._cast(value, type); // value type casting
    if (set) {
      // transformation with custom setter
      value = set.call(this.$document, value);
    }

    this._value = value;
  }

  /*
  * Returns the default value of a field.
  */

  get defaultValue() {
    var _$document$$schema$fi2 = this.$document.$schema.fields[this.$name];
    let type = _$document$$schema$fi2.type,
        set = _$document$$schema$fi2.set,
        defaultValue = _$document$$schema$fi2.defaultValue;


    let value = (0, _typeable.isFunction)(defaultValue) ? defaultValue(this._document) : defaultValue;

    value = this._cast(value, type); // value type casting
    if (set) {
      // custom setter
      value = set.call(this.$document, value);
    }

    return value;
  }

  /*
  * Converts the `value` into specified `type`.
  */

  _cast(value, type) {
    let options = this.$document.$schema.typeOptions;

    options.types = (0, _assign2.default)({}, options.types, {
      Schema: value => {
        if ((0, _typeable.isArray)(type)) type = type[0]; // in case of {type: [Schema]}
        return new this.$document.constructor(type, value, this.$document);
      }
    });

    return (0, _typeable.cast)(value, type, options);
  }

  /*
  * Returns the value of a field before last commit.
  */

  get initialValue() {
    return this._initialValue;
  }

  /*
  * Sets field to the default value.
  */

  reset() {
    this.value = this.defaultValue;

    return this;
  }

  /*
  * Removes field's value by setting it to null.
  */

  clear() {
    this.value = null;

    return this;
  }

  /*
  * Deeply set's the initial values to the current value of each field.
  */

  commit() {
    this._commitRelated(this.value);
    this._initialValue = (0, _utils.cloneData)(this.value);

    return this;
  }

  /*
  * Deeply set's the initial values of the related `data` object to the current
  * value of each field.
  */

  _commitRelated(data) {
    // commit sub fields
    if (data && data.commit) {
      data.commit();
    } else if (data && (0, _typeable.isArray)(data)) {
      data.forEach(d => this._commitRelated(d));
    }
  }

  /*
  * Sets field's value before last commit.
  */

  rollback() {
    this.value = this.initialValue;

    return this;
  }

  /*
  * Returns `true` when the `data` equals to the current value.
  */

  equals(data) {
    return (0, _deepEqual2.default)(this.value, data);
  }

  /*
  * Returns `true` if the field or related sub-fields have been changed.
  */

  isChanged() {
    return !this.equals(this.initialValue);
  }

  /*
  * Creates a new instance of InvalidFieldError.
  */

  createInvalidFieldError(path, errors, related) {
    return new InvalidFieldError(path, errors, related);
  }

  /*
  * Validates the field and returns errors.
  */

  validate() {
    var _this = this;

    return (0, _asyncToGenerator3.default)(function* () {
      let path = _this.$name;
      let errors = yield _this._validateValue(_this.value);
      let related = yield _this._validateRelated(_this.value);

      let hasError = errors.length > 0 || !_this._isRelatedValid(related);

      if (hasError) {
        return _this.createInvalidFieldError(path, errors, related);
      }
      return undefined;
    })();
  }

  /*
  * Validates the `value` and returns errors.
  */

  _validateValue(value) {
    var _this2 = this;

    return (0, _asyncToGenerator3.default)(function* () {
      let validate = _this2.$document.$schema.fields[_this2.$name].validate;


      return yield _this2.$document.$validator.validate(value, validate);
    })();
  }

  /*
  * Validates the related fields of the `value` and returns errors.
  */

  _validateRelated(value) {
    var _this3 = this;

    return (0, _asyncToGenerator3.default)(function* () {
      let type = _this3.$document.$schema.fields[_this3.$name].type;


      if ((0, _typeable.isPresent)(value) && type instanceof _schemas.Schema) {
        return yield value.validate();
      } else if ((0, _typeable.isArray)(value) && (0, _typeable.isArray)(type)) {
        let items = [];
        for (let v of value) {
          if (type[0] instanceof _schemas.Schema) {
            items.push(v ? yield v.validate() : undefined);
          } else {
            items.push((yield _this3._validateValue(v)));
          }
        }
        return items;
      }
      return [];
    })();
  }

  /*
  * Checks if the `related` field is valid.
  */

  _isRelatedValid(related) {
    return related.every(v => {
      return (0, _typeable.isArray)(v) ? this._isRelatedValid(v) : (0, _typeable.isAbsent)(v);
    });
  }

  /*
  * Returns `true` when the value is valid.
  */

  isValid() {
    var _this4 = this;

    return (0, _asyncToGenerator3.default)(function* () {
      return (0, _typeable.isAbsent)((yield _this4.validate()));
    })();
  }

}
exports.Field = Field;