const validator = require('express-validator');

var BookInstance = require('../models/bookinstance');
var Book = require('../models/book');
var async = require('async');

// Display a list of all Book Instances
exports.bookinstance_list = function(req, res, next) {

  BookInstance.find()
    .populate('book')
    .exec(function (err, list_bookinstances) {
      if (err) { return next(err); }
      // Successful, so render
      res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: list_bookinstances });
    });
    
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {

  BookInstance.findById(req.params.id)
  .populate('book')
  .exec(function (err, bookinstance) {
    if (err) { return next(err); }
    if (bookinstance==null) { // No results.
        var err = new Error('Book copy not found');
        err.status = 404;
        return next(err);
      }
    // Successful, so render.
    res.render('bookinstance_detail', { title: 'Copy: '+bookinstance.book.title, bookinstance:  bookinstance});
  })

};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {       

  Book.find({},'title')
  .exec(function (err, books) {
    if (err) { return next(err); }
    // Successful, so render.
    res.render('bookinstance_form', {title: 'Create BookInstance', book_list: books, show_list: true});
  });
  
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [

  // Validate fields.
  validator.body('book', 'Book must be specified').trim().isLength({ min: 1 }),
  validator.body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }),
  validator.body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),
  
  //Change to body to body due to sanitization middleware deprecated
  // Sanitize fields.
  validator.body('book').escape(),
  validator.body('imprint').escape(),
  validator.body('status').trim().escape(),
  validator.body('due_back').toDate(),
  
  // Process request after validation and sanitization.
  (req, res, next) => {

      // Extract the validation errors from a request.
      const errors = validator.validationResult(req);

      // Create a BookInstance object with escaped and trimmed data.
      var bookinstance = new BookInstance(
        { book: req.body.book,
          imprint: req.body.imprint,
          status: req.body.status,
          due_back: req.body.due_back
         });

      if (!errors.isEmpty()) {
          // There are errors. Render form again with sanitized values and error messages.
          Book.find({},'title')
              .exec(function (err, books) {
                  if (err) { return next(err); }
                  // Successful, so render.
                  res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books, selected_book: bookinstance.book._id , errors: errors.array(), bookinstance: bookinstance, show_list:false });
          });
          return;
      }
      else {
          // Data from form is valid.
          bookinstance.save(function (err) {
              if (err) { return next(err); }
                 // Successful - redirect to new record.
                 res.redirect(bookinstance.url);
              });
      }
  }
];
// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
    //Get book instance to delete and populate Book for title reference
    BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function(err, results) {
      if(err) { return next(err); }
      //No errors, render delete form
      res.render('bookinstance_delete', {title: 'Delete Book Instance/Copy', bookinstance: results, book: results.book});
    });
}

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res, next) {
    
  
    // No linked references, just find and Delete
    BookInstance.findByIdAndRemove(req.params.id, function(err,results) {
        if(err) {return next(err)}
        //No errors...Its removed, return to book instance list
        res.redirect('/catalog/bookinstance')

    });      
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res, next) {
    // Get book instance and books for form.
    async.parallel({
      bookinstance: function(callback) {
          BookInstance.findById(req.params.id).populate('book').exec(callback)
      },
      books: function(callback) {
          Book.find(callback)
      },

      }, function(err, results) {
          if (err) { return next(err); }
          if (results.bookinstance==null) { // No results.
              var err = new Error('Book copy not found');
              err.status = 404;
              return next(err);
          }
          // Success. Will render...
          res.render('bookinstance_form', { title: 'Update  BookInstance', book_list : results.books, selected_book : results.bookinstance.book._id, bookinstance:results.bookinstance });
      });

};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
    // Validate & Sanitize fields.
    validator.body('book', 'Book must be specified').trim().isLength({ min: 1 }),
    validator.body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }),
    validator.body('status', 'Select a status').trim().escape(),
    validator.body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

    //After validation/sanitation, process request
    function(req, res, next) {
        // Store validation errors
        const errors = validator.validationResult(req);
  
        // Create a genre object with escaped and trimmed data.
        var bookinstance = new BookInstance(
          {
          _id:req.params.id, //This is required, or a new ID will be assigned!
          book: req.body.book,
          imprint: req.body.imprint,
          status: req.body.status,
          due_back: req.body.due_back 
          });

          if(!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            Book.find({},'title')
                .exec(function (err, books) {
                    if (err) { return next(err); }
                    // Successful, so render.
                    res.render('bookinstance_form', { title: 'Update BookInstance', book_list : books, selected_book : bookinstance.book._id , errors: errors.array(), bookinstance:bookinstance });
            });
            return;
          }

          else {
            // Data from form is valid.
            // Check if Book Instance already exists...update
            BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function(err, newbookinstance) {
              if (err) { return next(err); }
              //No errors, Update genre
              res.redirect(newbookinstance.url);
            });
          }
     
    }
];