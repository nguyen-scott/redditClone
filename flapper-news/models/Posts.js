var mongoose = require('mongoose');

var PostSchema = new mongoose.Schema({
  title: String,
  link: String,
  author: String,
  created: { type: Number, default: Date.now() },
  upvotes: { type: Number, default: 0 },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  usersVoted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  // splits usersVoted into usersUpvoted and usersDownvoted
});

PostSchema.methods.upvote = function(cb){
  this.upvotes += 1;
  this.save(cb);
};

PostSchema.methods.downvote = function(cb){
  this.upvotes -= 1;
  this.save(cb);
}

mongoose.model('Post', PostSchema);
