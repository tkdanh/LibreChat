import mongoose, { Schema } from 'mongoose';
import type { IGroupMessage } from '~/types';

/**
 * Enum for message types in group chat
 */
export enum GroupMessageType {
  TEXT = 'text',
  SYSTEM = 'system',
  BOT_RESPONSE = 'bot_response',
  FILE = 'file',
  IMAGE = 'image',
}

/**
 * Sub-schema for mentioned users/bots in a message
 */
const MentionSchema = new Schema(
  {
    /** The mentioned member's ID (user or bot) */
    memberId: {
      type: String,
      required: true,
    },
    /** Type: 'user' or 'bot' */
    memberType: {
      type: String,
      enum: ['user', 'bot'],
      required: true,
    },
    /** Display name at the time of mention */
    displayName: {
      type: String,
    },
    /** Start position of mention in text */
    startIndex: {
      type: Number,
    },
    /** End position of mention in text */
    endIndex: {
      type: Number,
    },
  },
  { _id: false },
);

/**
 * Sub-schema for reply reference
 */
const ReplySchema = new Schema(
  {
    /** The message ID being replied to */
    messageId: {
      type: String,
      required: true,
    },
    /** Sender ID of the original message */
    senderId: {
      type: String,
    },
    /** Sender name of the original message */
    senderName: {
      type: String,
    },
    /** Preview text of the original message */
    previewText: {
      type: String,
      maxlength: 200,
    },
  },
  { _id: false },
);

/**
 * Sub-schema for bot response metadata
 */
const BotResponseMetaSchema = new Schema(
  {
    /** Bot ID (agent_id or assistant_id) */
    botId: {
      type: String,
    },
    /** Endpoint used */
    endpoint: {
      type: String,
    },
    /** Model used */
    model: {
      type: String,
    },
    /** Token count */
    tokenCount: {
      type: Number,
    },
    /** Finish reason */
    finishReason: {
      type: String,
    },
    /** Processing time in ms */
    processingTime: {
      type: Number,
    },
    /** Whether response was truncated */
    truncated: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

/**
 * Group Message Schema
 * Represents a single message in a group chat
 */
const groupMessageSchema = new Schema<IGroupMessage>(
  {
    /** Unique message identifier */
    messageId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    /** Group this message belongs to */
    groupId: {
      type: String,
      required: true,
      index: true,
    },
    /** Sender member ID (user ID or bot member ID) */
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    /** Sender type: 'user' or 'bot' */
    senderType: {
      type: String,
      enum: ['user', 'bot'],
      required: true,
    },
    /** Sender display name at the time of sending */
    senderName: {
      type: String,
    },
    /** Sender avatar URL at the time of sending */
    senderAvatar: {
      type: String,
    },
    /** Message type */
    messageType: {
      type: String,
      enum: Object.values(GroupMessageType),
      default: GroupMessageType.TEXT,
    },
    /** Message text content */
    text: {
      type: String,
      required: function (this: { messageType: string }) {
        return this.messageType !== GroupMessageType.FILE;
      },
    },
    /** Rich content parts (similar to regular message content) */
    content: {
      type: [{ type: mongoose.Schema.Types.Mixed }],
      default: undefined,
    },
    /** Mentioned members in this message */
    mentions: {
      type: [MentionSchema],
      default: [],
    },
    /** Reply reference if this is a reply */
    replyTo: {
      type: ReplySchema,
    },
    /** Attached files */
    files: {
      type: [{ type: mongoose.Schema.Types.Mixed }],
      default: undefined,
    },
    /** Attachments (images, etc.) */
    attachments: {
      type: [{ type: mongoose.Schema.Types.Mixed }],
      default: undefined,
    },
    /** Bot response metadata */
    botMeta: {
      type: BotResponseMetaSchema,
    },
    /** Whether message has been edited */
    isEdited: {
      type: Boolean,
      default: false,
    },
    /** Edit history */
    editHistory: {
      type: [
        {
          text: String,
          editedAt: Date,
        },
      ],
      default: undefined,
    },
    /** Whether message has been deleted (soft delete) */
    isDeleted: {
      type: Boolean,
      default: false,
    },
    /** Deletion info */
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: String,
    },
    /** Reactions on this message */
    reactions: {
      type: [
        {
          emoji: String,
          memberId: String,
          memberName: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    /** Read receipts */
    readBy: {
      type: [
        {
          memberId: String,
          readAt: Date,
        },
      ],
      default: [],
    },
    /** Pin status */
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: {
      type: Date,
    },
    pinnedBy: {
      type: String,
    },
    /** Thread/reply count */
    replyCount: {
      type: Number,
      default: 0,
    },
    /** Error flag for failed messages */
    error: {
      type: Boolean,
      default: false,
    },
    /** Error message */
    errorMessage: {
      type: String,
    },
    /** Processing/generating flag */
    isGenerating: {
      type: Boolean,
      default: false,
    },
    /** Additional metadata */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

// Indexes for efficient queries
groupMessageSchema.index({ groupId: 1, createdAt: -1 });
groupMessageSchema.index({ groupId: 1, senderId: 1 });
groupMessageSchema.index({ groupId: 1, 'mentions.memberId': 1 });
groupMessageSchema.index({ groupId: 1, 'replyTo.messageId': 1 });
groupMessageSchema.index({ groupId: 1, isPinned: 1 });
groupMessageSchema.index({ groupId: 1, isDeleted: 1 });

export default groupMessageSchema;

