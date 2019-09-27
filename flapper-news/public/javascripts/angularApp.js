var app = angular.module('flapperNews', ['ui.router']);

app.config([
  '$stateProvider',
  '$urlRouterProvider',
  function($stateProvider, $urlRouterProvider){

    $stateProvider
      .state('home', {
        url: '/home',
        templateUrl: '/home.html',
        controller: 'MainCtrl',
        resolve: {
          postPromise: ['posts', function(posts){
            return posts.getAll();
          }]
        }
      })
      .state('posts', {
        url: '/posts/{id}',
        templateUrl: '/posts.html',
        controller: 'PostsCtrl',
        resolve: {
          post: ['$stateParams', 'posts', function($stateParams, posts){
            return posts.get($stateParams.id);
          }]
        }
      })
      .state('login', {
        url: '/login',
        templateUrl: '/login.html',
        controller: 'AuthCtrl',
        onEnter: ['$state', 'auth', function($state, auth){
          if(auth.isLoggedIn()){
            $state.go('home');
          }
        }]
      })
      .state('register', {
        url: '/register',
        templateUrl: '/register.html',
        controller: 'AuthCtrl',
        onEnter: ['$state', 'auth', function($state, auth){
          if(auth.isLoggedIn()){
            $state.go('home');
          }
        }]
      });

      $urlRouterProvider.otherwise('home');
  }]);

app.factory('auth', ['$http', '$window', function($http, $window){
  var auth = {};

  auth.saveToken = function(token){
    $window.localStorage['flapper-news-token'] = token;
  };

  auth.getToken = function(){
    return $window.localStorage['flapper-news-token'];
  };

  auth.isLoggedIn = function(){
    var token = auth.getToken();

    if(token){
      var payload = JSON.parse($window.atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    }
    else{
      return false;
    }
  };

  auth.currentUser = function(){
    if(auth.isLoggedIn()){
      var token = auth.getToken();
      var payload = JSON.parse($window.atob(token.split('.')[1]));
      return payload.username;
    }
  };

  auth.register = function(user){
    return $http.post('/register', user).then(function successCallback(res){
      auth.saveToken(res.data.token);
    });
  };

  auth.logIn = function(user){
    return $http.post('/login', user).then(function successCallback(res){
      auth.saveToken(res.data.token);
    });
  };

  auth.logOut = function(){
    $window.localStorage.removeItem('flapper-news-token');
  };

  return auth;
}]);

app.factory('posts', ['$http', 'auth', function($http, auth){
  var o = {
    posts: []
  };

  o.getAll = function(){
    return $http.get('/posts').then(function successCallback(res){
      angular.copy(res.data, o.posts);
    });
  };

  o.create = function(post){
    return $http.post('/posts', post, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).then(function successCallback(res){
      o.posts.push(res.data);
    });
  };

  o.upvote = function(post){
    return $http.put('/posts/' + post._id + '/upvote', null, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).then(function successCallback(res){
      post.upvotes +=1;
    });
  };

  o.get = function(id){
    return $http.get('/posts/' + id).then(function(res){
      return res.data;
    });
  };

  o.addComment = function(id, comment){
    return $http.post('/posts/' + id + '/comments', comment, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    });
    // }).then(function successCallback(res){
    //   o.posts.comments.push(res.data);
    // });
  };

  o.upvoteComment = function(post, comment){
    return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote', null, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).then(function successCallback(response){
      comment.upvotes += 1;
    })
  }

  return o;
}]);

app.controller('MainCtrl', [
  '$scope',
  'posts',
  'auth',
  function($scope, posts, auth){
    $scope.posts = posts.posts;
    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.addPost = function(){
      if(!$scope.title || $scope.title === ''){return;}
      posts.create({
        title: $scope.title,
        link: $scope.link,
      });
      $scope.title = '';
      $scope.link = '';
    };

    $scope.incrementUpvotes = function(post){
      posts.upvote(post);
    };

  }
]);

app.controller('PostsCtrl', [
  '$scope',
  'posts',
  'post',
  'auth',
  function($scope, posts, post, auth){
    $scope.post = post;
    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.addComment = function(){
      if($scope.body === ''){ return; }
      posts.addComment(post._id, {
        body: $scope.body,
        author: 'user',
      }).then(function successCallback(comment){
        $scope.post.comments.push(comment.data);
      }).catch(function(error){
        console.log(error);
      });
      $scope.body = '';
    };

    $scope.incrementUpvotes = function(comment){
      posts.upvoteComment(post, comment);
    };
  }
]);

app.controller('AuthCtrl', [
  '$scope',
  '$state',
  'auth',
  function($scope, $state, auth){
    $scope.user = {};

    $scope.register = function(){
      auth.register($scope.user).then(function(){
        $state.go('home');
      }).catch(function(error){
        $scope.error = error.data;
      });
    };

    $scope.logIn = function(){
      auth.logIn($scope.user).then(function(){
        $state.go('home');
      }).catch(function(error){
        $scope.error = error.data;
      });
    };
  }
]);

app.controller('NavCtrl', [
  '$scope',
  'auth',
  function($scope, auth){
    $scope.isLoggedIn = auth.isLoggedIn;
    $scope.currentUser = auth.currentUser;
    $scope.logOut = auth.logOut;
  }
]);
