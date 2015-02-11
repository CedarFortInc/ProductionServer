BookCatalog.factory("TitleModel", function(isbn, $http, $q){
  
  $http.get('/api/books/' + isbn)
    ;

  

  return {
    
  }

})
