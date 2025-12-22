const express = require('express');
const { logger } = require('@librechat/data-schemas');
const {
  createChatGroup,
  getChatGroup,
  getUserChatGroups,
  updateChatGroup,
  deleteChatGroup,
  addGroupMember,
  removeGroupMember,
  updateMemberRole,
  addBotToGroup,
  createGroupMessage,
  getGroupMessages,
  updateGroupMessage,
  deleteGroupMessage,
  addMessageReaction,
  markMessagesAsRead,
  getUnreadCount,
  pinMessage,
  getPinnedMessages,
  searchGroupMessages,
  getMentionedMessages,
} = require('~/models');
const { processBotMentions } = require('~/server/services/GroupBotService');
const { requireJwtAuth, checkBan } = require('~/server/middleware');

const router = express.Router();

// Apply middleware
router.use(requireJwtAuth);
router.use(checkBan);

// ============================================
// CHAT GROUP ROUTES
// ============================================

/**
 * GET /api/chat-groups
 * Get all chat groups for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const { cursor, limit, isArchived } = req.query;
    const result = await getUserChatGroups(req.user.id, {
      cursor,
      limit: parseInt(limit, 10) || 25,
      isArchived: isArchived === 'true',
    });
    res.status(200).json(result);
  } catch (error) {
    logger.error('[GET /api/chat-groups] Error:', error);
    res.status(500).json({ error: 'Error fetching chat groups' });
  }
});

/**
 * POST /api/chat-groups
 * Create a new chat group
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, avatar, settings, tags } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    if (name.length > 100) {
      return res.status(400).json({ error: 'Group name must be 100 characters or less' });
    }

    const group = await createChatGroup({
      createdBy: req.user.id,
      name: name.trim(),
      description: description?.trim(),
      avatar,
      settings,
      tags,
    });

    res.status(201).json(group);
  } catch (error) {
    logger.error('[POST /api/chat-groups] Error:', error);
    res.status(500).json({ error: 'Error creating chat group' });
  }
});

/**
 * GET /api/chat-groups/:groupId
 * Get a specific chat group
 */
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await getChatGroup(groupId, req.user.id);

    if (!group) {
      return res.status(404).json({ error: 'Group not found or you are not a member' });
    }

    res.status(200).json(group);
  } catch (error) {
    logger.error('[GET /api/chat-groups/:groupId] Error:', error);
    res.status(500).json({ error: 'Error fetching chat group' });
  }
});

/**
 * PATCH /api/chat-groups/:groupId
 * Update a chat group
 */
router.patch('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const updates = req.body;

    const group = await updateChatGroup(groupId, req.user.id, updates);
    res.status(200).json(group);
  } catch (error) {
    logger.error('[PATCH /api/chat-groups/:groupId] Error:', error);
    if (error.message.includes('permissions') || error.message.includes('not found')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error updating chat group' });
  }
});

/**
 * DELETE /api/chat-groups/:groupId
 * Delete a chat group (soft delete)
 */
router.delete('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const result = await deleteChatGroup(groupId, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    logger.error('[DELETE /api/chat-groups/:groupId] Error:', error);
    if (error.message.includes('permissions') || error.message.includes('not found')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error deleting chat group' });
  }
});

// ============================================
// MEMBER ROUTES
// ============================================

/**
 * POST /api/chat-groups/:groupId/members
 * Add a member to the group
 */
router.post('/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const memberData = req.body;

    if (!memberData.memberId) {
      return res.status(400).json({ error: 'Member ID is required' });
    }

    if (!memberData.memberType || !['user', 'bot'].includes(memberData.memberType)) {
      return res.status(400).json({ error: 'Valid member type (user or bot) is required' });
    }

    const group = await addGroupMember(groupId, req.user.id, memberData);
    res.status(201).json(group);
  } catch (error) {
    logger.error('[POST /api/chat-groups/:groupId/members] Error:', error);
    if (error.message.includes('permissions') || error.message.includes('capacity')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error adding member to group' });
  }
});

/**
 * POST /api/chat-groups/:groupId/bots
 * Add a bot to the group
 */
router.post('/:groupId/bots', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { botId, botEndpoint, botModel, displayName, avatar } = req.body;

    if (!botId || !botEndpoint) {
      return res.status(400).json({ error: 'Bot ID and endpoint are required' });
    }

    const group = await addBotToGroup(groupId, req.user.id, {
      botId,
      botEndpoint,
      botModel,
      displayName,
      avatar,
    });

    res.status(201).json(group);
  } catch (error) {
    logger.error('[POST /api/chat-groups/:groupId/bots] Error:', error);
    if (error.message.includes('permissions')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error adding bot to group' });
  }
});

/**
 * DELETE /api/chat-groups/:groupId/members/:memberId
 * Remove a member from the group
 */
router.delete('/:groupId/members/:memberId', async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const group = await removeGroupMember(groupId, req.user.id, memberId);
    res.status(200).json(group);
  } catch (error) {
    logger.error('[DELETE /api/chat-groups/:groupId/members/:memberId] Error:', error);
    if (error.message.includes('permissions') || error.message.includes('owner')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error removing member from group' });
  }
});

/**
 * PATCH /api/chat-groups/:groupId/members/:memberId/role
 * Update a member's role
 */
router.patch('/:groupId/members/:memberId/role', async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { role } = req.body;

    if (!role || !['owner', 'admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Valid role (owner, admin, member) is required' });
    }

    const group = await updateMemberRole(groupId, req.user.id, memberId, role);
    res.status(200).json(group);
  } catch (error) {
    logger.error('[PATCH /api/chat-groups/:groupId/members/:memberId/role] Error:', error);
    if (error.message.includes('Only owners')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error updating member role' });
  }
});

/**
 * POST /api/chat-groups/:groupId/leave
 * Leave the group (shortcut for removing yourself)
 */
router.post('/:groupId/leave', async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await removeGroupMember(groupId, req.user.id, req.user.id);
    res.status(200).json({ success: true, message: 'Successfully left the group' });
  } catch (error) {
    logger.error('[POST /api/chat-groups/:groupId/leave] Error:', error);
    res.status(500).json({ error: error.message || 'Error leaving group' });
  }
});

// ============================================
// MESSAGE ROUTES
// ============================================

/**
 * GET /api/chat-groups/:groupId/messages
 * Get messages for a group
 */
router.get('/:groupId/messages', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { cursor, limit, before } = req.query;

    const result = await getGroupMessages(groupId, req.user.id, {
      cursor,
      limit: parseInt(limit, 10) || 50,
      before: before !== 'false',
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error('[GET /api/chat-groups/:groupId/messages] Error:', error);
    if (error.message.includes('not a member')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

/**
 * POST /api/chat-groups/:groupId/messages
 * Send a message to the group
 */
router.post('/:groupId/messages', async (req, res) => {
  try {
    const { groupId } = req.params;
    const {
      text,
      replyToMessageId,
      mentions,
      files,
      attachments,
      metadata,
    } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Verify user is a member
    const group = await getChatGroup(groupId, req.user.id);
    if (!group) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // Get member info
    const member = group.members.find(m => m.memberId === req.user.id);

    // Build reply reference if replying
    let replyTo;
    if (replyToMessageId) {
      const messages = await getGroupMessages(groupId, req.user.id, { limit: 1 });
      // For simplicity, we'll set basic reply info
      replyTo = {
        messageId: replyToMessageId,
        // Could fetch the original message to get sender info
      };
    }

    // Parse mentions from text (@ mentions)
    const parsedMentions = mentions || [];

    const message = await createGroupMessage({
      groupId,
      senderId: req.user.id,
      senderType: 'user',
      senderName: member?.displayName || req.user.name || req.user.username,
      senderAvatar: member?.avatar || req.user.avatar,
      messageType: 'text',
      text: text.trim(),
      mentions: parsedMentions,
      replyTo,
      files,
      attachments,
      metadata,
    });

    // Check if any bots were mentioned and should respond
    if (group.settings?.botRespondOnMention && parsedMentions.length > 0) {
      const mentionedBots = parsedMentions.filter(m => m.memberType === 'bot');
      if (mentionedBots.length > 0) {
        logger.info(`[POST /api/chat-groups/:groupId/messages] Triggering bot responses for mentioned bots: ${mentionedBots.map(b => b.memberId).join(', ')}`);
        // Trigger bot responses asynchronously (don't await - let it run in background)
        processBotMentions({
          groupId,
          group,
          message,
          mentionedBots,
          req,
          userId: req.user.id,
        }).catch(error => {
          logger.error('[POST /api/chat-groups/:groupId/messages] Bot response error:', error);
        });
      }
    }

    res.status(201).json(message);
  } catch (error) {
    logger.error('[POST /api/chat-groups/:groupId/messages] Error:', error);
    res.status(500).json({ error: 'Error sending message' });
  }
});

/**
 * PATCH /api/chat-groups/:groupId/messages/:messageId
 * Edit a message
 */
router.patch('/:groupId/messages/:messageId', async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const { text, mentions } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const message = await updateGroupMessage(messageId, req.user.id, {
      text: text.trim(),
      mentions,
    });

    res.status(200).json(message);
  } catch (error) {
    logger.error('[PATCH /api/chat-groups/:groupId/messages/:messageId] Error:', error);
    if (error.message.includes('own messages')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error updating message' });
  }
});

/**
 * DELETE /api/chat-groups/:groupId/messages/:messageId
 * Delete a message
 */
router.delete('/:groupId/messages/:messageId', async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const result = await deleteGroupMessage(messageId, req.user.id, groupId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('[DELETE /api/chat-groups/:groupId/messages/:messageId] Error:', error);
    if (error.message.includes('permissions')) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error deleting message' });
  }
});

// ============================================
// REACTIONS AND INTERACTIONS
// ============================================

/**
 * POST /api/chat-groups/:groupId/messages/:messageId/reactions
 * Add or toggle a reaction on a message
 */
router.post('/:groupId/messages/:messageId/reactions', async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const message = await addMessageReaction(
      messageId,
      req.user.id,
      req.user.name || req.user.username,
      emoji,
    );

    res.status(200).json(message);
  } catch (error) {
    logger.error('[POST /api/chat-groups/:groupId/messages/:messageId/reactions] Error:', error);
    res.status(500).json({ error: 'Error adding reaction' });
  }
});

/**
 * POST /api/chat-groups/:groupId/messages/:messageId/pin
 * Pin or unpin a message
 */
router.post('/:groupId/messages/:messageId/pin', async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const { isPinned } = req.body;

    const message = await pinMessage(messageId, req.user.id, isPinned !== false);
    res.status(200).json(message);
  } catch (error) {
    logger.error('[POST /api/chat-groups/:groupId/messages/:messageId/pin] Error:', error);
    res.status(500).json({ error: 'Error pinning message' });
  }
});

/**
 * GET /api/chat-groups/:groupId/pinned
 * Get pinned messages for a group
 */
router.get('/:groupId/pinned', async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await getPinnedMessages(groupId);
    res.status(200).json(messages);
  } catch (error) {
    logger.error('[GET /api/chat-groups/:groupId/pinned] Error:', error);
    res.status(500).json({ error: 'Error fetching pinned messages' });
  }
});

/**
 * POST /api/chat-groups/:groupId/read
 * Mark messages as read
 */
router.post('/:groupId/read', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { lastMessageId } = req.body;

    if (!lastMessageId) {
      return res.status(400).json({ error: 'Last message ID is required' });
    }

    const result = await markMessagesAsRead(groupId, req.user.id, lastMessageId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('[POST /api/chat-groups/:groupId/read] Error:', error);
    res.status(500).json({ error: 'Error marking messages as read' });
  }
});

/**
 * GET /api/chat-groups/:groupId/unread
 * Get unread message count
 */
router.get('/:groupId/unread', async (req, res) => {
  try {
    const { groupId } = req.params;
    const count = await getUnreadCount(groupId, req.user.id);
    res.status(200).json({ unreadCount: count });
  } catch (error) {
    logger.error('[GET /api/chat-groups/:groupId/unread] Error:', error);
    res.status(500).json({ error: 'Error fetching unread count' });
  }
});

// ============================================
// SEARCH ROUTES
// ============================================

/**
 * GET /api/chat-groups/:groupId/search
 * Search messages in a group
 */
router.get('/:groupId/search', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { q, limit } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const messages = await searchGroupMessages(groupId, q.trim(), {
      limit: parseInt(limit, 10) || 50,
    });

    res.status(200).json({ messages });
  } catch (error) {
    logger.error('[GET /api/chat-groups/:groupId/search] Error:', error);
    res.status(500).json({ error: 'Error searching messages' });
  }
});

/**
 * GET /api/chat-groups/:groupId/mentions
 * Get messages where the user is mentioned
 */
router.get('/:groupId/mentions', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit } = req.query;

    const messages = await getMentionedMessages(groupId, req.user.id, {
      limit: parseInt(limit, 10) || 50,
    });

    res.status(200).json({ messages });
  } catch (error) {
    logger.error('[GET /api/chat-groups/:groupId/mentions] Error:', error);
    res.status(500).json({ error: 'Error fetching mentions' });
  }
});

module.exports = router;

