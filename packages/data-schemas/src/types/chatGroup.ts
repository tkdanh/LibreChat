import type { Document } from 'mongoose';

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
 * Interface for a chat group member
 */
export interface IChatGroupMember {
  /** User ID or Bot Member ID */
  memberId: string;
  /** Type: 'user' or 'bot' */
  memberType: ChatGroupMemberType;
  /** Role in the group */
  role: ChatGroupMemberRole;
  /** For bot members: agent_id or assistant_id reference */
  botId?: string;
  /** Bot endpoint type (agents, assistants, openAI, etc.) */
  botEndpoint?: string;
  /** Bot model */
  botModel?: string;
  /** Display name for the member in this group */
  displayName?: string;
  /** Avatar URL override for this group */
  avatar?: string;
  /** When the member joined */
  joinedAt: Date;
  /** Whether notifications are muted */
  isMuted: boolean;
  /** Last read message ID for unread count */
  lastReadMessageId?: string;
}

/**
 * Interface for chat group settings
 */
export interface IChatGroupSettings {
  /** Allow members to add other members */
  allowMemberInvite: boolean;
  /** Allow members to add bots */
  allowMemberAddBot: boolean;
  /** Auto-respond with bot when mentioned */
  botRespondOnMention: boolean;
  /** Maximum members allowed */
  maxMembers: number;
  /** Message retention days (0 = forever) */
  messageRetentionDays: number;
}

/**
 * Interface for last message preview
 */
export interface IChatGroupLastMessage {
  messageId: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date;
}

/**
 * Interface for Chat Group document
 */
export interface IChatGroup extends Document {
  /** Unique identifier for the group */
  groupId: string;
  /** Group name */
  name: string;
  /** Group description */
  description?: string;
  /** Group avatar/icon URL */
  avatar?: string;
  /** User who created the group */
  createdBy: string;
  /** Group members (users and bots) */
  members: IChatGroupMember[];
  /** Whether the group is active */
  isActive: boolean;
  /** Whether the group is archived */
  isArchived: boolean;
  /** Group settings */
  settings: IChatGroupSettings;
  /** Last message info */
  lastMessage?: IChatGroupLastMessage;
  /** Total message count */
  messageCount: number;
  /** Tags for organization */
  tags: string[];
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a chat group
 */
export interface ICreateChatGroupDTO {
  name: string;
  description?: string;
  avatar?: string;
  settings?: Partial<IChatGroupSettings>;
  tags?: string[];
}

/**
 * DTO for updating a chat group
 */
export interface IUpdateChatGroupDTO {
  name?: string;
  description?: string;
  avatar?: string;
  settings?: Partial<IChatGroupSettings>;
  tags?: string[];
  isArchived?: boolean;
}

/**
 * DTO for adding a member to a group
 */
export interface IAddGroupMemberDTO {
  memberId: string;
  memberType: ChatGroupMemberType;
  role?: ChatGroupMemberRole;
  botId?: string;
  botEndpoint?: string;
  botModel?: string;
  displayName?: string;
  avatar?: string;
}

/**
 * DTO for adding a bot to a group
 */
export interface IAddBotToGroupDTO {
  botId: string;
  botEndpoint: string;
  botModel?: string;
  displayName?: string;
}

/**
 * Response type for listing chat groups
 */
export interface IChatGroupListResponse {
  groups: IChatGroup[];
  nextCursor: string | null;
  hasMore: boolean;
}

