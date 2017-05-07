// Include gulp
var gulp = require('gulp');


// Include plugins
var sassCompiler = require('gulp-sass');
var minifyCss = require('gulp-clean-css');
var minifyJs = require('gulp-uglify');
var rename = require('gulp-rename');
var browserSync = require('browser-sync');
const image = require('gulp-image');
var inlineSvg = require('gulp-inline-svg');
var svgmin = require('gulp-svgmin');
var fs    = require('fs');
var sourcemaps   = require('gulp-sourcemaps');
var stream = browserSync.stream;
var reload = browserSync.reload;

var config = {
    bowerDir: './bower_components',
    inputDir: './src',
    outputDir: './extension/'
};

var basePort = 8080;
var httpPort = 8081;
var httpsPort = 8082;
var browserSyncPort = 8088;
var localDomain = 'localhost:' + basePort;

var sassOptions = {
    errLogToConsole: true,
    style: 'compressed',
    outputStyle: 'expanded',
    precision: 8,
    includePaths: [
        config.bowerDir + '/font-awesome/scss'
    ]
};

var browserSyncOptions = {
    server: {
        baseDir: [config.outputDir],
        directory: true
    },
    open: false,
    port: browserSyncPort
};

var httpProxyOptions = {
    target: {
        host: 'localhost',
        port: browserSyncPort
    }
};

var httpsOptions = {
    key: fs.readFileSync('localhost.key.pem', 'utf8'),
    cert: fs.readFileSync('localhost.cert.pem', 'utf8')
}


function liveReload(){
    browserSync(browserSyncOptions);

    var net = require('net');
    var http = require('http');
    var https = require('https');
    var httpProxy = require('http-proxy');

    function tcpConnection(conn) {
        conn.once('data', function (buf) {
            // A TLS handshake record starts with byte 22.
            var address = (buf[0] === 22) ? httpsPort : httpPort;
            var proxy = net.createConnection(address, function () {
                proxy.write(buf);
                conn.pipe(proxy).pipe(conn);
            });
        });
    }

    net.createServer(tcpConnection).listen(basePort);
    var proxy = new httpProxy.createProxyServer(httpProxyOptions);
    var httpServer = http.createServer(function(req, res){
        proxy.web(req, res);
    });
    var proxyServer = https.createServer(httpsOptions, function(req, res){
        proxy.web(req, res);
    });

    httpServer.on('upgrade', function(req, socket, head){
        proxy.ws(req, socket, head);
    });

    proxyServer.on('upgrade', function(req, socket, head){
        proxy.ws(req, socket, head);
    });

    httpServer.listen(httpPort);
    proxyServer.listen(httpsPort);
};


function sass(){
    var autoprefixer = require('gulp-autoprefixer');
    var autoprefixerOptions = {
        browsers: ['last 2 versions', '> 5%', 'Firefox ESR']
    };

    return gulp.src(config.inputDir + '/scss/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sassCompiler(sassOptions).on('error', sassCompiler.logError))
        .pipe(minifyCss({
            compatibility: 'ie8'
            ,specialComments: 0
            //,format: 'keep-breaks'
        }))
        .pipe(rename({
            suffix: ".min"
        }))
        .pipe(autoprefixer(autoprefixerOptions))
        .pipe(sourcemaps.write({
            sourceRoot: '../scss'
        }))
        .pipe(gulp.dest(config.outputDir +'/css'))
        .pipe(stream({match: '**/*.css'}));
};

function jquery(){
    return gulp.src(config.bowerDir + '/jquery/dist/jquery.min.*')
        .pipe(gulp.dest(config.outputDir + '/js'));
};

function fontawesome_fonts(){
    return gulp.src([
        config.bowerDir + '/font-awesome/fonts/*'])
        .pipe(gulp.dest(config.outputDir + '/fonts'));
};

function semantic_css(){
    return gulp.src([
        config.bowerDir + '/semantic-ui/dist/semantic.min.css'])
        .pipe(gulp.dest(config.outputDir + '/css'));
};

function semantic_fonts(){
    return gulp.src([
        config.bowerDir + '/semantic-ui/dist/themes/default/**/*'])
        .pipe(gulp.dest(config.outputDir + '/css/themes/default'));
};

function semantic_js(){
    return gulp.src([
        config.bowerDir + '/semantic-ui/dist/semantic.min.js'])
        .pipe(gulp.dest(config.outputDir + '/js'));
};

function image_min(){
    return gulp.src([
        config.inputDir + '/img/*.{jpg,jpeg,png}'])
        .pipe(image({zopflipng: false}))
        .pipe(gulp.dest(config.outputDir + '/img'))
        .pipe(stream());
};

function js_min(){
    return gulp.src([
        config.inputDir + '/js/*.js'])
        .pipe(sourcemaps.init())
        .pipe(minifyJs())
        .pipe(rename({
            suffix: ".min"
        }))
        .pipe(sourcemaps.write( '.' ))
        .pipe(gulp.dest(config.outputDir + '/js'))
        .pipe(stream());
};

function svg(){
    return gulp.src([
        config.inputDir + '/svg/*.svg'])
        .pipe(svgmin())
        .pipe(inlineSvg())
        .pipe(gulp.dest(config.inputDir + '/scss'));
};

function html(){
    return gulp.src([
        config.inputDir + '/html/**/*.html'])
        .pipe(gulp.dest(config.outputDir + '/html'));
};

function json(){
    return gulp.src([
        config.inputDir + '/*.json'])
        .pipe(gulp.dest(config.outputDir));
};

function watch(){
    gulp.watch(config.inputDir + '/html/**/*.html', html);
    gulp.watch(config.outputDir + '/html/**/*.html').on('change', reload);
    gulp.watch(config.inputDir + '/js/*.js', js_min);
    gulp.watch(config.inputDir + '/scss/**/*.scss', sass);
    gulp.watch(config.inputDir + '/img/*.{jpg,jpeg,png}', image);
    gulp.watch(config.inputDir + '/svg/*.svg', svg);
};


exports.svg               = svg;
exports.sass              = sass;
exports.html              = html;
exports.jquery            = jquery;
exports.fontawesome_fonts = fontawesome_fonts;
exports.semantic_css      = semantic_css;
exports.semantic_js       = semantic_js;
exports.semantic_fonts    = semantic_fonts;
exports.image_min         = image_min;
exports.js_min            = js_min;
exports.liveReload        = liveReload;
exports.watch             = watch;

var build = gulp.series(svg, gulp.parallel(sass, html, json, image_min, js_min, jquery, fontawesome_fonts, semantic_css, semantic_js, semantic_fonts));

gulp.task('build', build);
gulp.task('default', gulp.series(build, gulp.parallel(liveReload, watch)));

