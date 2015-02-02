var BookCatalog = angular.module('BookCatalog', ['ngRoute', 
						'catalogControllers',
						'angularUtils.directives.dirPagination'])
	.config(function($routeProvider, $locationProvider){
		$routeProvider
			.when('/books', {
				templateUrl: '/tpl/allBooks.html',
				controller: 'mainListing' 
			})
			.when('/new', {
				templateUrl: '/tpl/addBook.html',
				controller: 'addBook'
			})
			.when('/books/:id', {
				templateUrl: '/tpl/bookDetail.html',
				controller: 'bookDetail'
			})
			.otherwise({
				redirectTo: '/books'
			});
		$locationProvider.html5Mode(true);
});
