window.debugMode = true;


angular.module('myapp', ['ui.router','ngSanitize'])
.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $urlRouterProvider.otherwise('/');

  $stateProvider
    .state('default', {
      url : '/',
      template: '<main data-countries="$ctrl.countries"></main>',
      resolve: {
        getCountriesResult : 'getCountries'
        
      },
      controller: function($state, cash, getCountriesResult){
        this.countries = getCountriesResult;
      },
      controllerAs : '$ctrl'
    })

    .state('country', {
      parent: 'default',
      url : 'country/:cid/',
      template: '<regionlist  data-regions="$ctrl.regions" data-props="$ctrl.props"></regionlist>',
      controller: function(cash,$state, getRegionsList){
        this.regions = [];
        this.props = {
          title : 'Загрузка',
          population : '-',
          area : '-',
          coord : ['0','0'],
          borders : [],
          isCountry : '1'
        };
        var funcSetRegions = (function(r) {
          this.regions = r.regions;

          this.props.title = cash.countries[$state.params.cid].name;
          this.props.population = r.props.population == '-' ? '-' : Math.round(r.props.population);
          this.props.area = r.props.area == '-' ? '-' : Math.round(r.props.area);
          this.props.borders = r.props.borders;
          this.props.capital = r.props.capital;
          this.props.coord[0] = r.props.coord[0] > 0 ? r.props.coord[0]+'° N':  (-r.props.coord[0])+'° S';
          this.props.coord[1] = r.props.coord[1] > 0 ? r.props.coord[1]+'° E':  (-r.props.coord[1])+'° W';

        }).bind(this);

        if (getRegionsList.getList) {
          getRegionsList.getList().then(funcSetRegions);
        }
        else {
          funcSetRegions(getRegionsList);
        }

      },
      controllerAs : '$ctrl'
    })
    .state('region', {
      parent: 'country',
      url : 'region/:rid/',
      template: '<infoblock info="$ctrl.info" ></infoblock>',
      controller: function(getRegionsInfo, $state, cash){
        this.info = {
          title : 'Загрузка',
          population : '-',
          area : '-',
          coord : ['0','0'],
          borders : [],
          isCountry : '0'
        };

        var funcSetRegions = (function(r) {
          this.info.title = cash.regions[$state.params.rid].name;
          this.info.population = r.population == '-' ? '-' : Math.round(r.population);
          this.info.area = r.area == '-' ? '-' : Math.round(r.area);
          this.info.borders = r.borders;
          this.info.capital = r.capital;
          this.info.coord[0] = r.coord[0] > 0 ? r.coord[0]+'° N':  (-r.coord[0])+'° S';
          this.info.coord[1] = r.coord[1] > 0 ? r.coord[1]+'° E':  (-r.coord[1])+'° W';
        }).bind(this);

        var info = getRegionsInfo.getList();

        if (info.hasOwnProperty('capital')) {
          funcSetRegions(info);
        }
        else {
          getRegionsInfo.getList().then(funcSetRegions);
        }
      },
      controllerAs : '$ctrl'
    });

})
.component('main', {
  templateUrl: 'app/components/main/main.html',
  controllerAs : '$ctrl',
  bindings: {
    countries : '<'
  }
})
.component('countrieslist', {
  templateUrl: 'app/components/countries-list/countries-list.html',
  controllerAs : '$ctrl',
  bindings: {
    countries : '<'
  }
})
.component('regionlist', {
  templateUrl: 'app/components/region-list/region-list.html',
  controllerAs : '$ctrl',
  bindings: {
    regions : '<',
    props : '<'
  },
  controller: function( $state,cash){
    this.infoShow  = function() {
      return $state.params.cid  && !$state.params.rid;
    };
  }
})
.component('infoblock', {
  templateUrl: 'app/components/infoblock/infoblock.html',
  controllerAs : '$ctrl',
  bindings: {
    info : '<'
  },
  controller: function( $state,cash){
    this.params = $state.params;
  }
})

.factory('getCountries', function(cash, $state,$http, $q) {
  var deferred = $q.defer();
  var functionCallBack = function(data) {
    var result = data.props['373'] // 373 - name property
      .sort(function(e1, e2) {
        return e1[2] > e2[2] ? 1 : -1;
      })
      .map(function(e) {
        return {id:e[0], name:e[2]}; 
      });
      result.forEach(function(e){
        cash.countries[e.id]={name:e.name,flag:null};
      });
      this.resolve(result);
  };
  window.callBackFunc = functionCallBack.bind(deferred);
  if (!debugMode) {
    var url ='https://wdq.wmflabs.org/api?q=claim[31:6256]&props=373&callback=callBackFunc';
    $http.jsonp(url);
    return deferred.promise;
  }
  else {
    var result = $http.get("api/countries.json").then(function(res){
      var res = eval(res);
      res.data.forEach(function(e){
        cash.countries[e.id]={name:e.name,flag:null};
      });
      return res.data;
    });
    return  result ;
  }
})
.factory('getRegionsList', function(cash, $state, $http, $q) {
  var func = function() {
    var cid = $state.params.cid+'';
    if (cash.regions.hasOwnProperty(cid)) {
      return cash.regions[cid];
    }
    else {
      this.deferred = $q.defer();
      var functionCallBack = function(data) {
        var regions = [];
        if (data.props['150'] && data.props['150'].length) {
          var regions = data.props['150']
            .map(function(e) {
              return e[2]; 
            });
        }

        var props =  {
          title : '-',
          population : '-',
          area : '-',
          coord : ['0','0'],
          borders : []
        };
        
        if (!cash.countries[cid].hasOwnProperty('props')) {
          cash.countries[cid].props = props;
        }

        // borders
        if (data.props['47'] && data.props['47'].length) {
          cash.countries[cid].props.borders = props.borders = data.props['47'].map(function(e){
            return {id:e[2],name: cash.countries[e[2]] ? cash.countries[e[2]].name : undefined};
          });
        }

        // capital
        if (data.props['36'] && data.props['36'].length) {
          cash.countries[cid].props.capital = props.capital = data.props['36'][0][2];
        }

        // coord
        if (data.props['625'] && data.props['625'].length) {
          cash.countries[cid].props.coord = props.coord = data.props['625'][0][2].split('|').map(function(e){return Math.round(e);});
        }

        // population
        if (data.props['1082'] && data.props['1082'].length) {
          cash.countries[cid].props.population = props.population = data.props['1082'][0][2].split('|')[0];
        }

        // area
        if (data.props['2046'] && data.props['2046'].length) {
          cash.countries[cid].props.area = props.area = data.props['2046'][0][2].split('|')[0];
        }

        window.callBackFuncRegProps = functionCallBackRegProps.bind(this, props);
        var url ='https://wdq.wmflabs.org/api?q=items['+regions+']&props=373&callback=callBackFuncRegProps';
        $http.jsonp(url);

      };
      window.callBackFuncRegList = functionCallBack.bind(this);

      var functionCallBackRegProps = function(props, data) {
        var result = data.props['373'] // 373 - name property
          .sort(function(e1, e2) {
            return e1[2] > e2[2] ? 1 : -1;
          })
          .map(function(e) {
            return {id:e[0], name:e[2]}; 
          });
          result.forEach(function(e) {
            cash.regions[e.id]={name:e.name,cid:cid};
          });
          cash.countries[cid].regions = result;
          cash.countries[cid].props = props;
          this.deferred.resolve(cash.countries[cid]);
      };

      var url ='https://wdq.wmflabs.org/api?q=items['+cid+']&props=*&callback=callBackFuncRegList';
      $http.jsonp(url);
      return this.deferred.promise;
    }
  };
  return {getList:func};
})
.factory('getRegionsInfo', function(cash, $state, $http, $q) {
    var func = function() {
    var rid = $state.params.rid+'';
    if (cash.regions.hasOwnProperty(rid) && cash.regions[rid].hasOwnProperty('props')) {
      return cash.regions[rid].props;
    }
    else {
      this.deferred = $q.defer();
      var functionCallBack = function(data) {
        var props = {
          borders : [],
          capital : null,
          coord : [],
          population : '-',
          area : '-',
        };
        if (!cash.regions.hasOwnProperty(rid)) {
          cash.regions[rid]= {};
        }
        if (!cash.regions[rid].hasOwnProperty('props')) {
          cash.regions[rid].props = props;
        }

        // borders
        if (data.props['47'] && data.props['47'].length) {
          cash.regions[rid].props.borders = props.borders = data.props['47'].map(function(e){
            return {id:e[2],name: cash.regions[e[2]] ? cash.regions[e[2]].name : undefined};
          });
        }

        // capital
        if (data.props['36'] && data.props['36'].length) {
          cash.regions[rid].props.capital = props.capital = data.props['36'][0][2];
        }

        // coord
        if (data.props['625'] && data.props['625'].length) {
          cash.regions[rid].props.coord = props.coord = data.props['625'][0][2].split('|').map(function(e){return Math.round(e);});
        }

        // population
        if (data.props['1082'] && data.props['1082'].length) {
          cash.regions[rid].props.population = props.population = data.props['1082'][0][2].split('|')[0];
        }

        // area
        if (data.props['2046'] && data.props['2046'].length) {
          cash.regions[rid].props.area = props.area = data.props['2046'][0][2].split('|')[0];
        }

        this.deferred.resolve(props);

      };
      window.callBackFuncRegInfo = functionCallBack.bind(this);


      var url ='https://wdq.wmflabs.org/api?q=items['+rid+']&props=*&callback=callBackFuncRegInfo';
      $http.jsonp(url);
      return this.deferred.promise;

    }
  };
  return {getList:func};
})

.factory('cash', function() {
  return {
    countries:{},
    regions:{},
  };
});
