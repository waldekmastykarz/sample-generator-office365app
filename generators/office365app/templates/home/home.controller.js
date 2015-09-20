(function(){
  'use strict';

  angular.module('office365app')
         .controller('homeController', ['dataService', homeController]);

  /**
   * Controller constructor
   */
  function homeController(dataService){
    var vm = this;  // jshint ignore:line
    vm.title = 'home controller';
    vm.dataObject = {};

    getDataFromService();

    function getDataFromService(){
      dataService.getData()
        .then(function(response){
          vm.dataObject = response;
        });
    }
  }

})();
