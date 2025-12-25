import mongoose from 'mongoose';

// Define the reply schema recursively for nested replies
const ReplySchema = new mongoose.Schema({
  username: { type: String, required: true },
  content: { type: String, required: true },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  replies: { type: [mongoose.Schema.Types.Mixed], default: [] },
});

const PostSchema = new mongoose.Schema({
  username: { type: String, required: true },
  content: { type: String, required: true },
  imageUrl: { type: String },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  replies: [ReplySchema],
});

export const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
