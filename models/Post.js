const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true },
    text: { type: String, required: true },
    author: String,
    platform: { type: String, enum: ['reddit', 'youtube', 'twitter', 'simulated', 'monitor'] },
    sentiment: {
      label: { type: String, enum: ['pos', 'neg', 'neu'] },
      confidence: Number,
      engine: { type: String, enum: ['keyword', 'vader', 'distilbert', 'hybrid'] }
    },
    engagement: {
      likes: Number,
      upvotes: Number,
      retweets: Number,
      total: Number
    },
    tags: [String],
    source: String,
    timestamp: { type: Date, default: Date.now },
    analyzedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    collection: 'posts'
  }
);

// Index for efficient queries
postSchema.index({ platform: 1, timestamp: -1 });
postSchema.index({ 'sentiment.label': 1, timestamp: -1 });
postSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Post', postSchema);
