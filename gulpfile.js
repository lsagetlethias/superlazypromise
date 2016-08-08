const   gulp = require('gulp'),
        clean = require('gulp-clean'),
        babel = require('gulp-babel'),
        sourcemaps = require('gulp-sourcemaps'),
        gutil = require('gulp-util'),
        concat = require('gulp-concat');

gulp.task('build', ['clean'], () => {
    gutil.log('Build for Node ...');
    gulp.src('src/**/*.js')
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ['es2015-node4'],
            comments: false
        }).on('error', err => gutil.log('Some shit appends for node dist ... ', err.message)))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist_node'));

    gutil.log('Build for browser ...');
    gulp.src('src/**/*.js')
        .pipe(babel({
            presets: ['es2015'],
            comments: false
        }).on('error', err => gutil.log('Some shit appends for browser dist ...', err.message)))
        .pipe(sourcemaps.init())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist_browser'));

    gulp.src('dist_browser/**/*.js')
        .pipe(concat('LazyPromise.browser.js'))
        .pipe(gulp.dest('bin'));
});

gulp.task('clean', () => {
    gulp.src(['dist_node/**/*', 'dist_browser/**/*', 'temp'], {read: false})
        .pipe(clean())
});

gulp.task('watch', ['build'], () => {
    gulp.watch(['bower.json', 'src/index.html']);
    gulp.watch('src/**/*.js', ['build']);
});

gulp.task('default', ['watch']);
