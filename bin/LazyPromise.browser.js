'use strict';

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _module = null,
    _exports = null;
if (module && module.exports) {
    _exports = module.exports;
    _module = {};
} else {
    _exports = window;
    _module = _exports;
}

(function (module, exports, root) {
    var rawAsap = function () {
        function _rawAsap(task) {
            if (!queue.length) {
                requestFlush();
                flushing = true;
            }

            queue[queue.length] = task;
        }

        var queue = [],
            flushing = false,
            requestFlush = null,
            index = 0,
            capacity = 1024;

        function flush() {
            while (index < queue.length) {
                var currentIndex = index;

                index = index + 1;
                queue[currentIndex].call();

                if (index > capacity) {
                    for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                        queue[scan] = queue[scan + index];
                    }
                    queue.length -= index;
                    index = 0;
                }
            }
            queue.length = 0;
            index = 0;
            flushing = false;
        }

        function makeRequestCallFromTimer(callback) {
            return function requestCall() {
                var timeoutHandle = setTimeout(handleTimer, 0);

                var intervalHandle = setInterval(handleTimer, 50);

                function handleTimer() {
                    clearTimeout(timeoutHandle);
                    clearInterval(intervalHandle);
                    callback();
                }
            };
        }

        _rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;

        var BrowserMutationObserver = root.MutationObserver || root.WebKitMutationObserver;

        if (typeof BrowserMutationObserver === 'function') {
            requestFlush = makeRequestCallFromMutationObserver(flush);
        } else {
            requestFlush = makeRequestCallFromTimer(flush);
        }

        _rawAsap.requestFlush = requestFlush;

        function makeRequestCallFromMutationObserver(callback) {
            var toggle = 1;
            var observer = new BrowserMutationObserver(callback);
            var node = document.createTextNode("");
            observer.observe(node, { characterData: true });
            return function requestCall() {
                toggle = -toggle;
                node.data = toggle;
            };
        }

        return _rawAsap;
    }();

    var asap = function () {
        var freeTasks = [],
            pendingErrors = [];

        var requestErrorThrow = rawAsap.makeRequestCallFromTimer(function () {
            if (pendingErrors.length) {
                throw pendingErrors.shift();
            }
        });

        var RawTask = function () {
            function RawTask() {
                _classCallCheck(this, RawTask);

                this.task = null;
            }

            _createClass(RawTask, [{
                key: 'call',
                value: function call() {
                    try {
                        this.task.call();
                    } catch (error) {
                        pendingErrors.push(error);
                        requestErrorThrow();
                    } finally {
                        this.task = null;
                        freeTasks[freeTasks.length] = this;
                    }
                }
            }]);

            return RawTask;
        }();

        function _asap(task) {
            var rawTask = void 0;
            if (freeTasks.length) {
                rawTask = freeTasks.pop();
            } else {
                rawTask = new RawTask();
            }
            rawTask.task = task;
            rawAsap(rawTask);
        }

        return _asap;
    }();

    var LazyPromise = function () {
        _createClass(LazyPromise, null, [{
            key: 'rawAsap',
            get: function get() {
                return rawAsap;
            }
        }, {
            key: 'asap',
            get: function get() {
                return asap;
            }
        }]);

        function LazyPromise(fn) {
            _classCallCheck(this, LazyPromise);

            if (typeof fn !== 'function') {
                throw new TypeError('Bro\' ... fn means function, not some shit like ' + (typeof fn === 'undefined' ? 'undefined' : _typeof(fn)) + ' you try to give. Tss');
            }

            this.created = false;
            this.fn = fn;
            this.promise = null;
        }

        _createClass(LazyPromise, [{
            key: '_createPromise',
            value: function _createPromise() {
                var _this = this;

                this.promise = new Promise(function (resolve, reject) {
                    asap(function () {
                        try {
                            _this.fn(resolve, reject);
                        } catch (e) {
                            reject(e);
                        }
                    });
                });

                this.created = true;
            }
        }, {
            key: 'updatePromise',
            value: function updatePromise(promise) {
                if (!!promise && promise.__proto__.constructor.name === 'Promise') {
                    this.promise = Promise.resolve(promise);
                    this.created = true;
                }
            }
        }, {
            key: 'then',
            value: function then(onResolved, onRejected) {
                if (!this.created) this._createPromise();
                this.promise && this.promise.then(onResolved, onRejected);
                return this;
            }
        }, {
            key: 'catch',
            value: function _catch(onRejected) {
                if (!this.created) this._createPromise();
                this.promise && this.promise.catch(onRejected);
                return this;
            }
        }, {
            key: 'kill',
            value: function kill() {
                this.promise = null;
            }
        }]);

        return LazyPromise;
    }();

    var SuperLazyPromise = function (_LazyPromise) {
        _inherits(SuperLazyPromise, _LazyPromise);

        function SuperLazyPromise(fn) {
            _classCallCheck(this, SuperLazyPromise);

            var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(SuperLazyPromise).call(this, fn));

            _this2.superLazyThenCatch = [];
            return _this2;
        }

        _createClass(SuperLazyPromise, [{
            key: 'then',
            value: function then(onResolved, onRejected) {
                if (!this.created) {
                    this.superLazyThenCatch.push([onResolved, onRejected]);
                    return this;
                } else {
                    return _get(Object.getPrototypeOf(SuperLazyPromise.prototype), 'then', this).call(this, onResolved, onRejected);
                }
            }
        }, {
            key: 'catch',
            value: function _catch(onRejected) {
                if (!this.created) {
                    if (onRejected && typeof onRejected === 'function') {
                        this.superLazyThenCatch.push(onRejected);
                    }
                    return this;
                } else {
                    return _get(Object.getPrototypeOf(SuperLazyPromise.prototype), 'catch', this).call(this, onRejected);
                }
            }
        }, {
            key: 'awake',
            value: function awake(fn) {
                var _this3 = this;

                if (typeof fn === 'function') {
                    this.fn = fn;
                    this.created = false;
                }
                this.created || _get(Object.getPrototypeOf(SuperLazyPromise.prototype), '_createPromise', this).call(this);
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    var _loop = function _loop() {
                        var resRej = _step.value;

                        if (typeof resRej === 'function') {
                            asap(function () {
                                _this3.catch(resRej);
                            });
                        } else {
                            asap(function () {
                                _this3.then.apply(_this3, _toConsumableArray(resRej));
                            });
                        }
                    };

                    for (var _iterator = this.superLazyThenCatch[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        _loop();
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            }
        }]);

        return SuperLazyPromise;
    }(LazyPromise);

    exports.LazyPromise = LazyPromise;
    exports.SuperLazyPromise = SuperLazyPromise;
})(_module, _exports, global || window);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkxhenlQcm9taXNlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiIuLi9iaW4vTGF6eVByb21pc2UuYnJvd3Nlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxudmFyIF9nZXQgPSBmdW5jdGlvbiBnZXQob2JqZWN0LCBwcm9wZXJ0eSwgcmVjZWl2ZXIpIHsgaWYgKG9iamVjdCA9PT0gbnVsbCkgb2JqZWN0ID0gRnVuY3Rpb24ucHJvdG90eXBlOyB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBwcm9wZXJ0eSk7IGlmIChkZXNjID09PSB1bmRlZmluZWQpIHsgdmFyIHBhcmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmplY3QpOyBpZiAocGFyZW50ID09PSBudWxsKSB7IHJldHVybiB1bmRlZmluZWQ7IH0gZWxzZSB7IHJldHVybiBnZXQocGFyZW50LCBwcm9wZXJ0eSwgcmVjZWl2ZXIpOyB9IH0gZWxzZSBpZiAoXCJ2YWx1ZVwiIGluIGRlc2MpIHsgcmV0dXJuIGRlc2MudmFsdWU7IH0gZWxzZSB7IHZhciBnZXR0ZXIgPSBkZXNjLmdldDsgaWYgKGdldHRlciA9PT0gdW5kZWZpbmVkKSB7IHJldHVybiB1bmRlZmluZWQ7IH0gcmV0dXJuIGdldHRlci5jYWxsKHJlY2VpdmVyKTsgfSB9O1xuXG52YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxudmFyIF9jcmVhdGVDbGFzcyA9IGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9IHJldHVybiBmdW5jdGlvbiAoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH07IH0oKTtcblxuZnVuY3Rpb24gX3RvQ29uc3VtYWJsZUFycmF5KGFycikgeyBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7IGZvciAodmFyIGkgPSAwLCBhcnIyID0gQXJyYXkoYXJyLmxlbmd0aCk7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHsgYXJyMltpXSA9IGFycltpXTsgfSByZXR1cm4gYXJyMjsgfSBlbHNlIHsgcmV0dXJuIEFycmF5LmZyb20oYXJyKTsgfSB9XG5cbmZ1bmN0aW9uIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHNlbGYsIGNhbGwpIHsgaWYgKCFzZWxmKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gY2FsbCAmJiAodHlwZW9mIGNhbGwgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGNhbGwgPT09IFwiZnVuY3Rpb25cIikgPyBjYWxsIDogc2VsZjsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb24sIG5vdCBcIiArIHR5cGVvZiBzdXBlckNsYXNzKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCBlbnVtZXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LnNldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKSA6IHN1YkNsYXNzLl9fcHJvdG9fXyA9IHN1cGVyQ2xhc3M7IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIF9tb2R1bGUgPSBudWxsLFxuICAgIF9leHBvcnRzID0gbnVsbDtcbmlmIChtb2R1bGUgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBfZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzO1xuICAgIF9tb2R1bGUgPSB7fTtcbn0gZWxzZSB7XG4gICAgX2V4cG9ydHMgPSB3aW5kb3c7XG4gICAgX21vZHVsZSA9IF9leHBvcnRzO1xufVxuXG4oZnVuY3Rpb24gKG1vZHVsZSwgZXhwb3J0cywgcm9vdCkge1xuICAgIHZhciByYXdBc2FwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBmdW5jdGlvbiBfcmF3QXNhcCh0YXNrKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJlcXVlc3RGbHVzaCgpO1xuICAgICAgICAgICAgICAgIGZsdXNoaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcXVldWVbcXVldWUubGVuZ3RoXSA9IHRhc2s7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcXVldWUgPSBbXSxcbiAgICAgICAgICAgIGZsdXNoaW5nID0gZmFsc2UsXG4gICAgICAgICAgICByZXF1ZXN0Rmx1c2ggPSBudWxsLFxuICAgICAgICAgICAgaW5kZXggPSAwLFxuICAgICAgICAgICAgY2FwYWNpdHkgPSAxMDI0O1xuXG4gICAgICAgIGZ1bmN0aW9uIGZsdXNoKCkge1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgcXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRJbmRleCA9IGluZGV4O1xuXG4gICAgICAgICAgICAgICAgaW5kZXggPSBpbmRleCArIDE7XG4gICAgICAgICAgICAgICAgcXVldWVbY3VycmVudEluZGV4XS5jYWxsKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPiBjYXBhY2l0eSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBzY2FuID0gMCwgbmV3TGVuZ3RoID0gcXVldWUubGVuZ3RoIC0gaW5kZXg7IHNjYW4gPCBuZXdMZW5ndGg7IHNjYW4rKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcXVldWVbc2Nhbl0gPSBxdWV1ZVtzY2FuICsgaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCAtPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBpbmRleCA9IDA7XG4gICAgICAgICAgICBmbHVzaGluZyA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gcmVxdWVzdENhbGwoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWVvdXRIYW5kbGUgPSBzZXRUaW1lb3V0KGhhbmRsZVRpbWVyLCAwKTtcblxuICAgICAgICAgICAgICAgIHZhciBpbnRlcnZhbEhhbmRsZSA9IHNldEludGVydmFsKGhhbmRsZVRpbWVyLCA1MCk7XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBoYW5kbGVUaW1lcigpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRIYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsSGFuZGxlKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgX3Jhd0FzYXAubWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyID0gbWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyO1xuXG4gICAgICAgIHZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IHJvb3QuTXV0YXRpb25PYnNlcnZlciB8fCByb290LldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmVxdWVzdEZsdXNoID0gbWFrZVJlcXVlc3RDYWxsRnJvbU11dGF0aW9uT2JzZXJ2ZXIoZmx1c2gpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVxdWVzdEZsdXNoID0gbWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyKGZsdXNoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9yYXdBc2FwLnJlcXVlc3RGbHVzaCA9IHJlcXVlc3RGbHVzaDtcblxuICAgICAgICBmdW5jdGlvbiBtYWtlUmVxdWVzdENhbGxGcm9tTXV0YXRpb25PYnNlcnZlcihjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIHRvZ2dsZSA9IDE7XG4gICAgICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoY2FsbGJhY2spO1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcIlwiKTtcbiAgICAgICAgICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIHJlcXVlc3RDYWxsKCkge1xuICAgICAgICAgICAgICAgIHRvZ2dsZSA9IC10b2dnbGU7XG4gICAgICAgICAgICAgICAgbm9kZS5kYXRhID0gdG9nZ2xlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBfcmF3QXNhcDtcbiAgICB9KCk7XG5cbiAgICB2YXIgYXNhcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGZyZWVUYXNrcyA9IFtdLFxuICAgICAgICAgICAgcGVuZGluZ0Vycm9ycyA9IFtdO1xuXG4gICAgICAgIHZhciByZXF1ZXN0RXJyb3JUaHJvdyA9IHJhd0FzYXAubWFrZVJlcXVlc3RDYWxsRnJvbVRpbWVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChwZW5kaW5nRXJyb3JzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRocm93IHBlbmRpbmdFcnJvcnMuc2hpZnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIFJhd1Rhc2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiBSYXdUYXNrKCkge1xuICAgICAgICAgICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBSYXdUYXNrKTtcblxuICAgICAgICAgICAgICAgIHRoaXMudGFzayA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9jcmVhdGVDbGFzcyhSYXdUYXNrLCBbe1xuICAgICAgICAgICAgICAgIGtleTogJ2NhbGwnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiBjYWxsKCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrLmNhbGwoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlbmRpbmdFcnJvcnMucHVzaChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0RXJyb3JUaHJvdygpO1xuICAgICAgICAgICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyZWVUYXNrc1tmcmVlVGFza3MubGVuZ3RoXSA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XSk7XG5cbiAgICAgICAgICAgIHJldHVybiBSYXdUYXNrO1xuICAgICAgICB9KCk7XG5cbiAgICAgICAgZnVuY3Rpb24gX2FzYXAodGFzaykge1xuICAgICAgICAgICAgdmFyIHJhd1Rhc2sgPSB2b2lkIDA7XG4gICAgICAgICAgICBpZiAoZnJlZVRhc2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJhd1Rhc2sgPSBmcmVlVGFza3MucG9wKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJhd1Rhc2sgPSBuZXcgUmF3VGFzaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmF3VGFzay50YXNrID0gdGFzaztcbiAgICAgICAgICAgIHJhd0FzYXAocmF3VGFzayk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gX2FzYXA7XG4gICAgfSgpO1xuXG4gICAgdmFyIExhenlQcm9taXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBfY3JlYXRlQ2xhc3MoTGF6eVByb21pc2UsIG51bGwsIFt7XG4gICAgICAgICAgICBrZXk6ICdyYXdBc2FwJyxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiByYXdBc2FwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB7XG4gICAgICAgICAgICBrZXk6ICdhc2FwJyxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhc2FwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XSk7XG5cbiAgICAgICAgZnVuY3Rpb24gTGF6eVByb21pc2UoZm4pIHtcbiAgICAgICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBMYXp5UHJvbWlzZSk7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCcm9cXCcgLi4uIGZuIG1lYW5zIGZ1bmN0aW9uLCBub3Qgc29tZSBzaGl0IGxpa2UgJyArICh0eXBlb2YgZm4gPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGZuKSkgKyAnIHlvdSB0cnkgdG8gZ2l2ZS4gVHNzJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuY3JlYXRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5mbiA9IGZuO1xuICAgICAgICAgICAgdGhpcy5wcm9taXNlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIF9jcmVhdGVDbGFzcyhMYXp5UHJvbWlzZSwgW3tcbiAgICAgICAgICAgIGtleTogJ19jcmVhdGVQcm9taXNlJyxcbiAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiBfY3JlYXRlUHJvbWlzZSgpIHtcbiAgICAgICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgICAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuZm4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwge1xuICAgICAgICAgICAga2V5OiAndXBkYXRlUHJvbWlzZScsXG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24gdXBkYXRlUHJvbWlzZShwcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEhcHJvbWlzZSAmJiBwcm9taXNlLl9fcHJvdG9fXy5jb25zdHJ1Y3Rvci5uYW1lID09PSAnUHJvbWlzZScpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKHByb21pc2UpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwge1xuICAgICAgICAgICAga2V5OiAndGhlbicsXG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24gdGhlbihvblJlc29sdmVkLCBvblJlamVjdGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNyZWF0ZWQpIHRoaXMuX2NyZWF0ZVByb21pc2UoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnByb21pc2UgJiYgdGhpcy5wcm9taXNlLnRoZW4ob25SZXNvbHZlZCwgb25SZWplY3RlZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHtcbiAgICAgICAgICAgIGtleTogJ2NhdGNoJyxcbiAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiBfY2F0Y2gob25SZWplY3RlZCkge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5jcmVhdGVkKSB0aGlzLl9jcmVhdGVQcm9taXNlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9taXNlICYmIHRoaXMucHJvbWlzZS5jYXRjaChvblJlamVjdGVkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwge1xuICAgICAgICAgICAga2V5OiAna2lsbCcsXG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24ga2lsbCgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByb21pc2UgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XSk7XG5cbiAgICAgICAgcmV0dXJuIExhenlQcm9taXNlO1xuICAgIH0oKTtcblxuICAgIHZhciBTdXBlckxhenlQcm9taXNlID0gZnVuY3Rpb24gKF9MYXp5UHJvbWlzZSkge1xuICAgICAgICBfaW5oZXJpdHMoU3VwZXJMYXp5UHJvbWlzZSwgX0xhenlQcm9taXNlKTtcblxuICAgICAgICBmdW5jdGlvbiBTdXBlckxhenlQcm9taXNlKGZuKSB7XG4gICAgICAgICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgU3VwZXJMYXp5UHJvbWlzZSk7XG5cbiAgICAgICAgICAgIHZhciBfdGhpczIgPSBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybih0aGlzLCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoU3VwZXJMYXp5UHJvbWlzZSkuY2FsbCh0aGlzLCBmbikpO1xuXG4gICAgICAgICAgICBfdGhpczIuc3VwZXJMYXp5VGhlbkNhdGNoID0gW107XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyO1xuICAgICAgICB9XG5cbiAgICAgICAgX2NyZWF0ZUNsYXNzKFN1cGVyTGF6eVByb21pc2UsIFt7XG4gICAgICAgICAgICBrZXk6ICd0aGVuJyxcbiAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiB0aGVuKG9uUmVzb2x2ZWQsIG9uUmVqZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuY3JlYXRlZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1cGVyTGF6eVRoZW5DYXRjaC5wdXNoKFtvblJlc29sdmVkLCBvblJlamVjdGVkXSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfZ2V0KE9iamVjdC5nZXRQcm90b3R5cGVPZihTdXBlckxhenlQcm9taXNlLnByb3RvdHlwZSksICd0aGVuJywgdGhpcykuY2FsbCh0aGlzLCBvblJlc29sdmVkLCBvblJlamVjdGVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHtcbiAgICAgICAgICAgIGtleTogJ2NhdGNoJyxcbiAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiBfY2F0Y2gob25SZWplY3RlZCkge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5jcmVhdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvblJlamVjdGVkICYmIHR5cGVvZiBvblJlamVjdGVkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN1cGVyTGF6eVRoZW5DYXRjaC5wdXNoKG9uUmVqZWN0ZWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfZ2V0KE9iamVjdC5nZXRQcm90b3R5cGVPZihTdXBlckxhenlQcm9taXNlLnByb3RvdHlwZSksICdjYXRjaCcsIHRoaXMpLmNhbGwodGhpcywgb25SZWplY3RlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB7XG4gICAgICAgICAgICBrZXk6ICdhd2FrZScsXG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24gYXdha2UoZm4pIHtcbiAgICAgICAgICAgICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mbiA9IGZuO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVkIHx8IF9nZXQoT2JqZWN0LmdldFByb3RvdHlwZU9mKFN1cGVyTGF6eVByb21pc2UucHJvdG90eXBlKSwgJ19jcmVhdGVQcm9taXNlJywgdGhpcykuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIF9pdGVyYXRvckVycm9yID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIF9sb29wID0gZnVuY3Rpb24gX2xvb3AoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzUmVqID0gX3N0ZXAudmFsdWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzUmVqID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzMy5jYXRjaChyZXNSZWopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMzLnRoZW4uYXBwbHkoX3RoaXMzLCBfdG9Db25zdW1hYmxlQXJyYXkocmVzUmVqKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgX2l0ZXJhdG9yID0gdGhpcy5zdXBlckxhenlUaGVuQ2F0Y2hbU3ltYm9sLml0ZXJhdG9yXSgpLCBfc3RlcDsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gKF9zdGVwID0gX2l0ZXJhdG9yLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfbG9vcCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIF9kaWRJdGVyYXRvckVycm9yID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgX2l0ZXJhdG9yRXJyb3IgPSBlcnI7XG4gICAgICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiAmJiBfaXRlcmF0b3IucmV0dXJuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2l0ZXJhdG9yLnJldHVybigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9kaWRJdGVyYXRvckVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgX2l0ZXJhdG9yRXJyb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1dKTtcblxuICAgICAgICByZXR1cm4gU3VwZXJMYXp5UHJvbWlzZTtcbiAgICB9KExhenlQcm9taXNlKTtcblxuICAgIGV4cG9ydHMuTGF6eVByb21pc2UgPSBMYXp5UHJvbWlzZTtcbiAgICBleHBvcnRzLlN1cGVyTGF6eVByb21pc2UgPSBTdXBlckxhenlQcm9taXNlO1xufSkoX21vZHVsZSwgX2V4cG9ydHMsIGdsb2JhbCB8fCB3aW5kb3cpOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
