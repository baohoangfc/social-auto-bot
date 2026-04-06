import mongoose, { Schema, model, models } from 'mongoose';

const SocialAccountSchema = new Schema({
  platform: { type: String, required: true, enum: ['facebook', 'instagram', 'x', 'tiktok'] },
  accountId: { type: String, required: true },
  accountName: { type: String },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  expiresAt: { type: Date },
  profilePicture: { type: String },
}, { timestamps: true });

const PostSchema = new Schema({
  content: { type: String, required: true },
  mediaUrls: [{ type: String }],
  platforms: [{ type: String, enum: ['facebook', 'instagram', 'x', 'tiktok'] }],
  scheduledFor: { type: Date },
  status: { type: String, enum: ['draft', 'scheduled', 'posted', 'failed'], default: 'draft' },
  aiGenerated: { type: Boolean, default: false },
  sourceUrl: { type: String },
  logs: [{ message: String, timestamp: Date }],
}, { timestamps: true });

const NewsSourceSchema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ['rss', 'scraping'], default: 'rss' },
  active: { type: Boolean, default: true },
  lastChecked: { type: Date },
}, { timestamps: true });

export const SocialAccount = models.SocialAccount || model('SocialAccount', SocialAccountSchema);
export const Post = models.Post || model('Post', PostSchema);
export const NewsSource = models.NewsSource || model('NewsSource', NewsSourceSchema);
