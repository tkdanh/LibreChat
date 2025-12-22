import { Schema } from 'mongoose';
import type { IChatGroup } from '~/types';

/**
 * Enum for member roles in a chat group
 */
export enum ChatGroupMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

/**
 * Enum for member types in a chat group
 */
export enum ChatGroupMemberType {
  USER = 'user',
  BOT = 'bot',
}

/**
 * Sub-schema for chat group members
 */
const ChatGroupMemberSchema = new Schema(
  {
    /** User ID or Agent/Assistant ID */
    memberId: {
      type: String,
      required: true,
    },
    /** Type: 'user' or 'bot' */
    memberType: {
      type: String,
      enum: Object.values(ChatGroupMemberType),
      required: true,
      default: ChatGroupMemberType.USER,
    },
    /** Role in the group */
    role: {
      type: String,
      enum: Object.values(ChatGroupMemberRole),
      default: ChatGroupMemberRole.MEMBER,
    },
    /** For bot members: agent_id or assistant_id reference */
    botId: {
      type: String,
      required: function (this: { memberType: string }) {
        return this.memberType === ChatGroupMemberType.BOT;
      },
    },
    /** Bot endpoint type (agents, assistants, openAI, etc.) */
    botEndpoint: {
      type: String,
      required: function (this: { memberType: string }) {
        return this.memberType === ChatGroupMemberType.BOT;
      },
    },
    /** Bot model */
    botModel: {
      type: String,
    },
    /** Display name for the member in this group */
    displayName: {
      type: String,
    },
    /** Avatar URL override for this group */
    avatar: {
      type: String,
    },
    /** When the member joined */
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    /** Whether notifications are muted for this member */
    isMuted: {
      type: Boolean,
      default: false,
    },
    /** Last read message ID for unread count tracking */
    lastReadMessageId: {
      type: String,
    },
  },
  { _id: true },
);

/**
 * Chat Group Schema
 * Represents a group chat where multiple users and bots can participate
 */
const chatGroupSchema = new Schema<IChatGroup>(
  {
    /** Unique identifier for the group */
    groupId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    /** Group name */
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    /** Group description */
    description: {
      type: String,
      maxlength: 500,
    },
    /** Group avatar/icon URL */
    avatar: {
      type: String,
    },
    /** User who created the group */
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    /** Group members (users and bots) */
    members: {
      type: [ChatGroupMemberSchema],
      default: [],
    },
    /** Whether the group is active */
    isActive: {
      type: Boolean,
      default: true,
    },
    /** Whether the group is archived */
    isArchived: {
      type: Boolean,
      default: false,
    },
    /** Group settings */
    settings: {
      type: {
        /** Allow members to add other members */
        allowMemberInvite: {
          type: Boolean,
          default: false,
        },
        /** Allow members to add bots */
        allowMemberAddBot: {
          type: Boolean,
          default: false,
        },
        /** Auto-respond with bot when mentioned (@ tag) */
        botRespondOnMention: {
          type: Boolean,
          default: true,
        },
        /** Maximum members allowed */
        maxMembers: {
          type: Number,
          default: 50,
        },
        /** Message retention days (0 = forever) */
        messageRetentionDays: {
          type: Number,
          default: 0,
        },
      },
      default: {},
    },
    /** Last message info for sorting and preview */
    lastMessage: {
      type: {
        messageId: String,
        text: String,
        senderId: String,
        senderName: String,
        createdAt: Date,
      },
    },
    /** Total message count */
    messageCount: {
      type: Number,
      default: 0,
    },
    /** Tags for organization */
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

// Indexes for efficient queries
chatGroupSchema.index({ createdAt: 1, updatedAt: 1 });
chatGroupSchema.index({ 'members.memberId': 1 });
chatGroupSchema.index({ 'members.memberType': 1 });
chatGroupSchema.index({ isActive: 1, isArchived: 1 });
chatGroupSchema.index({ 'lastMessage.createdAt': -1 });

export default chatGroupSchema;

