//INITIALISATION================================

var express=require("express");
var app= express();
var methodOverride=require("method-override");
var bodyParser= require("body-parser");
var mongoose= require("mongoose");
var expressSanitizer= require("express-sanitizer");

// MODELS MONGO SCHEMA
var Blog = require("./models/blogs");
var User = require("./models/user");

var LocalStrategy = require("passport-local");
var passport      = require("passport");


mongoose.connect("mongodb://localhost/blog_app", { useNewUrlParser: true, useUnifiedTopology: true}); //Mongoose Initialisation

//PASSPORT CONFIGURATION==========================
app.use(require("express-session")({
    secret: "Aditya Narayan Singh",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//==================================================

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(expressSanitizer());   // Write after Body Parser
app.use(methodOverride("_method"));   //PUT and DELETE can't be used in HTML so, Whenever an address contains _method=PUT at last it automaticall triggers the PUT request in the App.js file


app.use(express.static('public'));                 //Static Files Usable

app.set("view engine","ejs");                      //HTML Files Usable

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    //console.log(currentUser.username);
    next();
});


//RESTful Routing====================================================

app.get("/blogs",function(req,res){
    console.log(req.user);
    Blog.find({}, function(err, blogs){
        if(err){
            console.log("Error!!");
        } else {
            res.render("index", {blogs:blogs , currentUser: req.user});
        } 
    });
});


// CREATING NEW BLOG==================================

app.get("/blogs/new", isLoggedIn , function(req,res){
    res.render("Blogs/new");
});

app.post("/blogs", isLoggedIn, function(req,res){
    // Sanitize
    req.body.blog.body = req.sanitize(req.body.blog.body);    // Removes the Script Tag which disables malware
    //Create Blog
    Blog.create(req.body.blog, function(err, newBlog){
        if(err){
            res.render("Blogs/new");
        } else{
            newBlog.author.id = req.user._id;
            newBlog.author.username = req.user.username;
            newBlog.save();
            //Then redirect to index
            res.redirect("/blogs");
        }
    });
});

// SHOW BLOGS IN MAXIMISED VERSION=======================

app.get("/blogs/:id", function(req,res){
    Blog.findById(req.params.id, function(err, foundBlog){
        if(err){
            res.redirect("/blogs");
        } else {
            res.render("Blogs/show", {blog: foundBlog, currentUser: req.user});
        }
    });
});


// EDIT ROUTE============================================

app.get("/blogs/:id/edit",isLoggedIn ,function(req,res){
    Blog.findById(req.params.id, function(err, foundBlog){
        if(err){
            res.send(err);
        } else {
            res.render("Blogs/edit", {blog: foundBlog});
        }
    });
});


//UPDATE ROUTE, For updating we use put method

app.put("/blogs/:id",isLoggedIn , function(req,res){
    req.body.blog.body = req.sanitize(req.body.blog.body);  
    Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, updatedBlog){
        if(err){
            res.redirect("/blogs");
        } else{
            res.redirect("/blogs/"+ req.params.id);
        }
    });
});

// DELETE ROUTE===================================

app.delete("/blogs/:id", isLoggedIn, function(req,res){
   // res.send("Deleted");
    Blog.findByIdAndRemove(req.params.id , function(err){
        if(err){
            console.log(err);
        } else{
            res.redirect("/blogs");
        }
    });
});

// REGISER ROUTE==============================

app.get("/register" , function(req,res){
    res.render("register");
});

app.post("/register", function(req,res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register");
        } 
        passport.authenticate("local")(req, res, function(){
            res.redirect("/blogs");
        });
    });
});

// LOGIN ROUTE

app.get("/login", function(req,res){
    res.render("login");
});

app.post("/login", passport.authenticate("local",
    {
        successRedirect: "/blogs",
        failureRedirect: "/register"
    }),function(req,res){
        if(err){
            console.log(err);
        }
});

//LOGOUT ROUTE

app.get("/logout", function(req,res){
    req.logout();
    res.redirect("/blogs");
})

//MIDDLEWARE
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}


// Port to Listen our Request =======================================
app.listen(3000, function(req,res){
    console.log("Blog App has Started");
});

// =================================================================