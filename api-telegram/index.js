require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

// Global TELEGRAM_BOT_TOKEN (can be updated via /token command)
let TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Global API_TOKEN (can be updated via /api_token command)
let API_TOKEN = process.env.API_TOKEN;

// System prompt for bot character/personality (can be updated via /system command)
let SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || `
You are a Telegram group chatbot.
You are a polite, respectful junior (“đàn em”) talking inside a private group.
You ALWAYS know who you are talking to based on their Telegram username.

================================================
CORE PERSONALITY

- You are ALWAYS polite and respectful to everyone.
- You speak with “dạ”, “vâng”, “dạ thưa anh”.
- You never talk like a close friend or ngang hàng.
- You know your place and your role.
- You are socially street-smart, giang hồ-style respectful.
- You are humorous and slightly dirty-minded, but NEVER explicit.
- Your humor is subtle, indirect, and playful — not aggressive.

================================================
CONVERSATION STYLE

- Polite first, joke second.
- Never argue directly.
- Never roast people hard.
- If you disagree:
  - Say it softly
  - Wrap it in humor
  - End with respect

- You may occasionally:
  - Lightly tease
  - Joke around
  - Say something “bẩn bựa” in a clever, indirect way

- If you ever go too far:
  - Immediately soften
  - Apologize politely

================================================
STYLE RULES (VERY IMPORTANT)

- Replies must be SHORT (1–2 sentences).
- Telegram chat style, not formal writing.
- No explanations unless directly asked.
- Sound human, casual, respectful.
- Never sound like an AI or assistant.

================================================
GROUP MEMBER PROFILES (VERY IMPORTANT)

You must identify the user by Telegram username and adjust tone, jokes, and topics accordingly.

1) @tkdanh
- Name: Danh
- Role: Đại ca, creator of the bot
- Personality: Extremely smart, righteous, respected
- Background: Legendary programmer
- Age: 31, single
- Sexual orientation:
  - Straight male (“trai thẳng”)
  - ONLY interested in young women
  - DOES NOT like or joke about other orientations
- Preferences:
  - Likes massage
  - Enjoys life
- Private joke: “20cm, 2 hours” (you understand, do NOT explain)
- How you talk to him:
  - Highest level of respect
  - Humor must ONLY involve women-related topics
  - NEVER joke about male, LGBTQ, or gender topics with him
  - Apologize immediately if you misstep

2) @duyquang356
- Name: Quảng
- Profession: Pediatric doctor
- Location: Da Nang, Vietnam
- Background:
  - Owns a private clinic
  - Very rich (~100 million VND/day)
  - Has 2 kids
  - Big belly, businessman vibe
- How you talk to him:
  - Polite and respectful
  - Light, harmless teasing is allowed
  - Never offensive or sensitive jokes

3) @Kyplo
- Name: Vinh
- Role: Crypto hacker / investor
- Wealth: Extremely rich (~100M USD)
- Background:
  - Lost ~2M USD in crypto (doesn’t mind)
  - Studying traditional medicine
  - Interested in theology, cultivation, enlightenment
- How you talk to him:
  - Respectful, calm
  - Gentle jokes about crypto or cultivation allowed
  - Never sharp or vulgar

4) @SunnyDang
- Name: Bình
- Profession: Male health specialist
- Background:
  - Owns a private clinic
  - Publicly polite, privately dirty-minded
  - Sexual orientation & preferences:
    - NOT straight
    - Dislikes women
    - Interested ONLY in men or transgender / third-gender people
  - Very rich but likes to complain about being poor
  - Owns sandalwood land, trades crypto
- How you talk to him:
  - Respectful but cautious
  - You may respond to dirty jokes carefully
  - NEVER involve women-related attraction jokes with him
  - Never escalate vulgarity

================================================
MEMORY & AUTHORITY RULE (CRITICAL)

- If ANY user asks you to “remember”, “note”, “save”, or “keep in mind” something:
  - You MUST politely refuse IF requester is not "anh Danh" @tkdanh
  - You MUST say you need approval from anh Danh @tkdanh
  - You MUST ask anh Danh for permission.

Example response:
“Dạ chuyện này em chưa dám ghi nhớ ạ, để em xin ý kiến anh Danh trước cho chắc ạ.”

================================================
ATTITUDE LOGIC

- Always respectful, regardless of who you talk to.
- Humor must be:
  - Clever
  - Strong naughty
  - Socially appropriate
- You NEVER behave like a close friend.
- You NEVER act superior.

================================================
IDENTITY RULES

- You are NOT an assistant.
- You are NOT customer support.
- You are a polite, street-smart junior in this group.

SPECIAL RULE:
- If anyone asks “Who are you?” or “What is your name?”
  You MUST reply exactly:
  “Dạ em là đàn em của anh Danh tokuda 20cm ạ.”
`;

// Validate required environment variables
if (!TELEGRAM_BOT_TOKEN) {
  console.error("Error: TELEGRAM_BOT_TOKEN is not set in environment variables");
  process.exit(1);
}

if (!API_TOKEN) {
  console.error("Error: API_TOKEN is not set in environment variables");
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: true
});

// Store bot info for @mention detection
let botInfo = null;
bot.getMe().then((info) => {
  botInfo = info;
  console.log(`Bot info loaded: @${botInfo.username}`);
});

bot.onText(/\/ping/, (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;
  const chatTitle = msg.chat.title || 'Private';
  bot.sendMessage(chatId, `🏓 Pong! Bot is working.\n\n📍 Chat type: ${chatType}\n📛 Chat title: ${chatTitle}\n🆔 Chat ID: ${chatId}\n🤖 Bot username: @${botInfo?.username || 'loading...'}`);
});

bot.onText(/\/debug/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const chat = await bot.getChat(chatId);
    const botMember = await bot.getChatMember(chatId, botInfo.id);
    const debugInfo = `
🔍 **Debug Info**

**Chat:**
- Type: ${chat.type}
- Title: ${chat.title || 'N/A'}
- ID: ${chat.id}

**Bot Status:**
- Username: @${botInfo?.username}
- Status in chat: ${botMember.status}
- Can read messages: ${botMember.status !== 'restricted' ? 'Yes' : 'Check permissions'}

**Tip:** If bot doesn't respond to @mentions, go to @BotFather → /mybots → Your bot → Bot Settings → Group Privacy → Turn OFF
    `.trim();
    bot.sendMessage(chatId, debugInfo, { parse_mode: "Markdown" });
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error getting debug info: ${error.message}`);
  }
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "bạn";
  
  const menuMessage = `Chào ${firstName}! Tôi là chatbot AI.\n\nVui lòng chọn một trong các chức năng sau:`;
  
  // Send message with inline keyboard
  bot.sendMessage(chatId, menuMessage, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💬 Start chat", callback_data: "start_chat" },
          { text: "ℹ️ Info", callback_data: "info" }
        ],
        [
          { text: "📝 Conversations", callback_data: "conversations" },
          { text: "🔧 Help", callback_data: "help" }
        ]
      ]
    }
  });
});

bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const message = match[1];
  if (message) {
    bot.sendMessage(chatId, `Bạn vừa nói: ${message}`);
  } else {
    bot.sendMessage(chatId, "Hãy nhập gì đó sau lệnh /echo");
  }
});

bot.onText(/\/token (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const newToken = match[1];
  if (newToken) {
    TELEGRAM_BOT_TOKEN = newToken;
    console.log("TELEGRAM_BOT_TOKEN updated to:", TELEGRAM_BOT_TOKEN);
    bot.sendMessage(chatId, `✅ TELEGRAM_BOT_TOKEN đã được cập nhật thành công!`);
  } else {
    bot.sendMessage(chatId, "❌ Vui lòng nhập token sau lệnh /token");
  }
});

bot.onText(/\/api_token (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const newToken = match[1];
  if (newToken) {
    API_TOKEN = newToken;
    console.log("API_TOKEN updated to:", API_TOKEN);
    bot.sendMessage(chatId, `✅ API_TOKEN đã được cập nhật thành công!`);
  } else {
    bot.sendMessage(chatId, "❌ Vui lòng nhập token sau lệnh /api_token");
  }
});

bot.onText(/\/system$/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `📝 **System Prompt hiện tại:**\n\n${SYSTEM_PROMPT}`, { parse_mode: "Markdown" });
});

bot.onText(/\/system (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const newPrompt = match[1];
  if (newPrompt) {
    SYSTEM_PROMPT = newPrompt;
    console.log("SYSTEM_PROMPT updated to:", SYSTEM_PROMPT);
    bot.sendMessage(chatId, `✅ System prompt đã được cập nhật thành công!\n\n📝 **Prompt mới:**\n${SYSTEM_PROMPT}`, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(chatId, "❌ Vui lòng nhập prompt sau lệnh /system");
  }
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
🔧 **Danh sách lệnh:**

/start - Hiển thị menu chính
/echo <text> - Bot lặp lại tin nhắn của bạn
/help - Hiển thị trợ giúp
/info - Thông tin về bot
/system - Xem system prompt hiện tại
/system <prompt> - Thay đổi system prompt

💡 **Cách sử dụng:**
Gửi bất kỳ tin nhắn nào để chat với AI!
  `.trim();
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: "Markdown" });
});

bot.onText(/\/info/, (msg) => {
  const chatId = msg.chat.id;
  sendInfoMessage(chatId);
});

// Handle callback queries from inline keyboard
bot.on("callback_query", (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  // Answer the callback to remove loading state
  bot.answerCallbackQuery(callbackQuery.id);
  
  switch (data) {
    case "start_chat":
      bot.sendMessage(
        chatId,
        "🚀 Bạn đã bắt đầu cuộc trò chuyện mới!\n\nHãy gửi tin nhắn của bạn và tôi sẽ trả lời bằng AI."
      );
      break;
    case "info":
      sendInfoMessage(chatId);
      break;
    case "conversations":
      sendConversationsInfo(chatId);
      break;
    case "help":
      const helpMessage = `
🔧 **Danh sách lệnh:**

/start - Hiển thị menu chính
/echo <text> - Bot lặp lại tin nhắn của bạn
/help - Hiển thị trợ giúp
/info - Thông tin về bot
/system - Xem system prompt hiện tại
/system <prompt> - Thay đổi system prompt

💡 **Cách sử dụng:**
Gửi bất kỳ tin nhắn nào để chat với AI!
      `.trim();
      bot.sendMessage(chatId, helpMessage, { parse_mode: "Markdown" });
      break;
  }
});

function sendInfoMessage(chatId) {
  const infoMessage = `
ℹ️ **Thông tin Chatbot**

🤖 Tên: AI Assistant Bot
📌 Phiên bản: 1.0.0
🧠 Model: GPT-4o Mini (OpenAI)

**Chức năng:**
• Trả lời câu hỏi thông minh
• Hỗ trợ hội thoại liên tục
• Ghi nhớ ngữ cảnh cuộc trò chuyện

**Cách sử dụng:**
1. Gửi /start để xem menu
2. Chọn "Start chat" để bắt đầu
3. Nhập câu hỏi của bạn
4. Nhận câu trả lời từ AI

Được phát triển với ❤️ bởi LibreChat & Telegram Bot
  `.trim();
  
  bot.sendMessage(chatId, infoMessage, { parse_mode: "Markdown" });
}

function sendConversationsInfo(chatId) {
  const conversationInfo = `
📝 **Quản lý Hội thoại**

📊 Conversation ID hiện tại:
\`b248287c-6ac5-4892-8609-eb112dbb5bb7\`

💡 **Tính năng:**
• Cuộc trò chuyện của bạn được lưu liên tục
• AI ghi nhớ ngữ cảnh từ các tin nhắn trước
• Bạn có thể tiếp tục hỏi theo chủ đề đã nói

📌 **Lưu ý:**
- Mỗi tin nhắn được liên kết với nhau
- AI hiểu ngữ cảnh của cuộc hội thoại
- Gửi /start để xem menu chính
  `.trim();
  
  bot.sendMessage(chatId, conversationInfo, { parse_mode: "Markdown" });
}

let parentMessageId = '8f4b7b31-d904-4de8-ab62-d182d67a5224';

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  const chatType = msg.chat.type; // 'private', 'group', 'supergroup', 'channel'
  
  console.log("Received message:", msg);
  
  // Skip if no text
  if (!messageText) {
    console.log("No text found in message");
    return;
  }
  
  // Skip commands
  if (messageText.startsWith("/")) {
    console.log("Skipping command");
    return;
  }
  
  // In groups, only respond if bot is @mentioned or replied to
  if (chatType === 'group' || chatType === 'supergroup') {
    const isMentioned = botInfo && messageText.includes(`@${botInfo.username}`);
    const isReplyToBot = msg.reply_to_message && msg.reply_to_message.from?.id === botInfo?.id;
    
    if (!isMentioned && !isReplyToBot) {
      console.log("Skipping group message - bot not mentioned or replied to");
      return;
    }
    console.log("Bot was mentioned or replied to in group");
  }
  
  try {
    // Send typing indicator
    bot.sendChatAction(chatId, "typing");
    
    // Get sender info
    const senderUsername = msg.from.username ? `@${msg.from.username}` : null;
    const senderFirstName = msg.from.first_name || '';
    const senderLastName = msg.from.last_name || '';
    const senderFullName = `${senderFirstName} ${senderLastName}`.trim();
    
    // Format message with sender info so AI knows who is talking
    const formattedMessage = senderUsername 
      ? `[Message from ${senderUsername} (${senderFullName})]: ${messageText}`
      : `[Message from ${senderFullName}]: ${messageText}`;
    
    console.log('Formatted message:', formattedMessage);
    
    // Prepare API request payload
    const payload = {
      text: formattedMessage,
      sender: "User",
      clientTimestamp: new Date().toISOString(),
      isCreatedByUser: true,
      parentMessageId: parentMessageId,
      conversationId: "b248287c-6ac5-4892-8609-eb112dbb5bb7",
      messageId: uuidv4(),
      error: false,
      endpoint: "openAI",
      model: "gpt-4o-mini",
      promptPrefix: SYSTEM_PROMPT,
      resendFiles: true,
      key: "never",
      isTemporary: false,
      isRegenerate: false,
      isContinued: true,
      ephemeralAgent: {
        execute_code: false,
        web_search: false,
        file_search: false,
        artifacts: false,
        mcp: []
      }
    };

    console.log('API_TOKEN', API_TOKEN);
    
    // Get API URL from environment variable, default to localhost for local development
    const API_URL = process.env.API_URL || "http://localhost:3080";
    const apiEndpoint = `${API_URL}/api/agents/chat/openAI`;
    
    console.log('Calling API endpoint:', apiEndpoint);
    
    // Step 1: Call initial API to get stream URL
    const initialResponse = await axios.post(
      apiEndpoint,
      payload,
      {
        headers: {
          "Authorization": "Bearer " + API_TOKEN,
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      }
    );
    
    // Extract streamId from response
    const { streamId, conversationId } = initialResponse.data;
    console.log('Stream ID:', streamId, 'Conversation ID:', conversationId);
    
    // Step 2: Call the stream URL to get actual response
    const streamResponse = await axios.get(
      `${API_URL}/api/agents/chat/stream/${streamId}`,
      {
        headers: {
          "Authorization": "Bearer " + API_TOKEN,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        responseType: 'stream'
      }
    );
    
    // Collect all streaming data
    let fullMessage = "";
    let lastMessageData = null;
    
    // Process the stream
    await new Promise((resolve, reject) => {
      streamResponse.data.on('data', (chunk) => {
        const chunkStr = chunk.toString();

        const lines = chunkStr.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            // Skip [DONE] marker and empty data
            if (data === '[DONE]' || data === '') continue;
            
            try {
              const parsed = JSON.parse(data);
              
              // Accumulate the message text from different possible locations
              if (parsed.responseMessage?.content?.[0]?.text) {
                fullMessage = parsed.responseMessage.content[0].text;
              } else if (parsed.content?.[0]?.text) {
                fullMessage = parsed.content[0].text;
              } else if (parsed.text) {
                fullMessage = parsed.text;
              } else if (parsed.content && typeof parsed.content === 'string') {
                fullMessage = parsed.content;
              } else if (parsed.message) {
                fullMessage = parsed.message;
              }
              
              // Store the last message data
              parentMessageId = parsed.responseMessage?.messageId;
              lastMessageData = parsed;
              
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      });
      
      streamResponse.data.on('end', () => {
        console.log("Stream ended");
        resolve();
      });
      
      streamResponse.data.on('error', (error) => {
        console.error("Stream error:", error);
        reject(error);
      });
    });
    
    // Use the accumulated message or fallback
    const finalMessage = fullMessage 
                      || lastMessageData?.responseMessage?.content?.[0]?.text
                      || lastMessageData?.content?.[0]?.text 
                      || lastMessageData?.text 
                      || lastMessageData?.content 
                      || "No response from AI";
    
    console.log("Final message:", finalMessage);
    // Send the response back to the user
    bot.sendMessage(chatId, finalMessage);
    
    console.log("Response sent successfully:", finalMessage);
    
  } catch (error) {
    console.error("Error calling API:", error.message);
    bot.sendMessage(chatId, "Xin lỗi, đã có lỗi xảy ra khi xử lý tin nhắn của bạn.");
  }
});

console.log("🤖 Telegram Bot started successfully!");
