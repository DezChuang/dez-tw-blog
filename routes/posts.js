var express     = require("express"),
    router      = express.Router(),
    formidable  = require('formidable'),
    fs          = require('fs'),
    Post        = require("../models/post"),
    middleware  = require("../middleware");

//INDEX - Show all posts from DB
router.get("/", function(req,res){
    //Get all posts from DB
    Post.find({}, function(err, allPosts){
        if(err){
            console.log(err);
        } else {
            res.render("posts/index", {posts: allPosts, page: 'posts'});
        }
    });
});

//CREATE - Add new posts to DB
router.post("/", middleware.isAdmin, function(req,res){
    //get data from form and add to post array in app.js
    var title = req.body.title;
    var image = req.body.image;
    var description = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    };
    var newPost = {title: title, image: image, description: description, author: author};
    //Create a new post and save to DB
    Post.create(newPost, function(err, newlyCreated){
        if(err){
            console.log(err);
        } else {
            res.redirect("/posts");
        }
    });
});


//FILE UPLOAD
router.get("/file-upload", middleware.isAdmin, function(req,res){
    res.render("posts/upload");
});

router.post('/file-upload', middleware.isAdmin, function(req, res, next) {
    var form = new formidable.IncomingForm();   //Setup upload form
    form.encoding = 'utf-8';
    form.uploadDir = 'public/img/posts/:id/';
    form.keepExtensions = true;
    form.maxFieldsSize = 2 * 1024 * 1024;


    if (!fs.existsSync(form.uploadDir)){
        fs.mkdirSync(form.uploadDir);
    }

    form.parse(req, function(err, fields, files) {
        if (err) {
            req.flash("error", "Something wrong happened!");
            res.redirect("/posts");
            return;
        }

        var extName = '';
        switch (files.fulAvatar.type) {
            case 'image/pjpeg':
                extName = 'jpg';
                break;
            case 'image/jpeg':
                extName = 'jpg';
                break;
            case 'image/png':
                extName = 'png';
                break;
            case 'image/x-png':
                extName = 'png';
                break;
        }

        if(extName.length == 0){
              req.flash("error", "Wrong file format.");
              res.redirect("/posts");
              return;
        }

        var avatarName = Math.random() + '.' + extName;
        var newPath = form.uploadDir + avatarName;

        console.log(newPath);
        fs.renameSync(files.fulAvatar.path, newPath);  //rename
    });

    req.flash("success", "Successfully upload file!");
    res.redirect("/posts");
});

//NEW - Show form to create new posts
router.get("/new", middleware.isAdmin, function(req,res){
    res.render("posts/new");
});

//SHOW - Show more information about posts
router.get("/:id", function(req, res){
    //find the post with provided ID
    Post.findById(req.params.id).populate("comments").exec(function(err, foundPost){
        if(err) {
            console.log(err);
        } else {
            //render show template with that post
            res.render("posts/show", {post: foundPost});
        }
    });

});

//EDIT
router.get("/:id/edit", middleware.checkPostOwnership, function(req, res){
    Post.findById(req.params.id, function(err, foundPost){
        res.render("posts/edit", {post: foundPost});
    });
});

//UPDATE
router.put("/:id", middleware.checkPostOwnership, function(req, res){
    //Add express-sanitizer to prevent middleware script in post
    //req.body.post.description = req.sanitize(req.body.post.description);
    Post.findByIdAndUpdate(req.params.id, req.body.post, function(err, updatedPost) {
        if(err){
            console.log(err);
            res.redirect("/posts");
        } else{
            res.redirect("/posts/" + req.params.id);
        }
    });
});

//DELETE
router.delete("/:id", middleware.checkPostOwnership, function(req, res){
    Post.findByIdAndRemove(req.params.id, function(err){
        if(err){
            console.log(err);
            res.redirect("/posts");
        } else {
            req.flash("success", "Successfully deleted post");
            res.redirect("/posts");
        }
    });
});

module.exports = router;
