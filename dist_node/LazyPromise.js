'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _module = null,
    _exports = null;
if (module && module.exports) {
    _exports = module.exports;
    _module = {};
} else {
    _exports = window;
    _module = _exports;
}

((module, exports, root) => {
    var rawAsap = (() => {
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

        const BrowserMutationObserver = root.MutationObserver || root.WebKitMutationObserver;

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
    })();

    var asap = (() => {
        var freeTasks = [],
            pendingErrors = [];

        const requestErrorThrow = rawAsap.makeRequestCallFromTimer(() => {
            if (pendingErrors.length) {
                throw pendingErrors.shift();
            }
        });

        class RawTask {
            constructor() {
                this.task = null;
            }

            call() {
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
        }

        function _asap(task) {
            let rawTask;
            if (freeTasks.length) {
                rawTask = freeTasks.pop();
            } else {
                rawTask = new RawTask();
            }
            rawTask.task = task;
            rawAsap(rawTask);
        }

        return _asap;
    })();

    class LazyPromise {

        static get rawAsap() {
            return rawAsap;
        }
        static get asap() {
            return asap;
        }

        constructor(fn) {
            if (typeof fn !== 'function') {
                throw new TypeError(`Bro' ... fn means function, not some shit like ${ typeof fn } you try to give. Tss`);
            }

            this.created = false;
            this.fn = fn;
            this.promise = null;
        }

        _createPromise() {
            this.promise = new Promise((resolve, reject) => {
                asap(() => {
                    try {
                        this.fn(resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            this.created = true;
        }

        updatePromise(promise) {
            if (!!promise && promise.__proto__.constructor.name === 'Promise') {
                this.promise = Promise.resolve(promise);
                this.created = true;
            }
        }

        then(onResolved, onRejected) {
            if (!this.created) this._createPromise();
            this.promise && this.promise.then(onResolved, onRejected);
            return this;
        }

        catch(onRejected) {
            if (!this.created) this._createPromise();
            this.promise && this.promise.catch(onRejected);
            return this;
        }

        kill() {
            this.promise = null;
        }
    }

    class SuperLazyPromise extends LazyPromise {
        constructor(fn) {
            super(fn);

            this.superLazyThenCatch = [];
        }

        then(onResolved, onRejected) {
            if (!this.created) {
                this.superLazyThenCatch.push([onResolved, onRejected]);
                return this;
            } else {
                return super.then(onResolved, onRejected);
            }
        }

        catch(onRejected) {
            if (!this.created) {
                if (onRejected && typeof onRejected === 'function') {
                    this.superLazyThenCatch.push(onRejected);
                }
                return this;
            } else {
                return super.catch(onRejected);
            }
        }

        awake(fn) {
            if (typeof fn === 'function') {
                this.fn = fn;
                this.created = false;
            }
            this.created || super._createPromise();
            for (let resRej of this.superLazyThenCatch) {
                if (typeof resRej === 'function') {
                    asap(() => {
                        this.catch(resRej);
                    });
                } else {
                    asap(() => {
                        this.then.apply(this, _toConsumableArray(resRej));
                    });
                }
            }
        }
    }

    exports.LazyPromise = LazyPromise;
    exports.SuperLazyPromise = SuperLazyPromise;
})(_module, _exports, global || window);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJMYXp5UHJvbWlzZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIF90b0NvbnN1bWFibGVBcnJheShhcnIpIHsgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgeyBmb3IgKHZhciBpID0gMCwgYXJyMiA9IEFycmF5KGFyci5sZW5ndGgpOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBhcnIyW2ldID0gYXJyW2ldOyByZXR1cm4gYXJyMjsgfSBlbHNlIHsgcmV0dXJuIEFycmF5LmZyb20oYXJyKTsgfSB9XG5cbnZhciBfbW9kdWxlID0gbnVsbCxcbiAgICBfZXhwb3J0cyA9IG51bGw7XG5pZiAobW9kdWxlICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgX2V4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cztcbiAgICBfbW9kdWxlID0ge307XG59IGVsc2Uge1xuICAgIF9leHBvcnRzID0gd2luZG93O1xuICAgIF9tb2R1bGUgPSBfZXhwb3J0cztcbn1cblxuKChtb2R1bGUsIGV4cG9ydHMsIHJvb3QpID0+IHtcbiAgICB2YXIgcmF3QXNhcCA9ICgoKSA9PiB7XG4gICAgICAgIGZ1bmN0aW9uIF9yYXdBc2FwKHRhc2spIHtcbiAgICAgICAgICAgIGlmICghcXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmVxdWVzdEZsdXNoKCk7XG4gICAgICAgICAgICAgICAgZmx1c2hpbmcgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBxdWV1ZVtxdWV1ZS5sZW5ndGhdID0gdGFzaztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBxdWV1ZSA9IFtdLFxuICAgICAgICAgICAgZmx1c2hpbmcgPSBmYWxzZSxcbiAgICAgICAgICAgIHJlcXVlc3RGbHVzaCA9IG51bGwsXG4gICAgICAgICAgICBpbmRleCA9IDAsXG4gICAgICAgICAgICBjYXBhY2l0eSA9IDEwMjQ7XG5cbiAgICAgICAgZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudEluZGV4ID0gaW5kZXg7XG5cbiAgICAgICAgICAgICAgICBpbmRleCA9IGluZGV4ICsgMTtcbiAgICAgICAgICAgICAgICBxdWV1ZVtjdXJyZW50SW5kZXhdLmNhbGwoKTtcblxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IGNhcGFjaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIHNjYW4gPSAwLCBuZXdMZW5ndGggPSBxdWV1ZS5sZW5ndGggLSBpbmRleDsgc2NhbiA8IG5ld0xlbmd0aDsgc2NhbisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZVtzY2FuXSA9IHF1ZXVlW3NjYW4gKyBpbmRleF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcXVldWUubGVuZ3RoIC09IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBpbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgICAgIGZsdXNoaW5nID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBtYWtlUmVxdWVzdENhbGxGcm9tVGltZXIoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiByZXF1ZXN0Q2FsbCgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGltZW91dEhhbmRsZSA9IHNldFRpbWVvdXQoaGFuZGxlVGltZXIsIDApO1xuXG4gICAgICAgICAgICAgICAgdmFyIGludGVydmFsSGFuZGxlID0gc2V0SW50ZXJ2YWwoaGFuZGxlVGltZXIsIDUwKTtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGhhbmRsZVRpbWVyKCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dEhhbmRsZSk7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxIYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBfcmF3QXNhcC5tYWtlUmVxdWVzdENhbGxGcm9tVGltZXIgPSBtYWtlUmVxdWVzdENhbGxGcm9tVGltZXI7XG5cbiAgICAgICAgY29uc3QgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSByb290Lk11dGF0aW9uT2JzZXJ2ZXIgfHwgcm9vdC5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xuXG4gICAgICAgIGlmICh0eXBlb2YgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJlcXVlc3RGbHVzaCA9IG1ha2VSZXF1ZXN0Q2FsbEZyb21NdXRhdGlvbk9ic2VydmVyKGZsdXNoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlcXVlc3RGbHVzaCA9IG1ha2VSZXF1ZXN0Q2FsbEZyb21UaW1lcihmbHVzaCk7XG4gICAgICAgIH1cblxuICAgICAgICBfcmF3QXNhcC5yZXF1ZXN0Rmx1c2ggPSByZXF1ZXN0Rmx1c2g7XG5cbiAgICAgICAgZnVuY3Rpb24gbWFrZVJlcXVlc3RDYWxsRnJvbU11dGF0aW9uT2JzZXJ2ZXIoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciB0b2dnbGUgPSAxO1xuICAgICAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXCJcIik7XG4gICAgICAgICAgICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiByZXF1ZXN0Q2FsbCgpIHtcbiAgICAgICAgICAgICAgICB0b2dnbGUgPSAtdG9nZ2xlO1xuICAgICAgICAgICAgICAgIG5vZGUuZGF0YSA9IHRvZ2dsZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gX3Jhd0FzYXA7XG4gICAgfSkoKTtcblxuICAgIHZhciBhc2FwID0gKCgpID0+IHtcbiAgICAgICAgdmFyIGZyZWVUYXNrcyA9IFtdLFxuICAgICAgICAgICAgcGVuZGluZ0Vycm9ycyA9IFtdO1xuXG4gICAgICAgIGNvbnN0IHJlcXVlc3RFcnJvclRocm93ID0gcmF3QXNhcC5tYWtlUmVxdWVzdENhbGxGcm9tVGltZXIoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHBlbmRpbmdFcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgcGVuZGluZ0Vycm9ycy5zaGlmdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjbGFzcyBSYXdUYXNrIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgICAgIHRoaXMudGFzayA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGwoKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YXNrLmNhbGwoKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBwZW5kaW5nRXJyb3JzLnB1c2goZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0RXJyb3JUaHJvdygpO1xuICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFzayA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGZyZWVUYXNrc1tmcmVlVGFza3MubGVuZ3RoXSA9IHRoaXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gX2FzYXAodGFzaykge1xuICAgICAgICAgICAgbGV0IHJhd1Rhc2s7XG4gICAgICAgICAgICBpZiAoZnJlZVRhc2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJhd1Rhc2sgPSBmcmVlVGFza3MucG9wKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJhd1Rhc2sgPSBuZXcgUmF3VGFzaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmF3VGFzay50YXNrID0gdGFzaztcbiAgICAgICAgICAgIHJhd0FzYXAocmF3VGFzayk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gX2FzYXA7XG4gICAgfSkoKTtcblxuICAgIGNsYXNzIExhenlQcm9taXNlIHtcblxuICAgICAgICBzdGF0aWMgZ2V0IHJhd0FzYXAoKSB7XG4gICAgICAgICAgICByZXR1cm4gcmF3QXNhcDtcbiAgICAgICAgfVxuICAgICAgICBzdGF0aWMgZ2V0IGFzYXAoKSB7XG4gICAgICAgICAgICByZXR1cm4gYXNhcDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0cnVjdG9yKGZuKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgQnJvJyAuLi4gZm4gbWVhbnMgZnVuY3Rpb24sIG5vdCBzb21lIHNoaXQgbGlrZSAkeyB0eXBlb2YgZm4gfSB5b3UgdHJ5IHRvIGdpdmUuIFRzc2ApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuZm4gPSBmbjtcbiAgICAgICAgICAgIHRoaXMucHJvbWlzZSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBfY3JlYXRlUHJvbWlzZSgpIHtcbiAgICAgICAgICAgIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBhc2FwKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZm4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5jcmVhdGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZVByb21pc2UocHJvbWlzZSkge1xuICAgICAgICAgICAgaWYgKCEhcHJvbWlzZSAmJiBwcm9taXNlLl9fcHJvdG9fXy5jb25zdHJ1Y3Rvci5uYW1lID09PSAnUHJvbWlzZScpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByb21pc2UgPSBQcm9taXNlLnJlc29sdmUocHJvbWlzZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoZW4ob25SZXNvbHZlZCwgb25SZWplY3RlZCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmNyZWF0ZWQpIHRoaXMuX2NyZWF0ZVByb21pc2UoKTtcbiAgICAgICAgICAgIHRoaXMucHJvbWlzZSAmJiB0aGlzLnByb21pc2UudGhlbihvblJlc29sdmVkLCBvblJlamVjdGVkKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgY2F0Y2gob25SZWplY3RlZCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmNyZWF0ZWQpIHRoaXMuX2NyZWF0ZVByb21pc2UoKTtcbiAgICAgICAgICAgIHRoaXMucHJvbWlzZSAmJiB0aGlzLnByb21pc2UuY2F0Y2gob25SZWplY3RlZCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGtpbGwoKSB7XG4gICAgICAgICAgICB0aGlzLnByb21pc2UgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2xhc3MgU3VwZXJMYXp5UHJvbWlzZSBleHRlbmRzIExhenlQcm9taXNlIHtcbiAgICAgICAgY29uc3RydWN0b3IoZm4pIHtcbiAgICAgICAgICAgIHN1cGVyKGZuKTtcblxuICAgICAgICAgICAgdGhpcy5zdXBlckxhenlUaGVuQ2F0Y2ggPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoZW4ob25SZXNvbHZlZCwgb25SZWplY3RlZCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmNyZWF0ZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN1cGVyTGF6eVRoZW5DYXRjaC5wdXNoKFtvblJlc29sdmVkLCBvblJlamVjdGVkXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdXBlci50aGVuKG9uUmVzb2x2ZWQsIG9uUmVqZWN0ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY2F0Y2gob25SZWplY3RlZCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmNyZWF0ZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAob25SZWplY3RlZCAmJiB0eXBlb2Ygb25SZWplY3RlZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN1cGVyTGF6eVRoZW5DYXRjaC5wdXNoKG9uUmVqZWN0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1cGVyLmNhdGNoKG9uUmVqZWN0ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYXdha2UoZm4pIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZuID0gZm47XG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZWQgfHwgc3VwZXIuX2NyZWF0ZVByb21pc2UoKTtcbiAgICAgICAgICAgIGZvciAobGV0IHJlc1JlaiBvZiB0aGlzLnN1cGVyTGF6eVRoZW5DYXRjaCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzUmVqID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGFzYXAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYXRjaChyZXNSZWopO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhc2FwKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGhlbi5hcHBseSh0aGlzLCBfdG9Db25zdW1hYmxlQXJyYXkocmVzUmVqKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGV4cG9ydHMuTGF6eVByb21pc2UgPSBMYXp5UHJvbWlzZTtcbiAgICBleHBvcnRzLlN1cGVyTGF6eVByb21pc2UgPSBTdXBlckxhenlQcm9taXNlO1xufSkoX21vZHVsZSwgX2V4cG9ydHMsIGdsb2JhbCB8fCB3aW5kb3cpOyJdLCJmaWxlIjoiTGF6eVByb21pc2UuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
