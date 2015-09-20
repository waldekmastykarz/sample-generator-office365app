'use strict';

var generators = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var extend = require('deep-extend');

module.exports = generators.Base.extend({
  constructor: function(){

    generators.Base.apply(this, arguments);

    this.option('skip-install', {
      type: Boolean,
      desc: 'Skip running package managers (NPM, bower, etc) post scaffolding',
      required: false,
      defaults: false
    });

    this.option('name', {
      type: String,
      desc: 'Title of the Office Project',
      required: false
    });

    this.option('root-path', {
      type: String,
      desc: 'Relative path where the project should be created (blank = current directory)',
      required: false
    });
    
    this.option('appId', {
      type: String,
      desc: 'Application ID as registered in Azure AD',
      required: false
    });

  }, // constructor()

  /**
   * Generator initalization
   */
  initializing: function(){
    this.log(yosay('Welcome to the ' +
      chalk.red('Office 365 Web Application') +
      ' project generator, by ' +
      chalk.red('@OfficeDev') +
      '! Let\'s create a project together!'));

    // generator configuration
    this.genConfig = {};
  }, // initializing()

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
          default: 'My Office Project',
          when: this.options.name === undefined
        },
        // root path where the addin should be created; should go in current folder where
        //  generator is being executed, or within a subfolder?
        {
          name: 'root-path',
          message: 'Root folder of project?'
          + ' Default to current directory\n'
          + ' (' + this.destinationRoot() + '),'
          + ' or specify relative path\n'
          + ' from current (src / public): ',
          default: 'current folder',
          when: this.options['root-path'] === undefined,
          filter: /* istanbul ignore next */ function(response){
            if (response === 'current folder') {
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

    } // askFor()

  }, // prompting()

  default: function(){

    this.composeWith('office365app:office365app', {
          options: {
            name: this.genConfig.name,
            'root-path': this.genConfig['root-path'],
            'skip-install': this.options['skip-install'],
            appId: this.genConfig.appId
          }
        }, {
            local: require.resolve('../office365app')
        });
  }, // default()

  /**
   * write generator specific files
   */
  // writing: { },

  /**
   * conflict resolution
   */
  // conflicts: { },

  /**
   * run installations (bower, npm, tsd, etc)
   */
  // install: { },

  /**
   * last cleanup, goodbye, etc
   */
  // end: { }
});
