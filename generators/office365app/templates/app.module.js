(function(){
  'use strict';

  // create
  var office365app = angular.module('office365app', [
    'ngRoute',
    'ngSanitize',
    'AdalAngular'
  ]);

  // configure
  office365app.config(['$logProvider', function($logProvider){
    // set debug logging to on
    if ($logProvider.debugEnabled) {
      $logProvider.debugEnabled(true);
    }
  }]);

  jQuery(function() {
    angular.bootstrap(jQuery('#container'), ['office365app']);
  });

})();
