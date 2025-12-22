import type { Document } from 'mongoose';

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
 * Interface for mentions in a message
 */
export interface IGroupMessageMention {
  /** The mentioned member's ID (user or bot) */
  memberId: string;
  /** Type: 'user' or 'bot' */
  memberType: 'user' | 'bot';
  /** Display name at the time of mention */
  displayName?: string;
  /** Start position of mention in text */
  startIndex?: number;
  /** End position of mention in text */
  endIndex?: number;
}

/**
 * Interface for reply reference
 */
export interface IGroupMessageReply {
  /** The message ID being replied to */
  messageId: string;
  /** Sender ID of the original message */
  senderId?: string;
  /** Sender name of the original message */
  senderName?: string;
  /** Preview text of the original message */
  previewText?: string;
}

/**
 * Interface for bot response metadata
 */
export interface IBotResponseMeta {
  /** Bot ID (agent_id or assistant_id) */
  botId?: string;
  /** Endpoint used */
  endpoint?: string;
  /** Model used */
  model?: string;
  /** Token count */
  tokenCount?: number;
  /** Finish reason */
  finishReason?: string;
  /** Processing time in ms */
  processingTime?: number;
  /** Whether response was truncated */
  truncated?: boolean;
}

/**
 * Interface for message reactions
 */
export interface IGroupMessageReaction {
  emoji: string;
  memberId: string;
  memberName?: string;
  createdAt: Date;
}

/**
 * Interface for read receipts
 */
export interface IGroupMessageReadReceipt {
  memberId: string;
  readAt: Date;
}

/**
 * Interface for edit history entry
 */
export interface IGroupMessageEditEntry {
  text: string;
  editedAt: Date;
}

/**
 * Interface for Group Message document
 */
export interface IGroupMessage extends Document {
  /** Unique message identifier */
  messageId: string;
  /** Group this message belongs to */
  groupId: string;
  /** Sender member ID (user ID or bot member ID) */
  senderId: string;
  /** Sender type: 'user' or 'bot' */
  senderType: 'user' | 'bot';
  /** Sender display name */
  senderName?: string;
  /** Sender avatar URL */
  senderAvatar?: string;
  /** Message type */
  messageType: GroupMessageType;
  /** Message text content */
  text?: string;
  /** Rich content parts */
  content?: unknown[];
  /** Mentioned members */
  mentions: IGroupMessageMention[];
  /** Reply reference */
  replyTo?: IGroupMessageReply;
  /** Attached files */
  files?: unknown[];
  /** Attachments (images, etc.) */
  attachments?: unknown[];
  /** Bot response metadata */
  botMeta?: IBotResponseMeta;
  /** Whether message has been edited */
  isEdited: boolean;
  /** Edit history */
  editHistory?: IGroupMessageEditEntry[];
  /** Whether message is deleted (soft delete) */
  isDeleted: boolean;
  /** Deletion info */
  deletedAt?: Date;
  deletedBy?: string;
  /** Reactions */
  reactions: IGroupMessageReaction[];
  /** Read receipts */
  readBy: IGroupMessageReadReceipt[];
  /** Pin status */
  isPinned: boolean;
  pinnedAt?: Date;
  pinnedBy?: string;
  /** Reply count */
  replyCount: number;
  /** Error flag */
  error: boolean;
  /** Error message */
  errorMessage?: string;
  /** Processing/generating flag */
  isGenerating: boolean;
  /** Additional metadata */
  metadata?: unknown;
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a group message
 */
export interface ICreateGroupMessageDTO {
  groupId: string;
  senderId: string;
  senderType: 'user' | 'bot';
  senderName?: string;
  senderAvatar?: string;
  messageType?: GroupMessageType;
  text: string;
  content?: unknown[];
  mentions?: IGroupMessageMention[];
  replyTo?: IGroupMessageReply;
  files?: unknown[];
  attachments?: unknown[];
  botMeta?: IBotResponseMeta;
  metadata?: unknown;
}

/**
 * DTO for updating a group message
 */
export interface IUpdateGroupMessageDTO {
  text?: string;
  content?: unknown[];
  mentions?: IGroupMessageMention[];
}

/**
 * DTO for adding a reaction
 */
export interface IAddReactionDTO {
  emoji: string;
  memberId: string;
  memberName?: string;
}

/**
 * Response type for listing group messages
 */
export interface IGroupMessageListResponse {
  messages: IGroupMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Request type for sending a message to group (with bot tagging)
 */
export interface ISendGroupMessageRequest {
  groupId: string;
  text: string;
  replyToMessageId?: string;
  mentions?: Array<{
    memberId: string;
    memberType: 'user' | 'bot';
  }>;
  files?: unknown[];
  attachments?: unknown[];
}

/**
 * Event type for group message events (SSE/WebSocket)
 */
export interface IGroupMessageEvent {
  type: 'message' | 'typing' | 'read' | 'reaction' | 'edit' | 'delete' | 'bot_response';
  groupId: string;
  messageId?: string;
  senderId: string;
  senderType: 'user' | 'bot';
  data: unknown;
  timestamp: Date;
}

