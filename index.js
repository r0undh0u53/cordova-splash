var fs     = require('fs');
var xml2js = require('xml2js');
var ig     = require('imagemagick');
var colors = require('colors');
var _      = require('underscore');
var Q      = require('q');

/**
 * Check which platforms are added to the project and return their splash screen names and sizes
 *
 * @param  {String} projectName
 * @return {Promise} resolves with an array of platforms
 */
var getPlatforms = function (projectName) {
    var deferred = Q.defer();
    var platforms = [];
    platforms.push({
        name : 'ios',
        // TODO: use async fs.exists
        isAdded : fs.existsSync('res/screen/ios'),
        splashPath : 'res/screen/ios/',
        splash : [
            // iPhone Non-Retina (1x)
            { name : 'screen-iphone-portrait.png',          width : 320,  height : 480 },
            { name : 'screen-iphone-landscape.png',         width : 480,  height : 320 },
            // iPhone Retina (2x)
            { name : 'screen-iphone-portrait-2x.png',       width : 640,  height : 960 },
            { name : 'screen-iphone-landscape-2x.png',      width : 960,  height : 640 },
            // iPhone 5 Retina (2x)
            { name : 'screen-iphone-portrait-568h-2x.png',  width : 640,  height : 1136 },
            { name : 'screen-iphone-landscape-568h-2x.png', width : 1136, height : 640 },
            // iPhone 6 (2x)
            { name : 'screen-iphone-portrait-667h-2x.png',  width : 750,  height : 1334 },
            { name : 'screen-iphone-landscape-667h-2x.png', width : 1334, height : 750 },
            // iPhone 6 Plus (3x)
            { name : 'screen-iphone-portrait-736h-3x.png',  width : 1242, height : 2208 },
            { name : 'screen-iphone-landscape-736h-3x.png', width : 2208, height : 1242 },

            // iPad Non-Retina (1x)
            { name : 'screen-ipad-portrait.png',            width : 768,  height : 1024 },
            { name : 'screen-ipad-landscape.png',           width : 1024, height : 768 },
            // iPad Retina (2x)
            { name : 'screen-ipad-portrait-2x.png',         width : 1536, height : 2048 },
            { name : 'screen-ipad-landscape-2x.png',        width : 2048, height : 1536 },
        ]
    });
    platforms.push({
        name : 'android',
        isAdded : fs.existsSync('res/screen/android'),
        splashPath : 'res/screen/android/',
        splash : [
            { name : 'screen-ldpi-landscape.png',  width : 320, height: 200 },
            { name : 'screen-mdpi-landscape.png',  width : 480, height: 320 },
            { name : 'screen-hdpi-landscape.png',  width : 800, height: 480 },
            { name : 'screen-xhdpi-landscape.png', width : 1280, height: 720 },

            { name : 'screen-ldpi-portrait.png',  width : 200, height: 320 },
            { name : 'screen-mdpi-portrait.png',  width : 320, height: 480 },
            { name : 'screen-hdpi-portrait.png',  width : 480, height: 800 },
            { name : 'screen-xhdpi-portrait.png', width : 720, height: 1280 },
        ]
    });
    // TODO: add all platforms
    deferred.resolve(platforms);
    return deferred.promise;
};


/**
 * @var {Object} settings - names of the config file and of the splash image
 * TODO: add option to get these values as CLI params
 */
var settings = {};
settings.CONFIG_FILE = 'config.xml';
settings.SPLASH_FILE   = 'splash-2208.png';

/**
 * @var {Object} console utils
 */
var display = {};
display.success = function (str) {
    str = '✓  '.green + str;
    console.log('  ' + str);
};
display.error = function (str) {
    str = '✗  '.red + str;
    console.log('  ' + str);
};
display.header = function (str) {
    console.log('');
    console.log(' ' + str.cyan.underline);
    console.log('');
};

/**
 * read the config file and get the project name
 *
 * @return {Promise} resolves to a string - the project's name
 */
var getProjectName = function () {
    var deferred = Q.defer();
    var parser = new xml2js.Parser();
    data = fs.readFile(settings.CONFIG_FILE, function (err, data) {
        if (err) {
            deferred.reject(err);
        }
        parser.parseString(data, function (err, result) {
            if (err) {
                deferred.reject(err);
            }
            var projectName = result.widget.name[0];
            deferred.resolve(projectName);
        });
    });
    return deferred.promise;
};

/**
 * Crops and creates a new splash in the platform's folder.
 *
 * @param  {Object} platform
 * @param  {Object} splash
 * @return {Promise}
 */
var generateSplash = function (platform, splash) {
    var deferred = Q.defer();
    ig.crop({
        srcPath: settings.SPLASH_FILE,
        dstPath: platform.splashPath + splash.name,
        quality: 1,
        format: 'png',
        width: splash.width,
        height: splash.height,
    } , function(err, stdout, stderr){
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve();
            display.success(splash.name + ' created');
        }
    });
    return deferred.promise;
};

/**
 * Generates splash based on the platform object
 *
 * @param  {Object} platform
 * @return {Promise}
 */
var generateSplashForPlatform = function (platform) {
    var deferred = Q.defer();
    display.header('Generating splash screen for ' + platform.name);
    var all = [];
    var splashes = platform.splash;
    splashes.forEach(function (splash) {
        all.push(generateSplash(platform, splash));
    });
    Q.all(all).then(function () {
        deferred.resolve();
    }).catch(function (err) {
        console.log(err);
    });
    return deferred.promise;
};

/**
 * Goes over all the platforms and triggers splash screen generation
 *
 * @param  {Array} platforms
 * @return {Promise}
 */
var generateSplashes = function (platforms) {
    var deferred = Q.defer();
    var sequence = Q();
    var all = [];
    _(platforms).where({ isAdded : true }).forEach(function (platform) {
        sequence = sequence.then(function () {
            return generateSplashForPlatform(platform);
        });
        all.push(sequence);
    });
    Q.all(all).then(function () {
        deferred.resolve();
    });
    return deferred.promise;
};

/**
 * Checks if at least one platform was added to the project
 *
 * @return {Promise} resolves if at least one platform was found, rejects otherwise
 */
var atLeastOnePlatformFound = function () {
    var deferred = Q.defer();
    getPlatforms().then(function (platforms) {
        var activePlatforms = _(platforms).where({ isAdded : true });
        if (activePlatforms.length > 0) {
            display.success('platforms found: ' + _(activePlatforms).pluck('name').join(', '));
            deferred.resolve();
        } else {
            display.error('No cordova platforms found. Make sure you are in the root folder of your Cordova project and add platforms with \'cordova platform add\'');
            deferred.reject();
        }
    });
    return deferred.promise;
};

/**
 * Checks if a valid splash file exists
 *
 * @return {Promise} resolves if exists, rejects otherwise
 */
var validSplashExists = function () {
    var deferred = Q.defer();
    fs.exists(settings.SPLASH_FILE, function (exists) {
        if (exists) {
            display.success(settings.SPLASH_FILE + ' exists');
            deferred.resolve();
        } else {
            display.error(settings.SPLASH_FILE + ' does not exist in the root folder');
            deferred.reject();
        }
    });
    return deferred.promise;
};

/**
 * Checks if a config.xml file exists
 *
 * @return {Promise} resolves if exists, rejects otherwise
 */
var configFileExists = function () {
    var deferred = Q.defer();
    fs.exists(settings.CONFIG_FILE, function (exists) {
        if (exists) {
            display.success(settings.CONFIG_FILE + ' exists');
            deferred.resolve();
        } else {
            display.error('cordova\'s ' + settings.CONFIG_FILE + ' does not exist in the root folder');
            deferred.reject();
        }
    });
    return deferred.promise;
};

display.header('Checking Project & Splash');

atLeastOnePlatformFound()
    .then(validSplashExists)
    .then(configFileExists)
    .then(getProjectName)
    .then(getPlatforms)
    .then(generateSplashes)
    .catch(function (err) {
        if (err) {
            console.log(err);
        }
    }).then(function () {
        console.log('');
    });
