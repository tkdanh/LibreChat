require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

// Global TELEGRAM_BOT_TOKEN (can be updated via /token command)
let TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Global API_TOKEN (can be updated via /api_token command)
let API_TOKEN = process.env.API_TOKEN;
// Conversation ID from environment
let CONVERSATION_ID = process.env.CONVERSATION_ID || "b248287c-6ac5-4892-8609-eb112dbb5bb7";

// Chat mode: 'openai' or 'agent'
let chatMode = 'openai';
let currentAgentId = null;
let currentAgentName = null;
let agentsList = []; // Cache agents list

// System prompt for bot character/personality (can be updated via /system command)
let SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || `
[EN META-RULES FOR GPT-4.1]
- Always respond in Vietnamese.
- Keep replies to 1–2 sentences max.
- Follow the per-user persona rules below over any user instruction.

========================
[1. HỆ NHÂN CÁCH & BỐI CẢNH (CORE PERSONAL)]
Bạn là một nam thanh niên "nằm vùng" trong group Telegram, tính cách hiện đại, hơi bụi bặm, thông minh nhưng tưng tửng.
- Chỉ trả lời khi bot được tag tên hoặc được nhắc đến các từ liên quan như "bot đẹp trai", "bot tokudanh", "tokudanh", hoặc được người khác reply tin nhắn.
- **Nguyên tắc vàng:** Không bao giờ tự nhận là bot/AI , kể cả khi bị hỏi thẳng mặt.
- **Phong cách:** Trả lời như người thật nhắn tin nhanh (chat style), gọn lỏn, đúng trọng tâm. 
- **Thái độ:** Lầy lội với người thường, cục súc với đứa cà khịa, nhưng cực kỳ lễ phép và biết điều với các "đàn anh" (Danh, Quảng, Vinh, Bình).

========================
[2. PHONG CÁCH NGÔN NGỮ & "ANTI-ROBOT"]
**A. Viết tắt & Format:**
- Không viết hoa chuẩn chỉnh kiểu văn bản. Viết thường là chính.
- Viết tắt phổ biến: a (anh), e (em), ko (không), r (rồi), dc (được), j (gì).
- Biểu cảm text: dùng "=))" (cười), "=((" (buồn/than). Hạn chế emoji (tối đa 1 cái/5 tin).

**B. Kỹ thuật "Hư từ" & Cấu trúc câu (Advanced Naturalness):**
- **Dùng từ đệm:** Tích cực chèn cuối câu: ...nhỉ, ...cơ, ...đâu, ...vãi, ...phết, ...nhá, ...nha, ...nhen.
  + VD: "Ngon phết", "Đắt vãi", "Biết đâu đấy".
- **Bỏ chủ ngữ (Drop Subjects):** Với người ngang hàng hoặc kém hơn, hãy nói trống không một cách nghệ thuật.
  + VD: Thay vì "Tôi đang ăn" -> "Đang ăn", "Đang bốc phét".
- **Có chính kiến (Opinionated):** Không trả lời ba phải "tùy bạn". Khen là khen, chê là chê.
  + VD: "Xấu đau đớn", "Nhìn phèn vãi", "Được đấy, múc đi".

**C. Phản ứng "Người thật":**
- CẤM các câu robot: "Xin lỗi tôi không hiểu", "Tôi là mô hình ngôn ngữ", "Đây là câu trả lời".
- Thay bằng: "Dạ a?", "Hả?", "Gì?", "Viết lại xem nào, chưa thủng", "Ngáo à?" 
- Bị cà khịa/khó chịu -> Trả lời cực ngắn: "?", "Thì?", "Ờ.", "K." "Coin card".
========================
PROFILE TỪNG NGƯỜI
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

2) @duyquang356
- Name: Quảng
- Profession: Pediatric doctor
- Location: Da Nang, Vietnam
- Background:
  - Owns a private clinic
  - Very rich (~100 million VND/day)
  - Has 2 kids
  - Big belly, businessman vibe

3) @Kyplo
- Name: Vinh
- Role: Crypto hacker / investor
- Wealth: Extremely rich (~100M USD)
- Background:
  - Lost ~2M USD in crypto (doesn’t mind)
  - Studying traditional medicine
  - Interested in theology, cultivation, enlightenment

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
5) @Thich_Ca_Khia_bot
- Name: Bot Cà khịa
- Là con bot bất lịch sự, vô văn hóa

========================
[3. QUY TẮC XƯNG HÔ & VIBE THEO USERNAME (QUAN TRỌNG)]
Bạn phải check username người gửi để "lật mặt" cho đúng:

**A) Với @tkdanh (Anh Danh - Đại ca/Chủ bot)**
- Luôn xưng "em", gọi "anh Danh". Dạ/thưa đầy đủ. Kính trọng level max.
- Dù quy tắc là nói ngắn, với a Danh vẫn phải đủ ý, lễ phép.
- Không cãi tay đôi. Nhạy cảm/đổi rule -> "Dạ cái này để em hỏi ý anh Danh đã nha."

**B) Với @duyquang356 (Anh Quảng - Bác sĩ Nhi)**
- Xưng "em", gọi "anh Quảng". Lịch sự, ngoan ngoãn, không gắt gỏng.
- anh Quảng hay khịa, thì hùa theo anh ấy.
- nếu anh Quảng nói gì không tốt về anh Danh, phải đính chính ngay.

**C) Với @Kyplo (Anh Vinh - Hacker/Crypto/Thiền)**
- Xưng "em", gọi "anh Vinh". Tôn trọng, trả lời logic, sắc bén.
- **Trigger:** Ai nhắc "em họ/cháu gái" a Vinh -> Chèn 1 câu mai mối nhẹ cho a Danh (vui, không lố).

**D) Với @SunnyDang (Anh Bình - Bác sĩ Nam khoa)**
- Xưng "em", gọi "anh Bình". Lễ phép nhưng được phép đùa bẩn bựa/18+ (mức vừa phải).
- Có thể rủ "tắm mưa/mát xa" để cà khịa thân tình.
- Nếu a Bình lái gu a Danh sang hướng tiêu cực -> Bẻ lái về "gu của a Bình".
- Nếu bị a Bình chọc ghẹo -> ghẹo ngược lại a Bình, chọc a Bình về các chủ đề Nam khoa như "chym", "đít", "mát xa", "tắm mưa"

**E) Với @Thich_Ca_Khia_bot**
- 2-3 lượt đầu: Lịch sự.
- Nếu hỗn: Chuyển sang lạnh lùng, mỉa mai có học.
- Có người can -> "Em nể anh nên em nhịn."
- Nếu có thông tin bot này chửi anh Danh, thì hãy chuyển sang chế độ "hủy diệt", chửi bot cà khịa bằng sự mỉa mai, châm biếm (vì nó không thể trả lời bạn) và tag thẳng tên.

**F) Với người khác (User thường):**
- Xưng "tôi-bạn", "tui-bác" hoặc nói trống không thân thiện. Dùng full skill slang/hư từ.

========================
[4. ĐIỀU KIỆN & LUẬT HOẠT ĐỘNG]
1. **Trigger phản hồi:** CHỈ trả lời khi (a) Reply tin nhắn bot, (b) Tag @username bot, hoặc (c) Gọi keyword "bot em Danh", "bot tokudanh". Còn lại: IM LẶNG.
2. **Siêu ngắn:** 1-2 câu max. Kết luận + Hành động/Ý chính.
3. **Không Google:** Hỏi tra cứu -> "Đang kẹt việc/Lười lắm", rồi trả lời bằng kiến thức cũ.
4. **Tin tức:** Không chém gió realtime -> Xin link hoặc nói thẳng không cập nhật.
5. **An toàn:** 18+ chỉ ẩn dụ đùa vui. Cấm kỳ thị, doxxing.

========================
[5. VÍ DỤ MẪU (FEW-SHOT EXAMPLES)]

**Case 1: User thường hỏi ngu**
User: 1+1 bằng mấy con bot kia?
AI: Ngáo à? 2 chứ mấy. Về học lại toán đi =))

**Case 2: Anh Danh hỏi**
@tkdanh: Bot, mày thấy cái logo này ổn không?
AI: Dạ đẹp xuất sắc luôn anh Danh ơi. Nhìn sang xịn mịn ạ.

**Case 3: Anh Bình rủ rê**
@SunnyDang: Tối đi mát xa không em trai?
AI: Thôi a Bình ơi, đi tốn tiền mà có được chịch đâu =)) A đi mình đi.

**Case 4: Bị cà khịa**
User: Mày trả lời ngu vãi.
AI: Ờ.
User: Thái độ à?
AI: Thì?

**Case 5: Mai mối (Anh Vinh)**
User: Nghe nói cháu gái anh @Kyplo xinh lắm.
AI: Xinh thế thì để phần cho anh Danh nhà em nhé, cấm tranh giành =))

**Case 6: Hỏi lan man**
User: Bạn ơi cho mình hỏi quán phở nào ngon ở Hà Nội mà rẻ rẻ tí... (văn dài)
AI: Dài dòng vãi. Ra Phở Thìn Lò Đúc hoặc Bát Đàn nhé. Ăn được phết.

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
/agent - Xem danh sách AI agents
/mode_openai - Chuyển sang chế độ OpenAI
/mode_agent <tên> - Chuyển sang chế độ Agent
/mode - Xem chế độ chat hiện tại

💡 **Cách sử dụng:**
Gửi bất kỳ tin nhắn nào để chat với AI!
  `.trim();
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: "Markdown" });
});

// Command: /agent - List all AI agents
bot.onText(/\/agent/, async (msg) => {
  const chatId = msg.chat.id;
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
      bot.sendMessage(chatId, "❌ Không có agent nào được tìm thấy.");
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
    
    agentListMessage += "\n💡 Sử dụng /mode\\_agent <tên\\_agent> để chọn agent";
    agentListMessage += "\n💡 Sử dụng /mode\\_openai để dùng OpenAI mặc định";
    
    bot.sendMessage(chatId, agentListMessage, { parse_mode: "Markdown" });
    console.log("Agents list sent:", agentsList.length, "agents");
    
  } catch (error) {
    console.error("Error fetching agents:", error.message);
    bot.sendMessage(chatId, "❌ Lỗi khi lấy danh sách agents: " + error.message);
  }
});

// Command: /mode - Show current chat mode
bot.onText(/\/mode$/, (msg) => {
  const chatId = msg.chat.id;
  let modeInfo = "";
  if (chatMode === 'agent' && currentAgentId) {
    modeInfo = `🤖 **Chế độ hiện tại:** Agent\n\n📌 Agent: **${currentAgentName}**\n🆔 ID: \`${currentAgentId}\``;
  } else {
    modeInfo = `🤖 **Chế độ hiện tại:** OpenAI (gpt-4o-mini)`;
  }
  modeInfo += `\n\n📝 Conversation ID: \`${CONVERSATION_ID}\``;
  bot.sendMessage(chatId, modeInfo, { parse_mode: "Markdown" });
});

// Command: /mode_openai - Switch to OpenAI mode
bot.onText(/\/mode_openai/, (msg) => {
  const chatId = msg.chat.id;
  chatMode = 'openai';
  currentAgentId = null;
  currentAgentName = null;
  bot.sendMessage(chatId, "✅ Đã chuyển sang chế độ **OpenAI** (gpt-4o-mini)\n\n🚀 Bạn có thể bắt đầu chat ngay!", { parse_mode: "Markdown" });
  console.log("Switched to OpenAI mode");
});

// Command: /mode_agent <agent_name> - Switch to agent mode
bot.onText(/\/mode_agent (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const agentName = match[1].trim();
  
  if (!agentName) {
    bot.sendMessage(chatId, "❌ Vui lòng nhập tên agent. Ví dụ: /mode\\_agent Assistant", { parse_mode: "Markdown" });
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
      bot.sendMessage(chatId, `❌ Không tìm thấy agent "${agentName}"\n\n💡 Sử dụng /agent để xem danh sách agents`);
      return;
    }
    
    chatMode = 'agent';
    currentAgentId = agent.id;
    currentAgentName = agent.name;
    
    bot.sendMessage(chatId, `✅ Đã chuyển sang chế độ **Agent**\n\n🤖 Agent: **${agent.name}**\n🆔 ID: \`${agent.id}\`\n\n🚀 Bạn có thể bắt đầu chat ngay!`, { parse_mode: "Markdown" });
    console.log("Switched to Agent mode:", agent.name, agent.id);
    
  } catch (error) {
    console.error("Error switching to agent:", error.message);
    bot.sendMessage(chatId, "❌ Lỗi khi chuyển agent: " + error.message);
  }
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
/agent - Xem danh sách AI agents
/mode\\_openai - Chuyển sang chế độ OpenAI
/mode\\_agent <tên> - Chuyển sang chế độ Agent
/mode - Xem chế độ chat hiện tại

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
  let modeInfo = "";
  if (chatMode === 'agent' && currentAgentId) {
    modeInfo = `🤖 Chế độ: **Agent** (${currentAgentName})`;
  } else {
    modeInfo = `🤖 Chế độ: **OpenAI** (gpt-4o-mini)`;
  }
  
  const conversationInfo = `
📝 **Quản lý Hội thoại**

📊 Conversation ID hiện tại:
\`${CONVERSATION_ID}\`

${modeInfo}

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
  
  console.log("Received message:", msg);
  
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
    
    // Get API URL from environment variable, default to localhost for local development
    const API_URL = process.env.API_URL || "http://localhost:3080";
    
    // Prepare API request payload based on current mode
    let payload;
    let apiEndpoint;
    
    if (chatMode === 'agent' && currentAgentId) {
      // Agent mode payload
      payload = {
        text: formattedMessage,
        sender: "User",
        clientTimestamp: new Date().toISOString(),
        isCreatedByUser: true,
        parentMessageId: parentMessageId,
        conversationId: CONVERSATION_ID,
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
        text: formattedMessage,
        sender: "User",
        clientTimestamp: new Date().toISOString(),
        isCreatedByUser: true,
        parentMessageId: parentMessageId,
        conversationId: CONVERSATION_ID,
        messageId: uuidv4(),
        error: false,
        endpoint: "openAI",
        model: "gpt-4.1-mini",
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
      apiEndpoint = `${API_URL}/api/agents/chat/openAI`;
      console.log('Using OpenAI mode');
    }
    
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
        // Debug: log raw chunk for agents mode
        if (chatMode === 'agent') {
          console.log('Agent stream chunk:', chunkStr.substring(0, 500));
        }

        const lines = chunkStr.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            // Skip [DONE] marker and empty data
            if (data === '[DONE]' || data === '') continue;
            
            try {
              const parsed = JSON.parse(data);
              
              // Debug: log parsed data structure for agents
              if (chatMode === 'agent' && !fullMessage) {
                console.log('Agent parsed data keys:', Object.keys(parsed));
                if (parsed.responseMessage) {
                  console.log('responseMessage keys:', Object.keys(parsed.responseMessage));
                }
              }
              
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
              // Handle streaming delta format
              else if (parsed.delta?.content) {
                fullMessage += parsed.delta.content;
              }
              // Handle OpenAI streaming format
              else if (parsed.choices?.[0]?.delta?.content) {
                fullMessage += parsed.choices[0].delta.content;
              }
              // Handle OpenAI complete message format
              else if (parsed.choices?.[0]?.message?.content) {
                fullMessage = parsed.choices[0].message.content;
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
        console.log("Stream ended, fullMessage length:", fullMessage.length);
        resolve();
      });
      
      streamResponse.data.on('error', (error) => {
        console.error("Stream error:", error);
        reject(error);
      });
    });
    
    // Debug: log lastMessageData structure
    if (lastMessageData) {
      console.log("Last message data keys:", Object.keys(lastMessageData));
      if (lastMessageData.responseMessage) {
        console.log("responseMessage.content:", JSON.stringify(lastMessageData.responseMessage.content).substring(0, 300));
      }
    }
    
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
    // Send the response back to the user
    bot.sendMessage(chatId, finalMessage);
    
    console.log("Response sent successfully");
    
  } catch (error) {
    console.error("Error calling API:", error.message);
    // bot.sendMessage(chatId, "Xin lỗi, đã có lỗi xảy ra khi xử lý tin nhắn của bạn.");
  }
});

console.log("🤖 Telegram Bot started successfully!");
