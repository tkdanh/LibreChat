require("dotenv").config();
const ZaloBot = require("node-zalo-bot");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

// Validate required environment variables
if (!process.env.ZALOBOT_TOKEN) {
  console.error("Error: ZALOBOT_TOKEN is not set in environment variables");
  process.exit(1);
}

if (!process.env.API_TOKEN) {
  console.error("Error: API_TOKEN is not set in environment variables");
  process.exit(1);
}

const bot = new ZaloBot(process.env.ZALOBOT_TOKEN, {
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
    
    // Prepare API request payload
    const payload = {
      text: messageText,
      sender: "User",
      clientTimestamp: new Date().toISOString(),
      isCreatedByUser: true,
      parentMessageId: parentMessageId,
      conversationId: "b248287c-6ac5-4892-8609-eb112dbb5bb7", //msg.chat.id.toString(), // Use chat ID as conversation ID
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

    console.log('process.env.API_TOKEN', process.env.API_TOKEN);
    
    // Get API URL from environment variable, default to localhost for local development
    const API_URL = process.env.API_URL || "http://localhost:3080";
    const apiEndpoint = `${API_URL}/api/agents/chat/openAI`;
    
    console.log('Calling API endpoint:', apiEndpoint);
    
    // Call the API with streaming response
    const response = await axios.post(
      apiEndpoint,
      payload,
      {
        headers: {
          "Authorization": "Bearer " + process.env.API_TOKEN,
          "Content-Type": "application/json",
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
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            // Skip [DONE] marker and empty data
            if (data === '[DONE]' || data === '') continue;
            
            try {
              const parsed = JSON.parse(data);
              console.log("Stream chunk:", parsed);
              
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
              console.log("Skipping non-JSON line:", data.substring(0, 50));
            }
          }
        }
      });
      
      response.data.on('end', () => {
        console.log("Stream ended");
        resolve();
      });
      
      response.data.on('error', (error) => {
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
    // Send the response back to the bot
    bot.sendMessage(msg.chat.id, finalMessage);
    
    console.log("Response sent successfully:", finalMessage);
    
  } catch (error) {
    console.error("Error calling API:", error.message);
    bot.sendMessage(msg.chat.id, "Xin lỗi, đã có lỗi xảy ra khi xử lý tin nhắn của bạn.");
  }
});

console.log("🤖 Bot started successfully!");