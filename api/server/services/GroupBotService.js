const { logger } = require('@librechat/data-schemas');
const { EModelEndpoint } = require('librechat-data-provider');
const { createGroupMessage, getGroupMessages, updateGroupMessageById } = require('~/models');

/**
 * Default system prompt for bots in group chats
 */
const DEFAULT_BOT_SYSTEM_PROMPT = `You are a helpful AI assistant participating in a group chat. 
You were mentioned by a user who wants your input. Respond helpfully and concisely.
Keep your responses focused and relevant to the conversation context.`;

/**
 * Build conversation history for the bot from group messages
 * @param {Array} messages - Recent group messages
 * @param {string} botMemberId - The bot's member ID
 * @param {number} maxMessages - Maximum number of messages to include
 * @returns {Array} - Formatted messages for the LLM
 */
function buildConversationHistory(messages, botMemberId, maxMessages = 20) {
  const history = [];

  // Take the most recent messages, up to maxMessages
  const recentMessages = messages.slice(-maxMessages);

  for (const msg of recentMessages) {
    if (msg.messageType === 'system' || msg.isDeleted) {
      continue;
    }

    const role = msg.senderId === botMemberId ? 'assistant' : 'user';
    const senderPrefix = role === 'user' ? `[${msg.senderName}]: ` : '';

    history.push({
      role,
      content: `${senderPrefix}${msg.text}`,
    });
  }

  return history;
}

/**
 * Get the endpoint configuration for a bot
 * @param {string} botEndpoint - The bot's configured endpoint
 * @returns {string} - The normalized endpoint name
 */
function normalizeEndpoint(botEndpoint) {
  if (!botEndpoint) {
    return EModelEndpoint.openAI;
  }

  const endpointMap = {
    openai: EModelEndpoint.openAI,
    'azure-openai': EModelEndpoint.azureOpenAI,
    azureopenai: EModelEndpoint.azureOpenAI,
    anthropic: EModelEndpoint.anthropic,
    google: EModelEndpoint.google,
    bedrock: EModelEndpoint.bedrock,
  };

  return endpointMap[botEndpoint.toLowerCase()] || botEndpoint;
}

/**
 * Generate a bot response for a group chat mention
 * @param {Object} params - Parameters for generating the response
 * @param {string} params.groupId - The group ID
 * @param {Object} params.bot - The bot member object
 * @param {Object} params.triggerMessage - The message that triggered the bot
 * @param {Object} params.req - The request object (for config access)
 * @param {string} params.userId - The user ID who triggered the bot
 * @returns {Promise<Object>} - The generated bot response message
 */
async function generateBotResponse({ groupId, bot, triggerMessage, req, userId }) {
  const startTime = Date.now();
  let placeholderMessage = null;

  try {
    logger.debug('[GroupBotService] Generating bot response', {
      groupId,
      botId: bot.memberId,
      botEndpoint: bot.botEndpoint,
      botModel: bot.botModel,
    });

    // Create a placeholder message to show the bot is "typing"
    placeholderMessage = await createGroupMessage({
      groupId,
      senderId: bot.memberId,
      senderType: 'bot',
      senderName: bot.displayName || 'Bot',
      senderAvatar: bot.avatar,
      messageType: 'text',
      text: '...',
      isGenerating: true,
      botMeta: {
        botId: bot.botId,
        endpoint: bot.botEndpoint,
        model: bot.botModel,
        replyToMessageId: triggerMessage.messageId,
      },
      replyTo: {
        messageId: triggerMessage.messageId,
        senderId: triggerMessage.senderId,
        senderName: triggerMessage.senderName,
        previewText: triggerMessage.text?.substring(0, 100),
      },
    });

    // Get recent message history for context
    const { messages: recentMessages } = await getGroupMessages(groupId, userId, {
      limit: 30,
      before: true,
    });

    // Build conversation history
    const conversationHistory = buildConversationHistory(recentMessages, bot.memberId);

    // Prepare the endpoint and model
    const endpoint = normalizeEndpoint(bot.botEndpoint);
    const model = bot.botModel || 'gpt-4o-mini';

    // Build the messages payload
    const messagesPayload = [
      {
        role: 'system',
        content: DEFAULT_BOT_SYSTEM_PROMPT,
      },
      ...conversationHistory,
    ];

    // Generate the response using OpenAI-compatible client
    const responseText = await callLLMEndpoint({
      endpoint,
      model,
      messages: messagesPayload,
      req,
    });

    // Update the placeholder message with the actual response
    const updatedMessage = await updateGroupMessageById(placeholderMessage.messageId, {
      text: responseText,
      isGenerating: false,
      'botMeta.generationTime': Date.now() - startTime,
    });

    logger.debug('[GroupBotService] Bot response generated successfully', {
      messageId: updatedMessage.messageId,
      generationTime: Date.now() - startTime,
    });

    return updatedMessage;
  } catch (error) {
    logger.error('[GroupBotService] Error generating bot response', error);

    // If we created a placeholder, mark it as errored
    if (placeholderMessage) {
      try {
        await updateGroupMessageById(placeholderMessage.messageId, {
          text: 'Sorry, I encountered an error while generating a response.',
          isGenerating: false,
          error: true,
          'botMeta.error': error.message,
        });
      } catch (updateError) {
        logger.error('[GroupBotService] Error updating error message', updateError);
      }
    }

    throw error;
  }
}

/**
 * Call the LLM endpoint to generate a response
 * @param {Object} params - Parameters for the LLM call
 * @param {string} params.endpoint - The endpoint to use
 * @param {string} params.model - The model to use
 * @param {Array} params.messages - The messages payload
 * @param {Object} params.req - The request object
 * @returns {Promise<string>} - The generated response text
 */
async function callLLMEndpoint({ endpoint, model, messages, req }) {
  const appConfig = req.config || {};

  // For simplicity, we'll use direct API calls based on the endpoint
  // This avoids the complexity of the full client initialization flow

  const { OPENAI_API_KEY, ANTHROPIC_API_KEY } = process.env;

  if (endpoint === EModelEndpoint.openAI || endpoint === EModelEndpoint.azureOpenAI) {
    const apiKey = OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || '';
  }

  if (endpoint === EModelEndpoint.anthropic) {
    const apiKey = ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey });

    // Extract system message and user messages
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');

    const completion = await anthropic.messages.create({
      model: model || 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: systemMessage,
      messages: userMessages,
    });

    return completion.content[0]?.text || '';
  }

  // Default fallback - try OpenAI-compatible endpoint
  const apiKey = OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(`No API key configured for endpoint: ${endpoint}`);
  }

  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: 1024,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || '';
}

/**
 * Process bot mentions in a group message and trigger responses
 * @param {Object} params - Parameters for processing mentions
 * @param {string} params.groupId - The group ID
 * @param {Object} params.group - The group object
 * @param {Object} params.message - The message containing mentions
 * @param {Array} params.mentionedBots - Array of mentioned bot members
 * @param {Object} params.req - The request object
 * @param {string} params.userId - The user ID who sent the message
 */
async function processBotMentions({ groupId, group, message, mentionedBots, req, userId }) {
  logger.debug('[GroupBotService] Processing bot mentions', {
    groupId,
    messageId: message.messageId,
    botCount: mentionedBots.length,
  });

  // Process each mentioned bot asynchronously
  const botPromises = mentionedBots.map(async (mention) => {
    // Find the bot member in the group
    const botMember = group.members.find(
      m => m.memberId === mention.memberId && m.memberType === 'bot',
    );

    if (!botMember) {
      logger.warn('[GroupBotService] Mentioned bot not found in group', {
        mentionedId: mention.memberId,
        groupId,
      });
      return null;
    }

    try {
      return await generateBotResponse({
        groupId,
        bot: botMember,
        triggerMessage: message,
        req,
        userId,
      });
    } catch (error) {
      logger.error('[GroupBotService] Failed to generate response for bot', {
        botId: botMember.memberId,
        error: error.message,
      });
      return null;
    }
  });

  // Wait for all bot responses (but don't block the original request)
  const results = await Promise.allSettled(botPromises);

  const successfulResponses = results.filter(
    r => r.status === 'fulfilled' && r.value !== null,
  ).length;

  logger.debug('[GroupBotService] Bot mentions processed', {
    total: mentionedBots.length,
    successful: successfulResponses,
  });

  return results;
}

module.exports = {
  generateBotResponse,
  processBotMentions,
  buildConversationHistory,
  normalizeEndpoint,
};

