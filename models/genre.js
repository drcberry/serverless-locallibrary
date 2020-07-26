var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var GenreSchema = new Schema (
  {
    name: {type:String, minLength:[3, 'Too short!'], maxLength:100, required:[true, 'Must enter a genre...']}
  }
);

//Virtual for Genre URL
GenreSchema
.virtual('url')
.get(function() {
  return './genre/' + this._id;
});

module.exports = mongoose.model('Genre', GenreSchema);