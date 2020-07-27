const validator = require('express-validator');
const async = require('async');

var Book = require('../models/book')
var Genre = require('../models/genre');

// Display list of all Genre.
exports.genre_list = function(req, res, next) {
    Genre.find()
    .populate('genre')
    .sort([['name']])
    .exec(function(err, list_genres) {
      if(err) {return next(err);}
      //Successful, so render
      res.render('genre_list', {title:'Genre List', genre_list: list_genres})
    });
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {

  async.parallel({
      genre: function(callback) {
          Genre.findById(req.params.id)
            .exec(callback);
      },

      genre_books: function(callback) {
          Book.find({ 'genre': req.params.id })
            .exec(callback);
      },

  }, function(err, results) {
      if (err) { return next(err); }
      if (results.genre==null) { // No results.
          var err = new Error('Genre not found');
          err.status = 404;
          return next(err);
      }
      // Successful, so render
      res.render('genre_detail', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books } );
  });

};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res, next) {
    Genre.find()
    .populate('genre')
    .sort([['name']])
    .exec(function(err, list_genres) {
    if(err) {return next(err);}
    //Successful, so render
    res.render('genre_form', {title: 'Create Genre', show_list: true, genre_list: list_genres});
    });
  };

// Handle Genre create on POST.
exports.genre_create_post =  [
   
  // Validate that the name field is not empty.
  validator.body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),
  
  //Refactor due to sanitization middleware deprecated, sanitizeBody=>body
  //chained escape() above
  // Sanitize (escape) the name field.
  //validator.sanitizeBody('name').escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validator.validationResults(req);

    // Create a genre object with escaped and trimmed data.
    var genre = new Genre( { name: req.body.name } );


    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render('genre_form', { title: 'Create Genre', genre: genre, errors: errors.array()});
      return;
    }
    else {
      // Data from form is valid.
      // Check if Genre with same name already exists.
      Genre.findOne({ 'name': req.body.name })
        .exec( function(err, found_genre) {
           if (err) { return next(err); }

           if (found_genre) {
             // Genre exists, redirect to its detail page.
             res.redirect(found_genre.url);
           }
           else {

             genre.save(function (err) {
               if (err) { return next(err); }
               // Genre saved. Redirect to genre detail page.
               res.redirect(genre.url);
             });

           }

         });
    }
  }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res) {
    //Get Genre and any linked books
    async.parallel({
      genre: function(callback) {
        Genre.findById(req.params.id).exec(callback)
      },
      genre_books: function(callback) {
        Book.find({ 'genre': req.params.id }).exec(callback)
      },
  }, function(err, results) {
      if (err) { return next(err); }
      if (results.genre==null) { // No results.
          res.redirect('/catalog/genres');
      }
      //Render author form with details
      res.render('genre_delete', {title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books});
  });
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res) {

    async.parallel({
      genre: function(callback) {
        Genre.findById(req.body.genreid).exec(callback)
      },
      genre_books: function(callback) {
        Book.find({'genre_books':req.body.genreid})
      }
    }, function(err, results) {
        if(err) {return next(err);}
        if(results.genre_books.length > 0) {
          //Still has books render same as get route
          res.render('genre_delete', {title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books});
          return;
        }
        else {
          //Genre has no books, now delete
          Author.findByIdAndRemove(req.body.authorid, function deleteAuthor(err) {
            if (err) { return next(err); }
            // Success - go to author list
            res.redirect('/catalog/authors')
        });

    }

  })
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res) {
    //Get genre to update
    Genre.findById(req.params.id, function(err, results) {
      if(err) {return next(err)}
      if(results===null) {
          var err = new Error('Genre not found');
          err.status = 404;
          return next(err);
      }
      //Render author form with details
      res.render('genre_form', {title: 'Update Genre', genre: results, show_list: false});
  });
};

// Handle Genre update on POST.
exports.genre_update_post = [
    // Validate & Sanitize fields.
    validator.body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),

    //After validation/sanitation, process request
    function(req, res, next) {
      // Store validation errors
        const errors = validator.validationResult(req);
    
      // Create a genre object with escaped and trimmed data.
      var genre = new Genre({
        _id:req.params.id, //This is required, or a new ID will be assigned!
        name: req.body.name });

        if(!errors.isEmpty()) {
          // There are errors. Render form again with sanitized values/errors messages.
          res.render('genre_form', {title:'Update Genre', genre: genre, errors: errors.Array() });
          return;
        }

        else {
          // Data from form is valid.
          // Check if Genre with same name already exists.
          Genre.findByIdAndUpdate(req.params.id, genre, {}, function(err, newgenre) {
              if (err) { return next(err); }
              //No errors, Update genre
              res.redirect(newgenre.url);
          });
        }
       
    }
];