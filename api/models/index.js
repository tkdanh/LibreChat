const mongoose = require('mongoose');
const { createMethods } = require('@librechat/data-schemas');
const methods = createMethods(mongoose);
const { comparePassword } = require('./userMethods');
const {
  getMessage,
  getMessages,
  saveMessage,
  recordMessage,
  updateMessage,
  deleteMessagesSince,
  deleteMessages,
} = require('./Message');
const { getConvoTitle, getConvo, saveConvo, deleteConvos } = require('./Conversation');
const { getPreset, getPresets, savePreset, deletePresets } = require('./Preset');
const {
  // Chat Group operations
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
} = require('./ChatGroup');
const { File } = require('~/db/models');

const seedDatabase = async () => {
  await methods.initializeRoles();
  await methods.seedDefaultRoles();
  await methods.ensureDefaultCategories();
};

module.exports = {
  ...methods,
  seedDatabase,
  comparePassword,

  getMessage,
  getMessages,
  saveMessage,
  recordMessage,
  updateMessage,
  deleteMessagesSince,
  deleteMessages,

  getConvoTitle,
  getConvo,
  saveConvo,
  deleteConvos,

  getPreset,
  getPresets,
  savePreset,
  deletePresets,

  // Chat Group exports
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
  updateGroupMessageById,
  deleteGroupMessage,
  addMessageReaction,
  markMessagesAsRead,
  getUnreadCount,
  pinMessage,
  getPinnedMessages,
  searchGroupMessages,
  getMentionedMessages,

  Files: File,
};
