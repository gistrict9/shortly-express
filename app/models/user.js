var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  links: function() {
    return this.hasMany(Link);
  },
  initialize: function() {
    this.on('creating', function(model, attrs, options){
      var pw = model.get('hash');
      bcrypt.hash(pw, null, null, function(err, hash){
        if ( err ) console.log(err);
        model.set('hash', hash);
      }.bind(this));
    });
  }
});

module.exports = User;
