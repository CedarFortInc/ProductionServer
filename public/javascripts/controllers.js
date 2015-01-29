var catalogControllers = angular.module('catalogControllers', [])

catalogControllers.controller('mainListing', function($scope, $http){
	$http.get('/api/books').
		success(function(data){$scope.books = data}).
		error(function(){$scope.error = "<p>Couldn't get book list.</p>"
	});
});

catalogControllers.controller('addBook', function($scope, $http){
	$scope.title = {title: 'Blank', isbns: {}};
	$scope.newType = 'Add New';
	$scope.addISBN = function(isbns, type){
		type = type.toLowerCase();
		if (isbns[type] == null && type !== 'add new') isbns[type] = '';
	};
})
