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

  auth.getUserId = function(){
    if(auth.isLoggedIn()){
      var token = auth.getToken();
      var payload = JSON.parse($window.atob(token.split('.')[1]));
      return payload._id;
    }
  }

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
      post.upvotes += 1;
      post.usersVoted.push(auth.getUserId());
    });
  };

  o.downvote = function(post){
    return $http.put('/posts/' + post._id + '/downvote', null, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).then(function successCallback(res){
      post.upvotes -= 1;
      post.usersVoted.push(auth.getUserId());
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
  };

  o.upvoteComment = function(post, comment){
    return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote', null, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).then(function successCallback(res){
      comment.upvotes += 1;
      comment.usersVoted.push(auth.getUserId());
    });
  };

  o.downvoteComment = function(post, comment){
    return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/downvote', null, {
      headers: { Authorization: 'Bearer ' + auth.getToken() }
    }).then(function successCallback(res){
      comment.upvotes -= 1;
      comment.usersVoted.push(auth.getUserId());
    });
  };

  return o;
}]);

app.controller('MainCtrl', [
  '$scope',
  'posts',
  'auth',
  function($scope, posts, auth){
    $scope.posts = posts.posts;
    console.log(Math.floor((Date.now() - posts.posts[0].created) / 1000));
    $scope.isLoggedIn = auth.isLoggedIn;
    $scope.userId = auth.getUserId;
    $scope.showField = false;

    $scope.addPost = function(){
      if(!$scope.title || $scope.title === ''){ return; }
      posts.create({
        title: $scope.title,
        link: $scope.link,
      });
      $scope.title = '';
      $scope.link = '';
    };

    $scope.incrementUpvotes = function(post){
      if($scope.isLoggedIn()){
        posts.upvote(post);
      }
      else{
        $scope.error = "Must be logged in to vote!";
      }
    };

    $scope.decrementUpvotes = function(post){
      if($scope.isLoggedIn()){
          posts.downvote(post);
      }
      else{
        $scope.error = "Must be logged in to vote!";
      }
    }

    $scope.showAddPost = function(){
      $scope.showField = true;
    }

    $scope.getTimeElapsed = function(post){
      secsDiff = Math.floor((Date.now() - post.created) / 1000);
    }
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
    $scope.showField = false;

    $scope.addComment = function(){
      var name = '';
      if(!$scope.body || $scope.body === ''){ return; }
      else if (!$scope.author || $scope.author === '') {
        name = 'user';
      }
      else{
        name = $scope.author;
      }
      posts.addComment(post._id, {
        body: $scope.body,
        author: name,
      }).then(function successCallback(comment){
        $scope.post.comments.push(comment.data);
      }).catch(function(error){
        console.log(error);
      });
      $scope.body = '';
      $scope.author = '';
    };

    $scope.incrementUpvotes = function(comment){
      if($scope.isLoggedIn()){
        posts.upvoteComment(post, comment);
      }
      else{
        $scope.error = "Must be logged in to vote!";
      }
    };

    $scope.decrementUpvotes = function(comment){
      if($scope.isLoggedIn()){
        posts.downvoteComment(post, comment);
      }
      else{
        $scope.error = "Must be logged in to vote!";
      }
    }

    $scope.showAddComment = function(){
      $scope.showField = true;
    }
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
