// Import required libraries
const { Client, Events, GatewayIntentBits } = require("discord.js");
require("dotenv").config(); // Loads environment variables from .env file
const Groq = require("groq-sdk");

// Create a Discord client with necessary intents to read messages
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // For guild-related events
        GatewayIntentBits.GuildMessages, // For message events in guilds
        GatewayIntentBits.MessageContent, // To read message content
    ],
});

// Initialize Groq API client with your API key from .env
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Helper function to split long messages into chunks (Discord max: 2000 chars)
function splitmessage(text, maxLength = 2000) {
    let chunk = [];
    for (let i = 0; i < text.length; i += maxLength) {
        chunk.push(text.slice(i, i + maxLength));
    }
    return chunk;
}

// Listen for new messages in Discord
client.on(Events.MessageCreate, async (msg) => {
    // Ignore messages sent by bots (including itself)
    if (msg.author.bot || msg.content.startsWith("create")) return;

    // Check if message starts with "ask"
    if (msg.content.startsWith("ask")) {
        // Extract the question after "ask"
        const question = msg.content.split("ask")[1];

        // If no question is provided, ask user to include one
        if (!question)
            return msg.reply("❓ Please include a question after 'ask'.");

        // Let user know bot is processing
        await msg.reply("Thinking...");

        try {
            // Send the question to Groq API for completion
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: question },
                ],
                model: "llama-3.1-8b-instant", // Model to use
                temperature: 1, // Controls randomness
                max_completion_tokens: 1024, // Max tokens in response
                top_p: 1, // Nucleus sampling
                stream: true, // Stream response
                stop: null, // No stop sequence
            });

            // Collect streamed response from Groq
            let reply = "";
            for await (const chunku of completion) {
                reply += chunku.choices[0]?.delta?.content || "";
            }

            // Split response into chunks if too long for Discord
            const chunks = splitmessage(reply);

            // Send each chunk as a separate message
            for (chunk of chunks) {
                await msg.reply(chunk || "No response");
            }
        } catch (error) {
            // If error occurs, log it and notify user
            console.log(error);
            await msg.reply("Error contacting Groq API");
        }
    } else {
        // If message doesn't start with "ask", reply with a greeting
        msg.reply("Hello👋!! I am GPTrix....Ask me anything ,and I will answer it...");
    }
});

// Log in to Discord using bot token from .env
client.login(process.env.DISCORD_TOKEN);

// When bot is ready, log its username
client.on(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}`);
});
