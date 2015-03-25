var db = require('../data/api.js');

console.log("Putting User")
db.putUser(null, {username: 'joetest123', password_hash: '123qwe', roles: ['Admin', 'Editor']}, function(){ 
  console.log("Getting User")
  db.getUser(null, 'joetest123', function(){
    console.log("Authing User")
    db.postUser(null, 'joetest123', '123qwe', function(){
      console.log("Deleting User")
      db.deleteUser(null, 'joetest123', function(){
        console.log("Getting Empty User")
        db.getUser(null, 'joetest123', function(){
          console.log("Test Done");
        })
      })
    })
  })
});

db.putUser(null, {username: 'test', email: 'test@gmail.com', password_hash: 'test', roles: ['Admin', 'Editor']}, function(){})
