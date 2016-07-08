'use strict';

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

    /**
     * Use the fastest means possible to execute a task in its own turn, with priority over other events including IO,
     * animation, reflow, and redraw events in browsers.
     *
     * An exception thrown by a task will permanently interrupt the processing of subsequent tasks. The higher level
     * `asap` function ensures that if an exception is thrown by a task, that the task queue will continue flushing as
     * soon as possible, but if you use `rawAsap` directly, you are responsible to either ensure that no exceptions are
     * thrown from your task, or to manually call `rawAsap.requestFlush` if an exception is thrown.
     *
     * @param {{call}} task A callable object, typically a function that takes no arguments.
     * @alias jaggerbomb.utils.LazyPromise.rawAsap
     */
    var rawAsap = (() => {
        /**
         * @param {{call}} task
         * @private
         */
        function _rawAsap(task) {
            if (!queue.length) {
                requestFlush();
                flushing = true;
            }

            // array.push without fn call
            queue[queue.length] = task;
        }

        var queue = [],
            /**
             * Once a flush has been requested, no further calls to `requestFlush` are
             * necessary until the next `flush` completes.
             * @type {boolean}
             */
            flushing = false,
            /**
             * `requestFlush` is an implementation-specific method that attempts to kick
             * off a `flush` event as quickly as possible. `flush` will attempt to exhaust
             * the event queue before yielding to the browser's own event loop.
             * @type {?Function}
             */
            requestFlush = null,
            /**
             * The position of the next task to execute in the task queue. This is
             * preserved between calls to `flush` so that it can be resumed if
             * a task throws an exception.
             * @type {Number}
             */
            index = 0,
            /**
             * If a task schedules additional tasks recursively, the task queue can grow
             * unbounded. To prevent memory exhaustion, the task queue will periodically
             * truncate already-completed tasks.
             * @type {Number}
             */
            capacity = 1024;

        /**
         * The flush function processes all tasks that have been scheduled with
         * `rawAsap` unless and until one of those tasks throws an exception.
         * If a task throws an exception, `flush` ensures that its state will remain
         * consistent and will resume where it left off when called again.
         * However, `flush` does not make any arrangements to be called again if an
         * exception is thrown.
         */
        function flush() {
            while (index < queue.length) {
                var currentIndex = index;
                // Advance the index before calling the task. This ensures that we will
                // begin flushing on the next task the task throws an error.
                index = index + 1;
                queue[currentIndex].call();
                // Prevent leaking memory for long chains of recursive calls to `asap`.
                // If we call `asap` within tasks scheduled by `asap`, the queue will
                // grow, but to avoid an O(n) walk for every task we execute, we don't
                // shift tasks off the queue after they have been executed.
                // Instead, we periodically shift 1024 tasks off the queue.
                if (index > capacity) {
                    // Manually shift all values starting at the index back to the
                    // beginning of the queue.
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

        /**
         * The message channel technique was discovered by Malte Ubl and was the
         * original foundation for this library.
         * http://www.nonblocking.io/2011/06/windownexttick.html
         *
         * Safari 6.0.5 (at least) intermittently fails to create message ports on a
         * page's first load. Thankfully, this version of Safari supports
         * MutationObservers, so we don't need to fall back in that case.
         *
         * function makeRequestCallFromMessageChannel(callback) {
         *     var channel = new MessageChannel();
         *     channel.port1.onmessage = callback;
         *     return function requestCall() {
         *         channel.port2.postMessage(0);
         *     };
         * }
         *
         * For reasons explained above, we are also unable to use `setImmediate`
         * under any circumstances.
         * Even if we were, there is another bug in Internet Explorer 10.
         * It is not sufficient to assign `setImmediate` to `requestFlush` because
         * `setImmediate` must be called *by name* and therefore must be wrapped in a
         * closure.
         * Never forget.
         *
         * function makeRequestCallFromSetImmediate(callback) {
         *     return function requestCall() {
         *         setImmediate(callback);
         *     };
         * }
         *
         * Safari 6.0 has a problem where timers will get lost while the user is
         * scrolling. This problem does not impact ASAP because Safari 6.0 supports
         * mutation observers, so that implementation is used instead.
         * However, if we ever elect to use timers in Safari, the prevalent work-around
         * is to add a scroll event listener that calls for a flush.
         *
         * `setTimeout` does not call the passed callback if the delay is less than
         * approximately 7 in web workers in Firefox 8 through 18, and sometimes not
         * even then.
         *
         * @param {Function} callback
         * @return {Function}
         */
        function makeRequestCallFromTimer(callback) {
            return function requestCall() {
                // We dispatch a timeout with a specified delay of 0 for engines that
                // can reliably accommodate that request. This will usually be snapped
                // to a 4 milisecond delay, but once we're flushing, there's no delay
                // between events.
                var timeoutHandle = setTimeout(handleTimer, 0);
                // However, since this timer gets frequently dropped in Firefox
                // workers, we enlist an interval handle that will try to fire
                // an event 20 times per second until it succeeds.
                var intervalHandle = setInterval(handleTimer, 50);

                function handleTimer() {
                    // Whichever timer succeeds will cancel both timers and
                    // execute the callback.
                    clearTimeout(timeoutHandle);
                    clearInterval(intervalHandle);
                    callback();
                }
            };
        }

        _rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;

        /**
         * `requestFlush` is implemented using a strategy based on data collected from
         * every available SauceLabs Selenium web driver worker at time of writing.
         * https://docs.google.com/spreadsheets/d/1mG-5UYGup5qxGdEMWkhP6BWCz053NUb2E1QoUTU16uA/edit#gid=783724593
         *
         * Safari 6 and 6.1 for desktop, iPad, and iPhone are the only browsers that
         * have WebKitMutationObserver but not un-prefixed MutationObserver.
         * Must use `global` instead of `window` to work in both frames and web
         * workers. `global` is a provision of Browserify, Mr, Mrs, or Mop.
         * @type {MutationObserver}
         */
        const BrowserMutationObserver = root.MutationObserver || root.WebKitMutationObserver;

        // MutationObservers are desirable because they have high priority and work
        // reliably everywhere they are implemented.
        // They are implemented in all modern browsers.
        //
        // - Android 4-4.3
        // - Chrome 26-34
        // - Firefox 14-29
        // - Internet Explorer 11
        // - iPad Safari 6-7.1
        // - iPhone Safari 7-7.1
        // - Safari 6-7
        if (typeof BrowserMutationObserver === 'function') {
            requestFlush = makeRequestCallFromMutationObserver(flush);

        // MessageChannels are desirable because they give direct access to the HTML
        // task queue, are implemented in Internet Explorer 10, Safari 5.0-1, and Opera
        // 11-12, and in web workers in many engines.
        // Although message channels yield to any queued rendering and IO tasks, they
        // would be better than imposing the 4ms delay of timers.
        // However, they do not work reliably in Internet Explorer or Safari.

        // Internet Explorer 10 is the only browser that has setImmediate but does
        // not have MutationObservers.
        // Although setImmediate yields to the browser's renderer, it would be
        // preferrable to falling back to setTimeout since it does not have
        // the minimum 4ms penalty.
        // Unfortunately there appears to be a bug in Internet Explorer 10 Mobile (and
        // Desktop to a lesser extent) that renders both setImmediate and
        // MessageChannel useless for the purposes of ASAP.
        // https://github.com/kriskowal/q/issues/396

        // Timers are implemented universally.
        // We fall back to timers in workers in most engines, and in foreground
        // contexts in the following browsers.
        // However, note that even this simple case requires nuances to operate in a
        // broad spectrum of browsers.
        //
        // - Firefox 3-13
        // - Internet Explorer 6-9
        // - iPad Safari 4.3
        // - Lynx 2.8.7
        } else {
            requestFlush = makeRequestCallFromTimer(flush);
        }

        /**
         * `requestFlush` requests that the high priority event queue be flushed as
         * soon as possible.
         * This is useful to prevent an error thrown in a task from stalling the event
         * queue if the exception handled by Node.js’s
         * `process.on("uncaughtException")` or by a domain.
         * @type {?Function}
         */
        _rawAsap.requestFlush = requestFlush;

        /**
         * To request a high priority event, we induce a mutation observer by toggling
         * the text of a text node between "1" and "-1".
         *
         * @param {Function} callback
         * @returns {Function}
         */
        function makeRequestCallFromMutationObserver(callback) {
            var toggle = 1;
            var observer = new BrowserMutationObserver(callback);
            var node = document.createTextNode("");
            observer.observe(node, {characterData: true});
            return function requestCall() {
                toggle = -toggle;
                node.data = toggle;
            };
        }

        return _rawAsap;
    })();

    /**
     * Calls a task as soon as possible after returning, in its own event, with priority over other events like
     * animation, reflow, and repaint. An error thrown from an event will not interrupt, nor even substantially slow
     * down the processing of other events, but will be rather postponed to a lower priority event.
     *
     * @param {{call}} task A callable object, typically a function that takes no arguments.
     * @alias jaggerbomb.utils.LazyPromise.asap
     */
    var asap = (() => {
        /**
         * RawTasks are recycled to reduce GC churn.
         * @type {RawTask[]}
         */
        var freeTasks = [],

        /**
         * We queue errors to ensure they are thrown in right order (FIFO).
         * Array-as-queue is good enough here, since we are just dealing with exceptions.
         * @type {Error[]}
         */
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
                    // In a web browser, exceptions are not fatal. However, to avoid
                    // slowing down the queue of pending tasks, we rethrow the error in a
                    // lower priority turn.
                    pendingErrors.push(error);
                    requestErrorThrow();
                } finally {
                    this.task = null;
                    freeTasks[freeTasks.length] = this;
                }
            }
        }

        /**
         * @param {{call}} task
         * @private
         */
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

    /**
     * Build a lazy Promise that initialize only the first `then` or `catch`.
     *
     * The execution will overload the setTimeout/setInterval/setImmediate thread with a pool of task (for each promise)
     * handled by the `LazyPromise.asap` (and `rawAsap`) methods. And it's sexy.
     *
     * @memberOf jaggerbomb.utils
     */
    class LazyPromise {

        static get rawAsap() {
            return rawAsap;
        }
        static get asap() {
            return asap;
        }

        /**
         * Juste like a real
         * {@link https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Promise Promise}
         *
         * @see Promise
         * 
         * @param {Function} fn
         *
         * @throw TypeError when fn is not a function
         */
        constructor(fn) {
            if (typeof fn !== 'function') {
                throw new TypeError(`Bro' ... fn means function, not some shit like ${typeof fn} you try to give. Tss`);
            }

            this.created = false;
            this.fn = fn;
            this.promise = null;
        }

        /**
         * Create the internal promise when we need it.
         *
         * @protected
         */
        _createPromise() {
            this.promise = new Promise((resolve, reject) => {
                asap(() => {
                    try { this.fn(resolve, reject); }
                    catch (e) { reject(e); }
                });
            });

            this.created = true;
        }

        /**
         * Update the internal promise to re-init the lazy process.
         *
         * @param {Promise} promise
         */
        updatePromise(promise) {
            if (!!promise && promise.__proto__.constructor.name === 'Promise') {
                this.promise = Promise.resolve(promise);
                this.created = true;
            }
        }

        /**
         * @see Promise#then
         *
         * @param {Function} onResolved
         * @param {Function} onRejected
         * @return {LazyPromise}
         */
        then(onResolved, onRejected) {
            if (!this.created) this._createPromise();
            this.promise && this.promise.then(onResolved, onRejected);
            return this;
        }

        /**
         * @see Promise#catch
         *
         * @param {Function} onRejected
         * @return {LazyPromise}
         */
        catch(onRejected) {
            if (!this.created) this._createPromise();
            this.promise && this.promise.catch(onRejected);
            return this;
        }

        /**
         * Kill & destroy the promise and cancel the lazy concept.
         */
        kill() {
            this.promise = null;
        }
    }

    /**
     * Build a **super lazy** `Promise` that initialize only when we *awake* it.
     *
     * Like the classic `LazyPromise`, the execution will overload the setTimeout/setInterval/setImmediate thread with
     * a pool of task (for each promise) handled by the `LazyPromise.asap` (and `rawAsap`) methods. And it's super sexy.
     *
     * @extends jaggerbomb.utils.LazyPromise
     *
     * @memberOf jaggerbomb.utils
     */
    class SuperLazyPromise extends LazyPromise {
        /**
         * Juste like a real {@link https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Promise Promise}
         *
         * @see {Promise}
         * @param {Function} [fn] The executor
         */
        constructor(fn) {
            super(fn);
            // FIFO
            this.superLazyThenCatch = [];
        }

        /**
         * @inheritDoc
         */
        then(onResolved, onRejected) {
            if (!this.created) {
                this.superLazyThenCatch.push([onResolved, onRejected]);
                return this;
            } else {
                return super.then(onResolved, onRejected);
            }
        }

        /**
         * @inheritDoc
         */
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

        /**
         * All the super lazy logic stand here. This is the entry point to awake the lazy promise.  
         * At this time, the FIFO of then and catch is called by `asap` in order.
         *
         * @param {Function} [fn] The maybe new promise executor
         */
        awake(fn) {
            if (typeof fn === 'function') {
                this.fn = fn;
                this.created = false;
            }
            this.created || super._createPromise();
            for(let resRej of this.superLazyThenCatch) {
                if (typeof resRej === 'function') {
                    asap(() => {
                        this.catch(resRej);
                    });
                } else {
                    asap(() => {
                        this.then(...resRej);
                    });
                }
            }
        }
    }

    exports.LazyPromise = LazyPromise;
    exports.SuperLazyPromise = SuperLazyPromise;
})(_module, _exports, (global || window));
