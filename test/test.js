'use strict';

const   lp = require('../dist_node/LazyPromise'),
        LazyPromise = lp.LazyPromise,
        SuperLazyPromise = lp.SuperLazyPromise,
        mocha = require('mocha'),
        should = require('should');

describe('LazyPromise', () => {
    describe('construct', () => {
        it('should give us a promise only when we need it', done => {
            var test = null;
            let p = new LazyPromise(function(ok, ko) {
                test = this;
                ok();
            });
            should.not.exists(test);

            p.then(anything => {
                done();
            }, err => done(err));

            should.exist(p.promise);
        });
    });

});

describe('SuperLazyPromise', () => {
    describe('construct', () => {
        it('should give us a promise only when we trigger it', done => {
            var test = null;
            let p = new SuperLazyPromise(function(ok, ko) {
                test = this;
                ok();
            });
            should.not.exists(test);

            p.then(anything => {
                done();
            }, err => done(err));

            should.not.exist(test);
            should.not.exist(p.promise);

            p.awake();

            should.exist(p.promise);
        })
    });
});
