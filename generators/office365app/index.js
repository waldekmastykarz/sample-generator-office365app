'use strict';

var generators = require('yeoman-generator');
var chalk = require('chalk');
var path = require('path');
var extend = require('deep-extend');
var guid = require('uuid');
var Xml2Js = require('xml2js');
var _ = require('lodash');

module.exports = generators.Base.extend({
  /**
   * Setup the generator
   */
  constructor: function(){
    generators.Base.apply(this, arguments);

    this.option('skip-install', {
      type: Boolean,
      required: false,
      defaults: false,
      desc: 'Skip running package managers (NPM, bower, etc) post scaffolding'
    });

    this.option('name', {
      type: String,
      desc: 'Title of the Office Add-in',
      required: false
    });

    this.option('root-path', {
      type: String,
      desc: 'Relative path where the Add-in should be created (blank = current directory)',
      required: false
    });
    
    this.option('appId', {
      type: String,
      desc: 'Application ID as registered in Azure AD',
      required: false
    });

    // create global config object on this generator
    this.genConfig = {};
  }, // constructor()

  /**
   * Prompt users for options
   */
  prompting: {

    askFor: function(){
      var done = this.async();

      var prompts = [
        // friendly name of the generator
        {
          name: 'name',
          message: 'Project name (display name):',
          default: 'My Office Add-in',
          when: this.options.name === undefined
        },
        // root path where the addin should be created; should go in current folder where
        //  generator is being executed, or within a subfolder?
        {
          name: 'root-path',
          message: 'Root folder of project?'
          + ' Default to current directory\n (' + this.destinationRoot() + '), or specify relative path\n'
          + '  from current (src / public): ',
          default: 'current folder',
          when: this.options['root-path'] === undefined,
          filter: /* istanbul ignore next */ function(response){
            if (response === 'current folder'){
              return '';
            } else {
              return response;
            }
          }
        },
        {
          name: 'appId',
          message: 'Application ID as registered in Azure AD:',
          default: '00000000-0000-0000-0000-000000000000',
          when: this.options.appId === undefined
        }];

      // trigger prompts
      this.prompt(prompts, function(responses){
        this.genConfig = extend(this.genConfig, this.options);
        this.genConfig = extend(this.genConfig, responses);
        done();
      }.bind(this));

    }

  }, // prompting()

  /**
   * save configurations & config project
   */
  configuring: function(){
    // take name submitted and strip everything out non-alphanumeric or space
    var projectName = this.genConfig.name;
    projectName = projectName.replace(/[^\w\s\-]/g, '');
    projectName = projectName.replace(/\s{2,}/g, ' ');
    projectName = projectName.trim();

    // add the result of the question to the generator configuration object
    this.genConfig.projectInternalName = projectName.toLowerCase().replace(/ /g, '-');
    this.genConfig.projectDisplayName = projectName;
    this.genConfig.rootPath = this.genConfig['root-path'];
  }, // configuring()

  /**
   * write generator specific files
   */
  writing: {
    /**
     * If there is already a package.json in the root of this project,
     * get the name of the project from that file as that should be used
     * in bower.json & update packages.
     */
    upsertPackage: function(){
      var done = this.async();

      // default name for the root project = project
      this.genConfig.rootProjectName = this.genConfig.projectInternalName;

      // path to package.json
      var pathToPackageJson = this.destinationPath('package.json');

      // if package.json doesn't exist
      if (!this.fs.exists(pathToPackageJson)) {
        // copy package.json to target
        this.fs.copyTpl(this.templatePath('_package.json'),
          this.destinationPath('package.json'),
          this.genConfig);
      } else {
        // load package.json
        var packageJson = this.fs.readJSON(pathToPackageJson, 'utf8');

        // .. get it's name property
        this.genConfig.rootProjectName = packageJson.name;

        // update devDependencies
        /* istanbul ignore else */
        if (!packageJson.devDependencies) {
          packageJson.devDependencies = {};
        }
        /* istanbul ignore else */
        if (!packageJson.devDependencies['gulp']) {
          packageJson.devDependencies['gulp'] = '^3.9.0';
        }
        /* istanbul ignore else */
        if (!packageJson.devDependencies['gulp-webserver']) {
          packageJson.devDependencies['gulp-webserver'] = '^0.9.1';
        }

        // overwrite existing package.json
        this.log(chalk.yellow('Adding additional packages to package.json'));
        this.fs.writeJSON(pathToPackageJson, packageJson);
      }

      done();
    }, // upsertPackage()

    /**
     * If bower.json already exists in the root of this project, update it
     * with the necessary packages.
     */
    upsertBower: function(){
      /**
        * Copies bower.json from appropriate template => target.
        *
        * @param {Object} yoGenerator - Yeoman generator.
        */
      this._copyBower = function(yoGenerator){
        this.fs.copyTpl(this.templatePath('_bower.json'),
              this.destinationPath('bower.json'),
              this.genConfig);
      };

      /**
        * Update existing bower.json with the necessary references.
        *
        * @param {Object} yoGenerator - Yeoman generator.
        * @param {string} addinTech - Technology to use for the addin.
        */
      this._updateBower = function(yoGenerator, addinTech){
        // verify the necessary package references are present in bower.json...
        //  if not, add them
        var bowerJson = yoGenerator.fs.readJSON(pathToBowerJson, 'utf8');

        /* istanbul ignore else */
        if (!bowerJson.dependencies['jquery']) {
          bowerJson.dependencies['jquery'] = '~1.9.1';
        }

        /* istanbul ignore else */
        if (!bowerJson.dependencies['angular']) {
          bowerJson.dependencies['angular'] = '~1.4.4';
        }
        /* istanbul ignore else */
        if (!bowerJson.dependencies['angular-route']) {
          bowerJson.dependencies['angular-route'] = '~1.4.4';
        }
        /* istanbul ignore else */
        if (!bowerJson.dependencies['angular-sanitize']) {
          bowerJson.dependencies['angular-sanitize'] = '~1.4.4';
        }
        /* istanbul ignore else */
        if (!bowerJson.dependencies['adal-angular']) {
          bowerJson.dependencies['adal-angular'] = '~1.0.5';
        }

        // overwrite existing bower.json
        yoGenerator.log(chalk.yellow('Adding additional packages to bower.json'));
        yoGenerator.fs.writeJSON(pathToBowerJson, bowerJson);
      };

      // workaround to 'this' context issue
      var yoGenerator = this;

      var done = this.async();

      var pathToBowerJson = this.destinationPath('bower.json');
      // if doesn't exist...
      if (!yoGenerator.fs.exists(pathToBowerJson)) {
        // copy bower.json => project
        this._copyBower(yoGenerator, yoGenerator.genConfig.tech);
      } else {
        // update bower.json => project
        this._updateBower(yoGenerator, yoGenerator.genConfig.tech);
      }

      done();
    }, // upsertBower()

    app: function(){
      // helper function to build path to the file off root path
      this._parseTargetPath = function(file){
        return path.join(this.genConfig['root-path'], file);
      };

      var done = this.async();

      // create a new ID for the project
      this.genConfig.projectId = guid.v4();


        // copy .bowerrc => project
        this.fs.copyTpl(this.templatePath('_bowerrc'),
                        this.destinationPath('.bowerrc'),
                        this.genConfig);

        // create common assets
        this.fs.copy(this.templatePath('gulpfile.js'),
                     this.destinationPath('gulpfile.js'));
        this.fs.copy(this.templatePath('content/Office.css'),
                     this.destinationPath(this._parseTargetPath('content/Office.css')));
        this.fs.copy(this.templatePath('content/fabric.css'),
                     this.destinationPath(this._parseTargetPath('content/fabric.css')));
        this.fs.copy(this.templatePath('content/fabric.min.css'),
                     this.destinationPath(this._parseTargetPath('content/fabric.min.css')));
        this.fs.copy(this.templatePath('content/fabric.rtl.css'),
                     this.destinationPath(this._parseTargetPath('content/fabric.rtl.css')));
        this.fs.copy(this.templatePath('content/fabric.rtl.min.css'),
                     this.destinationPath(this._parseTargetPath('content/fabric.rtl.min.css')));
        this.fs.copy(this.templatePath('content/fabric.components.css'),
                     this.destinationPath(this._parseTargetPath('content/fabric.components.css')));
        this.fs.copy(this.templatePath('content/fabric.components.min.css'),
                     this.destinationPath(this._parseTargetPath('content/fabric.components.min.css')));
        this.fs.copy(this.templatePath('content/fabric.components.rtl.css'),
                     this.destinationPath(this._parseTargetPath('content/fabric.components.rtl.css')));
        this.fs.copy(this.templatePath('content/fabric.components.rtl.min.css'),
                     this.destinationPath(this._parseTargetPath('content/fabric.components.rtl.min.css')));
        this.fs.copy(this.templatePath('images/close.png'),
                     this.destinationPath(this._parseTargetPath('images/close.png')));
        this.fs.copy(this.templatePath('scripts/jquery.fabric.js'),
                     this.destinationPath(this._parseTargetPath('scripts/jquery.fabric.js')));
        this.fs.copy(this.templatePath('scripts/jquery.fabric.min.js'),
                     this.destinationPath(this._parseTargetPath('scripts/jquery.fabric.min.js')));

        // determine startpage for addin
        this.genConfig.startPage = 'https://localhost:8443/index.html';

        // copy tsd & jsconfig files
        this.fs.copy(this.templatePath('_tsd.json'),
                      this.destinationPath('tsd.json'));
        this.fs.copy(this.templatePath('_jsconfig.json'),
                      this.destinationPath('jsconfig.json'));

        // copy addin files
        this.genConfig.startPage = '{https-addin-host-site}/index.html';
        this.fs.copy(this.templatePath('index.html'),
                      this.destinationPath(this._parseTargetPath('index.html')));
        this.fs.copy(this.templatePath('app.adalconfig.js'),
                      this.destinationPath(this._parseTargetPath('app/app.adalconfig.js')));
        this.fs.copyTpl(this.templatePath('app.config.js'),
                      this.destinationPath(this._parseTargetPath('app/app.config.js')), this.genConfig);
        this.fs.copy(this.templatePath('app.module.js'),
                      this.destinationPath(this._parseTargetPath('app/app.module.js')));
        this.fs.copy(this.templatePath('app.routes.js'),
                      this.destinationPath(this._parseTargetPath('app/app.routes.js')));
        this.fs.copy(this.templatePath('home/home.controller.js'),
                      this.destinationPath(this._parseTargetPath('app/home/home.controller.js')));
        this.fs.copy(this.templatePath('home/home.html'),
                      this.destinationPath(this._parseTargetPath('app/home/home.html')));
        this.fs.copy(this.templatePath('services/data.service.js'),
                      this.destinationPath(this._parseTargetPath('app/services/data.service.js')));

      done();
    } // app()

  }, // writing()

  /**
   * conflict resolution
   */
  // conflicts: { },

  /**
   * run installations (bower, npm, tsd, etc)
   */
  install: function(){

    if (!this.options['skip-install']) {
      this.npmInstall();
    }

  } // install ()

  /**
   * last cleanup, goodbye, etc
   */
  // end: { }

});
