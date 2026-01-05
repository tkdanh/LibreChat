require("dotenv").config();
const ZaloBot = require("node-zalo-bot");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

// Global ZALOBOT_TOKEN (can be updated via /token command)
let ZALOBOT_TOKEN = process.env.ZALOBOT_TOKEN;
// Global API_TOKEN (can be updated via /api_token command)
let API_TOKEN = process.env.API_TOKEN;

// Validate required environment variables
if (!ZALOBOT_TOKEN) {
  console.error("Error: ZALOBOT_TOKEN is not set in environment variables");
  process.exit(1);
}

if (!API_TOKEN) {
  console.error("Error: API_TOKEN is not set in environment variables");
  process.exit(1);
}

const bot = new ZaloBot(ZALOBOT_TOKEN, {
  polling: true
});

bot.onText(/\/start/, (msg, match) => {
  const menuMessage = `Chào ${msg.from.display_name}! Tôi là chatbot AI.\n\nVui lòng chọn một trong các chức năng sau:`;
  
  // Send message with action buttons
  bot.sendMessage(msg.chat.id, menuMessage, {
    reply_markup: {
      keyboard: [
        [
          { text: "💬 Start chat", callback_data: "start_chat" },
          { text: "ℹ️ Info", callback_data: "info" }
        ],
        [
          { text: "📝 Conversations", callback_data: "conversations" },
          { text: "🚦 Camera TPHCM", callback_data: "camera" }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  });
});

bot.onText(/\/echo (.+)/, (msg, match) => {
  let message = match[1];
  if (message) {
    bot.sendMessage(msg.chat.id, `Bạn vừa nói: ${message}`);
  } else {
    bot.sendMessage(msg.chat.id, "Hãy nhập gì đó sau lệnh /echo");
  }
});

bot.onText(/\/token (.+)/, (msg, match) => {
  const newToken = match[1];
  if (newToken) {
    ZALOBOT_TOKEN = newToken;
    console.log("ZALOBOT_TOKEN updated to:", ZALOBOT_TOKEN);
    bot.sendMessage(msg.chat.id, `✅ ZALOBOT_TOKEN đã được cập nhật thành công!`);
  } else {
    bot.sendMessage(msg.chat.id, "❌ Vui lòng nhập token sau lệnh /token");
  }
});

bot.onText(/\/api_token (.+)/, (msg, match) => {
  const newToken = match[1];
  if (newToken) {
    API_TOKEN = newToken;
    console.log("API_TOKEN updated to:", API_TOKEN);
    bot.sendMessage(msg.chat.id, `✅ API_TOKEN đã được cập nhật thành công!`);
  } else {
    bot.sendMessage(msg.chat.id, "❌ Vui lòng nhập token sau lệnh /api_token");
  }
});

// Handle menu button clicks
bot.onText(/💬 Start chat/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🚀 Bạn đã bắt đầu cuộc trò chuyện mới!\n\nHãy gửi tin nhắn của bạn và tôi sẽ trả lời bằng AI."
  );
});

bot.onText(/info/, (msg) => {
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

Được phát triển với ❤️ bởi LibreChat & Zalo Bot
  `.trim();
  
  bot.sendMessage(msg.chat.id, infoMessage);
});

// Command: /agent - List all AI agents
bot.onText(/\/agent/, async (msg) => {
  try {
    const API_URL = process.env.API_URL || "http://localhost:3080";
    const response = await axios.get(
      `${API_URL}/api/agents?requiredPermission=1`,
      {
        headers: {
          "Authorization": "Bearer " + API_TOKEN,
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      }
    );
    
    // Handle different response structures (array or object with agents property)
    const data = response.data;
    console.log('Agents API response:', JSON.stringify(data).substring(0, 500));
    
    if (Array.isArray(data)) {
      agentsList = data;
    } else if (data && Array.isArray(data.data)) {
      agentsList = data.data;
    } else {
      agentsList = [];
    }
    
    if (agentsList.length === 0) {
      bot.sendMessage(msg.chat.id, "❌ Không có agent nào được tìm thấy.");
      return;
    }
    
    let agentListMessage = "🤖 **Danh sách AI Agents:**\n\n";
    agentsList.forEach((agent, index) => {
      agentListMessage += `${index + 1}. **${agent.name}**\n   ID: \`${agent.id}\`\n`;
      if (agent.description) {
        agentListMessage += `   📝 ${agent.description}\n`;
      }
      agentListMessage += "\n";
    });
    
    agentListMessage += "\n💡 Sử dụng /mode_agent <tên_agent> để chọn agent";
    agentListMessage += "\n💡 Sử dụng /mode_openai để dùng OpenAI mặc định";
    
    bot.sendMessage(msg.chat.id, agentListMessage);
    console.log("Agents list sent:", agentsList.length, "agents");
    
  } catch (error) {
    console.error("Error fetching agents:", error.message);
    bot.sendMessage(msg.chat.id, "❌ Lỗi khi lấy danh sách agents: " + error.message);
  }
});

// Command: /mode_openai - Switch to OpenAI mode
bot.onText(/\/mode_openai/, (msg) => {
  chatMode = 'openai';
  currentAgentId = null;
  currentAgentName = null;
  bot.sendMessage(msg.chat.id, "✅ Đã chuyển sang chế độ **OpenAI** (gpt-4o-mini)\n\n🚀 Bạn có thể bắt đầu chat ngay!");
  console.log("Switched to OpenAI mode");
});

// Command: /mode_agent <agent_name> - Switch to agent mode
bot.onText(/\/mode_agent (.+)/, async (msg, match) => {
  const agentName = match[1].trim();
  
  if (!agentName) {
    bot.sendMessage(msg.chat.id, "❌ Vui lòng nhập tên agent. Ví dụ: /mode_agent Assistant");
    return;
  }
  
  try {
    // If agents list is empty, fetch it first
    if (agentsList.length === 0) {
      const API_URL = process.env.API_URL || "http://localhost:3080";
      const response = await axios.get(
        `${API_URL}/api/agents?requiredPermission=1`,
        {
          headers: {
            "Authorization": "Bearer " + API_TOKEN,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        }
      );
      const data = response.data;
      if (Array.isArray(data)) {
        agentsList = data;
      } else if (data && Array.isArray(data.data)) {
        agentsList = data.data;
      } else {
        agentsList = [];
      }
    }
    
    // Find agent by name (case-insensitive)
    const agent = agentsList.find(a => 
      a.name.toLowerCase() === agentName.toLowerCase() ||
      a.name.toLowerCase().includes(agentName.toLowerCase())
    );
    
    if (!agent) {
      bot.sendMessage(msg.chat.id, `❌ Không tìm thấy agent "${agentName}"\n\n💡 Sử dụng /agent để xem danh sách agents`);
      return;
    }
    
    chatMode = 'agent';
    currentAgentId = agent.id;
    currentAgentName = agent.name;
    
    bot.sendMessage(msg.chat.id, `✅ Đã chuyển sang chế độ **Agent**\n\n🤖 Agent: **${agent.name}**\n🆔 ID: \`${agent.id}\`\n\n🚀 Bạn có thể bắt đầu chat ngay!`);
    console.log("Switched to Agent mode:", agent.name, agent.id);
    
  } catch (error) {
    console.error("Error switching to agent:", error.message);
    bot.sendMessage(msg.chat.id, "❌ Lỗi khi chuyển agent: " + error.message);
  }
});

bot.onText(/📝 Conversations/, (msg) => {
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
  
  bot.sendMessage(msg.chat.id, conversationInfo);
});

let parentMessageId = '8f4b7b31-d904-4de8-ab62-d182d67a5224';

// Chat mode: 'openai' or 'agent'
let chatMode = 'openai';
let currentAgentId = null;
let currentAgentName = null;
let agentsList = []; // Cache agents list

bot.on("message", async (msg) => {
  console.log("Bạn vừa nhận được tin nhắn mới", msg);
  
  try {
    // Extract message text from the received message
    const messageText = msg.text || msg.message;
    
    if (!messageText) {
      console.log("No text found in message");
      return;
    }
    
    // Skip menu button texts and commands
    const menuButtons = ["💬 Start chat", "ℹ️ Info", "📝 Conversations", "🚦 Camera TPHCM"];
    const isCommand = messageText.startsWith("/");
    const isMenuButton = menuButtons.includes(messageText.trim());
    
    if (isCommand || isMenuButton) {
      console.log("Skipping command or menu button");
      return;
    }
    
    // Get API URL from environment variable, default to localhost for local development
    const API_URL = process.env.API_URL || "http://localhost:3080";
    
    // Prepare API request payload based on current mode
    let payload;
    let apiEndpoint;
    
    if (chatMode === 'agent' && currentAgentId) {
      // Agent mode payload
      payload = {
        text: messageText,
        sender: "User",
        clientTimestamp: new Date().toISOString(),
        isCreatedByUser: true,
        parentMessageId: parentMessageId,
        conversationId: "b248287c-6ac5-4892-8609-eb112dbb5bb7",
        messageId: uuidv4(),
        error: false,
        endpoint: "agents",
        agent_id: currentAgentId,
        files: [],
        key: new Date().toISOString(),
        isTemporary: false,
        isRegenerate: false,
        isContinued: false,
        ephemeralAgent: {
          execute_code: false,
          web_search: false,
          file_search: false,
          artifacts: false,
          mcp: []
        }
      };
      apiEndpoint = `${API_URL}/api/agents/chat/agents`;
      console.log('Using Agent mode with agent:', currentAgentName, currentAgentId);
    } else {
      // OpenAI mode payload (default)
      payload = {
        text: messageText,
        sender: "User",
        clientTimestamp: new Date().toISOString(),
        isCreatedByUser: true,
        parentMessageId: parentMessageId,
        conversationId: "b248287c-6ac5-4892-8609-eb112dbb5bb7",
        messageId: uuidv4(),
        error: false,
        endpoint: "openAI",
        model: "gpt-4o-mini",
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
      apiEndpoint = `${API_URL}/api/agents/chat/openAI`;
      console.log('Using OpenAI mode');
    }

    console.log('API_TOKEN', API_TOKEN);
    
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
              
              // Extract text from responseMessage.content array (new format)
              // Structure: responseMessage.content[{type: "text", text: "..."}]
              if (parsed.responseMessage?.content && Array.isArray(parsed.responseMessage.content)) {
                const textContent = parsed.responseMessage.content
                  .filter(item => item.type === 'text' && item.text)
                  .map(item => item.text)
                  .join('');
                if (textContent) {
                  fullMessage = textContent;
                }
              }
              // Fallback: check responseMessage.text (if not empty)
              else if (parsed.responseMessage?.text && parsed.responseMessage.text.trim() !== '') {
                fullMessage = parsed.responseMessage.text;
              }
              // Check top-level content array
              else if (parsed.content && Array.isArray(parsed.content)) {
                const textContent = parsed.content
                  .filter(item => item.type === 'text' && item.text)
                  .map(item => item.text)
                  .join('');
                if (textContent) {
                  fullMessage = textContent;
                }
              }
              // Check top-level text field
              else if (parsed.text && typeof parsed.text === 'string' && parsed.text.trim() !== '') {
                fullMessage = parsed.text;
              }
              // Check string content
              else if (parsed.content && typeof parsed.content === 'string') {
                fullMessage = parsed.content;
              }
              // Check message field
              else if (parsed.message && typeof parsed.message === 'string') {
                fullMessage = parsed.message;
              }
              
              // Store the last message data and update parentMessageId
              if (parsed.responseMessage?.messageId) {
                parentMessageId = parsed.responseMessage.messageId;
              } else if (parsed.messageId) {
                parentMessageId = parsed.messageId;
              }
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
    
    // Use the accumulated message or extract from lastMessageData
    let finalMessage = fullMessage;
    
    // If fullMessage is empty, try to extract from lastMessageData
    if (!finalMessage && lastMessageData) {
      // Try responseMessage.content array (new format)
      if (lastMessageData.responseMessage?.content && Array.isArray(lastMessageData.responseMessage.content)) {
        const textContent = lastMessageData.responseMessage.content
          .filter(item => item.type === 'text' && item.text)
          .map(item => item.text)
          .join('');
        if (textContent) {
          finalMessage = textContent;
        }
      }
      // Try responseMessage.text
      if (!finalMessage && lastMessageData.responseMessage?.text) {
        finalMessage = lastMessageData.responseMessage.text;
      }
      // Try top-level content array
      if (!finalMessage && lastMessageData.content && Array.isArray(lastMessageData.content)) {
        const textContent = lastMessageData.content
          .filter(item => item.type === 'text' && item.text)
          .map(item => item.text)
          .join('');
        if (textContent) {
          finalMessage = textContent;
        }
      }
      // Try top-level text
      if (!finalMessage && lastMessageData.text) {
        finalMessage = lastMessageData.text;
      }
    }
    
    // Ensure finalMessage is a non-empty string
    if (!finalMessage || typeof finalMessage !== 'string' || finalMessage.trim() === '') {
      finalMessage = "⚠️ Không nhận được phản hồi từ AI. Vui lòng thử lại.";
      console.log("Warning: Empty response from AI, using fallback message");
    }
    
    console.log("Final message:", finalMessage);
    // Send the response back to the bot
    bot.sendMessage(msg.chat.id, finalMessage);
    
    console.log("Response sent successfully");
    
  } catch (error) {
    console.error("Error calling API:", error.message);
    bot.sendMessage(msg.chat.id, "Xin lỗi, đã có lỗi xảy ra khi xử lý tin nhắn của bạn.");
  }
});

console.log("🤖 Bot started successfully!");