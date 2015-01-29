var BookCatalog = angular.module('BookCatalog', ['ngRoute', 
						'catalogControllers',
						'angularUtils.directives.dirPagination'])
	.config(function($routeProvider, $locationProvider){
		$routeProvider
			.when('/catalog', {
				templateUrl: '/tpl/allBooks.html',
				controller: 'mainListing' 
			})
			.when('/addBook', {
				templateUrl: '/tpl/addBook.html',
				controller: 'addBook'
			})
			.otherwise({
				redirectTo: '/catalog'
			});
		$locationProvider.html5Mode(true);
});
