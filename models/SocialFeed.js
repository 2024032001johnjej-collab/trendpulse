const mongoose = require('mongoose');

const socialFeedSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: ['reddit', 'youtube', 'twitter', 'mock'], required: true },
    externalId: String,
    title: String,
    content: { type: String, required: true },
    author: String,
    link: String,
    engagement: {
      views: Number,
      likes: Number,
      upvotes: Number,
      comments: Number,
      retweets: Number,
      shares: Number
    },
    metadata: mongoose.Schema.Types.Mixed,
    source: String,
    fetchedAt: { type: Date, default: Date.now },
    analyzedAt: Date,
    analyzed: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    collection: 'social_feeds'
  }
);

// Indexes for efficient queries
socialFeedSchema.index({ platform: 1, fetchedAt: -1 });
socialFeedSchema.index({ analyzed: 1, fetchedAt: -1 });
socialFeedSchema.index({ fetchedAt: -1 });

module.exports = mongoose.model('SocialFeed', socialFeedSchema);
