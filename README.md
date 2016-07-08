# superlazypromise

Promise made lazy !

## Installation

Then install it via npm:

``` bash
$ npm install --save superlazypromise
```

Or via bower:

``` bash
$ bower install --save superlazypromise
```

## Example Usage

``` js
const LazyPromise = require('superlazypromise').LazyPromise;

let promise = new LazyPromise((resolve, reject) => {
    // stuff
});
promise.then(/* fn */); // <- promise executed here
```


License
----

ISC License. See the `LICENSE` file.
