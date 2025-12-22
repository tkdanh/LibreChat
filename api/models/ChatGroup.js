const crypto = require('crypto');
const { logger } = require('@librechat/data-schemas');
const { ChatGroup, GroupMessage } = require('~/db/models');

/**
 * Generate a unique group ID
 * @returns {string} A unique group identifier
 */
const generateGroupId = () => {
  return `grp_${crypto.randomUUID()}`;
};

/**
 * Generate a unique message ID
 * @returns {string} A unique message identifier
 */
const generateMessageId = () => {
  return crypto.randomUUID();
};

/**
 * Create a new chat group
 * @param {Object} params - Group creation parameters
 * @param {string} params.createdBy - User ID who creates the group
 * @param {string} params.name - Group name
 * @param {string} [params.description] - Group description
 * @param {string} [params.avatar] - Group avatar URL
 * @param {Object} [params.settings] - Group settings
 * @param {string[]} [params.tags] - Group tags
 * @returns {Promise<Object>} The created group
 */
const createChatGroup = async ({ createdBy, name, description, avatar, settings, tags }) => {
  try {
    const groupId = generateGroupId();

    // Create the group with the creator as owner
    const group = await ChatGroup.create({
      groupId,
      name,
      description,
      avatar,
      createdBy,
      members: [
        {
          memberId: createdBy,
          memberType: 'user',
          role: 'owner',
          joinedAt: new Date(),
          isMuted: false,
        },
      ],
      settings: {
        allowMemberInvite: false,
        allowMemberAddBot: false,
        botRespondOnMention: true,
        maxMembers: 50,
        messageRetentionDays: 0,
        ...settings,
      },
      tags: tags || [],
      isActive: true,
      isArchived: false,
      messageCount: 0,
    });

    return group.toObject();
  } catch (error) {
    logger.error('[createChatGroup] Error creating chat group', error);
    throw new Error('Error creating chat group');
  }
};

/**
 * Get a chat group by ID
 * @param {string} groupId - The group ID
 * @param {string} userId - The requesting user's ID
 * @returns {Promise<Object|null>} The group or null if not found
 */
const getChatGroup = async (groupId, userId) => {
  try {
    const group = await ChatGroup.findOne({
      groupId,
      'members.memberId': userId,
      isActive: true,
    }).lean();

    return group;
  } catch (error) {
    logger.error('[getChatGroup] Error getting chat group', error);
    throw new Error('Error getting chat group');
  }
};

/**
 * Get all chat groups for a user
 * @param {string} userId - The user's ID
 * @param {Object} options - Query options
 * @param {string} [options.cursor] - Pagination cursor
 * @param {number} [options.limit=25] - Number of groups per page
 * @param {boolean} [options.isArchived=false] - Filter archived groups
 * @returns {Promise<Object>} Groups and pagination info
 */
const getUserChatGroups = async (userId, { cursor, limit = 25, isArchived = false } = {}) => {
  try {
    const filters = [
      { 'members.memberId': userId },
      { isActive: true },
    ];

    if (isArchived) {
      filters.push({ isArchived: true });
    } else {
      filters.push({ $or: [{ isArchived: false }, { isArchived: { $exists: false } }] });
    }

    if (cursor) {
      filters.push({ updatedAt: { $lt: new Date(cursor) } });
    }

    const query = { $and: filters };

    const groups = await ChatGroup.find(query)
      .select('groupId name description avatar createdBy members lastMessage messageCount tags createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(limit + 1)
      .lean();

    let nextCursor = null;
    if (groups.length > limit) {
      const lastGroup = groups.pop();
      nextCursor = lastGroup.updatedAt.toISOString();
    }

    return { groups, nextCursor, hasMore: nextCursor !== null };
  } catch (error) {
    logger.error('[getUserChatGroups] Error getting user chat groups', error);
    throw new Error('Error getting user chat groups');
  }
};

/**
 * Update a chat group
 * @param {string} groupId - The group ID
 * @param {string} userId - The requesting user's ID
 * @param {Object} updates - Update fields
 * @returns {Promise<Object>} The updated group
 */
const updateChatGroup = async (groupId, userId, updates) => {
  try {
    // Check if user is admin or owner
    const group = await ChatGroup.findOne({
      groupId,
      'members.memberId': userId,
      'members.role': { $in: ['owner', 'admin'] },
    });

    if (!group) {
      throw new Error('Group not found or insufficient permissions');
    }

    const allowedUpdates = ['name', 'description', 'avatar', 'settings', 'tags', 'isArchived'];
    const updateObj = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        if (key === 'settings') {
          updateObj.settings = { ...group.settings, ...updates.settings };
        } else {
          updateObj[key] = updates[key];
        }
      }
    }

    const updatedGroup = await ChatGroup.findOneAndUpdate(
      { groupId },
      { $set: updateObj },
      { new: true },
    ).lean();

    return updatedGroup;
  } catch (error) {
    logger.error('[updateChatGroup] Error updating chat group', error);
    throw error;
  }
};

/**
 * Delete a chat group (soft delete)
 * @param {string} groupId - The group ID
 * @param {string} userId - The requesting user's ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteChatGroup = async (groupId, userId) => {
  try {
    // Only owner can delete
    const group = await ChatGroup.findOne({
      groupId,
      'members.memberId': userId,
      'members.role': 'owner',
    });

    if (!group) {
      throw new Error('Group not found or insufficient permissions');
    }

    await ChatGroup.updateOne(
      { groupId },
      { $set: { isActive: false } },
    );

    return { success: true, message: 'Group deleted successfully' };
  } catch (error) {
    logger.error('[deleteChatGroup] Error deleting chat group', error);
    throw error;
  }
};

/**
 * Add a member to a chat group
 * @param {string} groupId - The group ID
 * @param {string} requestingUserId - The user adding the member
 * @param {Object} memberData - Member data
 * @returns {Promise<Object>} The updated group
 */
const addGroupMember = async (groupId, requestingUserId, memberData) => {
  try {
    const group = await ChatGroup.findOne({ groupId, isActive: true });

    if (!group) {
      throw new Error('Group not found');
    }

    // Check if requesting user has permission
    const requestingMember = group.members.find(m => m.memberId === requestingUserId);
    if (!requestingMember) {
      throw new Error('You are not a member of this group');
    }

    const canAddMember =
      requestingMember.role === 'owner' ||
      requestingMember.role === 'admin' ||
      (group.settings.allowMemberInvite && memberData.memberType === 'user') ||
      (group.settings.allowMemberAddBot && memberData.memberType === 'bot');

    if (!canAddMember) {
      throw new Error('Insufficient permissions to add members');
    }

    // Check max members
    if (group.members.length >= group.settings.maxMembers) {
      throw new Error(`Group has reached maximum capacity of ${group.settings.maxMembers} members`);
    }

    // Check if member already exists
    const existingMember = group.members.find(m => m.memberId === memberData.memberId);
    if (existingMember) {
      throw new Error('Member already exists in group');
    }

    const newMember = {
      memberId: memberData.memberId,
      memberType: memberData.memberType,
      role: memberData.role || 'member',
      botId: memberData.botId,
      botEndpoint: memberData.botEndpoint,
      botModel: memberData.botModel,
      displayName: memberData.displayName,
      avatar: memberData.avatar,
      joinedAt: new Date(),
      isMuted: false,
    };

    const updatedGroup = await ChatGroup.findOneAndUpdate(
      { groupId },
      { $push: { members: newMember } },
      { new: true },
    ).lean();

    // Create system message for member join
    await createGroupMessage({
      groupId,
      senderId: 'system',
      senderType: 'user',
      senderName: 'System',
      messageType: 'system',
      text: `${memberData.displayName || memberData.memberId} joined the group`,
    });

    return updatedGroup;
  } catch (error) {
    logger.error('[addGroupMember] Error adding group member', error);
    throw error;
  }
};

/**
 * Remove a member from a chat group
 * @param {string} groupId - The group ID
 * @param {string} requestingUserId - The user removing the member
 * @param {string} memberIdToRemove - The member ID to remove
 * @returns {Promise<Object>} The updated group
 */
const removeGroupMember = async (groupId, requestingUserId, memberIdToRemove) => {
  try {
    const group = await ChatGroup.findOne({ groupId, isActive: true });

    if (!group) {
      throw new Error('Group not found');
    }

    const requestingMember = group.members.find(m => m.memberId === requestingUserId);
    const memberToRemove = group.members.find(m => m.memberId === memberIdToRemove);

    if (!requestingMember) {
      throw new Error('You are not a member of this group');
    }

    if (!memberToRemove) {
      throw new Error('Member not found in group');
    }

    // Users can remove themselves, or admins/owners can remove others
    const canRemove =
      memberIdToRemove === requestingUserId ||
      requestingMember.role === 'owner' ||
      (requestingMember.role === 'admin' && memberToRemove.role !== 'owner');

    if (!canRemove) {
      throw new Error('Insufficient permissions to remove member');
    }

    // Cannot remove the last owner
    if (memberToRemove.role === 'owner') {
      const ownerCount = group.members.filter(m => m.role === 'owner').length;
      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last owner. Transfer ownership first.');
      }
    }

    const updatedGroup = await ChatGroup.findOneAndUpdate(
      { groupId },
      { $pull: { members: { memberId: memberIdToRemove } } },
      { new: true },
    ).lean();

    // Create system message
    const removedName = memberToRemove.displayName || memberIdToRemove;
    const action = memberIdToRemove === requestingUserId ? 'left' : 'was removed from';
    await createGroupMessage({
      groupId,
      senderId: 'system',
      senderType: 'user',
      senderName: 'System',
      messageType: 'system',
      text: `${removedName} ${action} the group`,
    });

    return updatedGroup;
  } catch (error) {
    logger.error('[removeGroupMember] Error removing group member', error);
    throw error;
  }
};

/**
 * Update a member's role in the group
 * @param {string} groupId - The group ID
 * @param {string} requestingUserId - The user updating the role
 * @param {string} targetMemberId - The member whose role is being updated
 * @param {string} newRole - The new role
 * @returns {Promise<Object>} The updated group
 */
const updateMemberRole = async (groupId, requestingUserId, targetMemberId, newRole) => {
  try {
    const group = await ChatGroup.findOne({ groupId, isActive: true });

    if (!group) {
      throw new Error('Group not found');
    }

    const requestingMember = group.members.find(m => m.memberId === requestingUserId);
    if (!requestingMember || requestingMember.role !== 'owner') {
      throw new Error('Only owners can change member roles');
    }

    const targetMember = group.members.find(m => m.memberId === targetMemberId);
    if (!targetMember) {
      throw new Error('Target member not found in group');
    }

    if (!['owner', 'admin', 'member'].includes(newRole)) {
      throw new Error('Invalid role');
    }

    const updatedGroup = await ChatGroup.findOneAndUpdate(
      { groupId, 'members.memberId': targetMemberId },
      { $set: { 'members.$.role': newRole } },
      { new: true },
    ).lean();

    return updatedGroup;
  } catch (error) {
    logger.error('[updateMemberRole] Error updating member role', error);
    throw error;
  }
};

/**
 * Add a bot to a chat group
 * @param {string} groupId - The group ID
 * @param {string} requestingUserId - The user adding the bot
 * @param {Object} botData - Bot data
 * @returns {Promise<Object>} The updated group
 */
const addBotToGroup = async (groupId, requestingUserId, botData) => {
  try {
    const botMemberId = `bot_${botData.botId}_${crypto.randomUUID().slice(0, 8)}`;

    return await addGroupMember(groupId, requestingUserId, {
      memberId: botMemberId,
      memberType: 'bot',
      role: 'member',
      botId: botData.botId,
      botEndpoint: botData.botEndpoint,
      botModel: botData.botModel,
      displayName: botData.displayName || `Bot ${botData.botId}`,
      avatar: botData.avatar,
    });
  } catch (error) {
    logger.error('[addBotToGroup] Error adding bot to group', error);
    throw error;
  }
};

/**
 * Create a message in a group
 * @param {Object} messageData - Message data
 * @returns {Promise<Object>} The created message
 */
const createGroupMessage = async (messageData) => {
  try {
    const messageId = generateMessageId();
    logger.debug('[createGroupMessageDebug] Creating group message', { text: messageData.text });

    const message = await GroupMessage.create({
      messageId,
      groupId: messageData.groupId,
      senderId: messageData.senderId,
      senderType: messageData.senderType,
      senderName: messageData.senderName,
      senderAvatar: messageData.senderAvatar,
      messageType: messageData.messageType || 'text',
      text: messageData.text || '',
      content: messageData.content,
      mentions: messageData.mentions || [],
      replyTo: messageData.replyTo,
      files: messageData.files,
      attachments: messageData.attachments,
      botMeta: messageData.botMeta,
      metadata: messageData.metadata,
      reactions: [],
      readBy: [],
      isEdited: false,
      isDeleted: false,
      isPinned: false,
      replyCount: 0,
      error: false,
      isGenerating: messageData.isGenerating || false,
    });

    // Update group's last message and message count
    await ChatGroup.findOneAndUpdate(
      { groupId: messageData.groupId },
      {
        $set: {
          lastMessage: {
            messageId,
            text: messageData.text?.substring(0, 100),
            senderId: messageData.senderId,
            senderName: messageData.senderName,
            createdAt: new Date(),
          },
        },
        $inc: { messageCount: 1 },
      },
    );

    return message.toObject();
  } catch (error) {
    logger.error('[createGroupMessage] Error creating group message', error);
    throw new Error('Error creating group message');
  }
};

/**
 * Get messages for a group
 * @param {string} groupId - The group ID
 * @param {string} userId - The requesting user's ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Messages and pagination info
 */
const getGroupMessages = async (groupId, userId, { cursor, limit = 50, before = true } = {}) => {
  try {
    // Verify user is a member
    const group = await ChatGroup.findOne({
      groupId,
      'members.memberId': userId,
      isActive: true,
    });

    if (!group) {
      throw new Error('Group not found or you are not a member');
    }

    const filters = [
      { groupId },
      { isDeleted: false },
    ];

    if (cursor) {
      const cursorDate = new Date(cursor);
      filters.push({
        createdAt: before ? { $lt: cursorDate } : { $gt: cursorDate },
      });
    }

    const query = { $and: filters };
    const sortOrder = before ? -1 : 1;

    const messages = await GroupMessage.find(query)
      .sort({ createdAt: sortOrder })
      .limit(limit + 1)
      .lean();

    let nextCursor = null;
    if (messages.length > limit) {
      const lastMessage = messages.pop();
      nextCursor = lastMessage.createdAt.toISOString();
    }

    // Reverse if fetching before to get chronological order
    if (before) {
      messages.reverse();
    }

    return { messages, nextCursor, hasMore: nextCursor !== null };
  } catch (error) {
    logger.error('[getGroupMessages] Error getting group messages', error);
    throw error;
  }
};

/**
 * Update a group message
 * @param {string} messageId - The message ID
 * @param {string} userId - The requesting user's ID
 * @param {Object} updates - Update fields
 * @returns {Promise<Object>} The updated message
 */
const updateGroupMessage = async (messageId, userId, updates) => {
  try {
    const message = await GroupMessage.findOne({ messageId });

    if (!message) {
      throw new Error('Message not found');
    }

    // Only sender can edit their own message
    if (message.senderId !== userId) {
      throw new Error('You can only edit your own messages');
    }

    // Save edit history
    const editHistoryEntry = {
      text: message.text,
      editedAt: new Date(),
    };

    const updateObj = {
      text: updates.text,
      content: updates.content,
      mentions: updates.mentions,
      isEdited: true,
    };

    const updatedMessage = await GroupMessage.findOneAndUpdate(
      { messageId },
      {
        $set: updateObj,
        $push: { editHistory: editHistoryEntry },
      },
      { new: true },
    ).lean();

    return updatedMessage;
  } catch (error) {
    logger.error('[updateGroupMessage] Error updating group message', error);
    throw error;
  }
};

/**
 * Delete a group message (soft delete)
 * @param {string} messageId - The message ID
 * @param {string} userId - The requesting user's ID
 * @param {string} groupId - The group ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteGroupMessage = async (messageId, userId, groupId) => {
  try {
    const message = await GroupMessage.findOne({ messageId, groupId });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user can delete (sender or admin/owner)
    const group = await ChatGroup.findOne({ groupId });
    const member = group?.members.find(m => m.memberId === userId);

    const canDelete =
      message.senderId === userId ||
      member?.role === 'owner' ||
      member?.role === 'admin';

    if (!canDelete) {
      throw new Error('Insufficient permissions to delete message');
    }

    await GroupMessage.updateOne(
      { messageId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
        },
      },
    );

    return { success: true, message: 'Message deleted successfully' };
  } catch (error) {
    logger.error('[deleteGroupMessage] Error deleting group message', error);
    throw error;
  }
};

/**
 * Add a reaction to a message
 * @param {string} messageId - The message ID
 * @param {string} memberId - The member adding the reaction
 * @param {string} memberName - The member's display name
 * @param {string} emoji - The emoji reaction
 * @returns {Promise<Object>} The updated message
 */
const addMessageReaction = async (messageId, memberId, memberName, emoji) => {
  try {
    // Check if user already reacted with this emoji
    const message = await GroupMessage.findOne({ messageId });
    if (!message) {
      throw new Error('Message not found');
    }

    const existingReaction = message.reactions.find(
      r => r.memberId === memberId && r.emoji === emoji,
    );

    if (existingReaction) {
      // Remove the reaction (toggle off)
      return await GroupMessage.findOneAndUpdate(
        { messageId },
        { $pull: { reactions: { memberId, emoji } } },
        { new: true },
      ).lean();
    }

    // Add the reaction
    return await GroupMessage.findOneAndUpdate(
      { messageId },
      {
        $push: {
          reactions: {
            emoji,
            memberId,
            memberName,
            createdAt: new Date(),
          },
        },
      },
      { new: true },
    ).lean();
  } catch (error) {
    logger.error('[addMessageReaction] Error adding message reaction', error);
    throw error;
  }
};

/**
 * Mark messages as read for a user
 * @param {string} groupId - The group ID
 * @param {string} userId - The user's ID
 * @param {string} lastMessageId - The last message ID that was read
 * @returns {Promise<Object>} Update result
 */
const markMessagesAsRead = async (groupId, userId, lastMessageId) => {
  try {
    // Update user's last read message in the group
    await ChatGroup.updateOne(
      { groupId, 'members.memberId': userId },
      { $set: { 'members.$.lastReadMessageId': lastMessageId } },
    );

    // Add read receipt to messages
    await GroupMessage.updateMany(
      {
        groupId,
        'readBy.memberId': { $ne: userId },
        createdAt: { $lte: new Date() },
      },
      {
        $push: {
          readBy: {
            memberId: userId,
            readAt: new Date(),
          },
        },
      },
    );

    return { success: true };
  } catch (error) {
    logger.error('[markMessagesAsRead] Error marking messages as read', error);
    throw error;
  }
};

/**
 * Get unread message count for a user in a group
 * @param {string} groupId - The group ID
 * @param {string} userId - The user's ID
 * @returns {Promise<number>} Unread message count
 */
const getUnreadCount = async (groupId, userId) => {
  try {
    const group = await ChatGroup.findOne({ groupId, 'members.memberId': userId });
    if (!group) {
      return 0;
    }

    const member = group.members.find(m => m.memberId === userId);
    const lastReadMessageId = member?.lastReadMessageId;

    if (!lastReadMessageId) {
      // Never read any message, count all
      return await GroupMessage.countDocuments({ groupId, isDeleted: false });
    }

    const lastReadMessage = await GroupMessage.findOne({ messageId: lastReadMessageId });
    if (!lastReadMessage) {
      return 0;
    }

    return await GroupMessage.countDocuments({
      groupId,
      isDeleted: false,
      createdAt: { $gt: lastReadMessage.createdAt },
    });
  } catch (error) {
    logger.error('[getUnreadCount] Error getting unread count', error);
    return 0;
  }
};

/**
 * Pin/unpin a message
 * @param {string} messageId - The message ID
 * @param {string} userId - The user's ID
 * @param {boolean} isPinned - Whether to pin or unpin
 * @returns {Promise<Object>} The updated message
 */
const pinMessage = async (messageId, userId, isPinned) => {
  try {
    const updateObj = isPinned
      ? { isPinned: true, pinnedAt: new Date(), pinnedBy: userId }
      : { isPinned: false, pinnedAt: null, pinnedBy: null };

    return await GroupMessage.findOneAndUpdate(
      { messageId },
      { $set: updateObj },
      { new: true },
    ).lean();
  } catch (error) {
    logger.error('[pinMessage] Error pinning message', error);
    throw error;
  }
};

/**
 * Get pinned messages for a group
 * @param {string} groupId - The group ID
 * @returns {Promise<Array>} Pinned messages
 */
const getPinnedMessages = async (groupId) => {
  try {
    return await GroupMessage.find({
      groupId,
      isPinned: true,
      isDeleted: false,
    })
      .sort({ pinnedAt: -1 })
      .lean();
  } catch (error) {
    logger.error('[getPinnedMessages] Error getting pinned messages', error);
    throw error;
  }
};

/**
 * Search messages in a group
 * @param {string} groupId - The group ID
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Matching messages
 */
const searchGroupMessages = async (groupId, query, { limit = 50 } = {}) => {
  try {
    return await GroupMessage.find({
      groupId,
      isDeleted: false,
      text: { $regex: query, $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    logger.error('[searchGroupMessages] Error searching group messages', error);
    throw error;
  }
};

/**
 * Get messages where a user is mentioned
 * @param {string} groupId - The group ID
 * @param {string} userId - The user's ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Messages with mentions
 */
const getMentionedMessages = async (groupId, userId, { limit = 50 } = {}) => {
  try {
    return await GroupMessage.find({
      groupId,
      isDeleted: false,
      'mentions.memberId': userId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    logger.error('[getMentionedMessages] Error getting mentioned messages', error);
    throw error;
  }
};

/**
 * Update a group message by ID (for system/bot updates)
 * @param {string} messageId - The message ID
 * @param {Object} updates - Update fields
 * @returns {Promise<Object>} The updated message
 */
const updateGroupMessageById = async (messageId, updates) => {
  try {
    const updatedMessage = await GroupMessage.findOneAndUpdate(
      { messageId },
      { $set: updates },
      { new: true },
    ).lean();

    return updatedMessage;
  } catch (error) {
    logger.error('[updateGroupMessageById] Error updating group message', error);
    throw error;
  }
};

module.exports = {
  // Group operations
  createChatGroup,
  getChatGroup,
  getUserChatGroups,
  updateChatGroup,
  deleteChatGroup,

  // Member operations
  addGroupMember,
  removeGroupMember,
  updateMemberRole,
  addBotToGroup,

  // Message operations
  createGroupMessage,
  getGroupMessages,
  updateGroupMessage,
  updateGroupMessageById,
  deleteGroupMessage,

  // Reactions and interactions
  addMessageReaction,
  markMessagesAsRead,
  getUnreadCount,
  pinMessage,
  getPinnedMessages,

  // Search
  searchGroupMessages,
  getMentionedMessages,

  // Utilities
  generateGroupId,
  generateMessageId,
};

