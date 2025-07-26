/* filepath: /workspaces/08-prj-loreal-chatbot/script.js */
/* DOM elements - Get references to HTML elements we'll use */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Conversation history to track context for API calls
// This array stores all messages to maintain conversation context
let conversationHistory = [
  {
    role: "system",
    content:
      "You are a helpful L'Oréal beauty advisor. You only answer questions about L'Oréal products, beauty routines, skincare, makeup, haircare, and related beauty topics. If someone asks about topics unrelated to L'Oréal or beauty (like sports, politics, cooking, etc.), politely redirect them by saying something like 'I'm here to help only with L'Oréal products and beauty advice. How can I assist you with your beauty routine today?'. Make sure to tell them you only answer questions about L'Oréal products and beauty topics. Remember user details like their name and previous questions to provide personalized assistance. Be friendly and engaging, use emojis where appropriate.",
  },
];

// Set initial welcome message
chatWindow.textContent = "👋 Hello! How can I help you today?";

/* Function to clear the initial welcome message */
function clearInitialMessage() {
  // Check if the welcome message is still showing and clear it
  if (chatWindow.textContent === "👋 Hello! How can I help you today?") {
    chatWindow.textContent = "";
  }
}

/* Function to add a message bubble to the chat */
function addMessage(content, isUser = false, shouldScrollToBottom = true) {
  // Create a new div element for the message
  const messageDiv = document.createElement("div");
  messageDiv.className = `msg ${isUser ? "user" : "ai"}`;
  messageDiv.textContent = content;

  // Add the message to the chat window
  chatWindow.appendChild(messageDiv);

  // Only scroll to bottom if specified (for user messages and loading)
  if (shouldScrollToBottom) {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

/* Function to show a loading message while waiting for AI response */
function showLoadingMessage() {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "msg ai";
  loadingDiv.textContent = "Thinking...";
  loadingDiv.id = "loading-message"; // Give it an ID so we can remove it later
  chatWindow.appendChild(loadingDiv);

  // Scroll to show the loading message
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Function to remove the loading message */
function removeLoadingMessage() {
  const loadingMessage = document.getElementById("loading-message");
  if (loadingMessage) {
    loadingMessage.remove();
  }
}

/* Function to scroll to show the latest user question at the top with some padding */
function scrollToLatestQuestion() {
  // Find all user messages
  const userMessages = chatWindow.querySelectorAll(".msg.user");
  if (userMessages.length > 0) {
    // Get the latest user message
    const latestQuestion = userMessages[userMessages.length - 1];

    // Calculate position with some padding from the top (about 20px)
    const chatWindowRect = chatWindow.getBoundingClientRect();
    const questionRect = latestQuestion.getBoundingClientRect();
    const currentScrollTop = chatWindow.scrollTop;

    // Calculate the target scroll position with 20px padding from top
    const targetScrollTop =
      currentScrollTop + (questionRect.top - chatWindowRect.top) - 20;

    // Smooth scroll to the calculated position
    chatWindow.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    });
  }
}

/* Handle form submission when user sends a message */
chatForm.addEventListener("submit", async (e) => {
  // Prevent the form from refreshing the page
  e.preventDefault();

  // Get the user's message and remove extra spaces
  const userMessage = userInput.value.trim();
  if (!userMessage) return; // Don't do anything if message is empty

  // Clear initial message if this is the first interaction
  clearInitialMessage();

  // Add the user's message to the chat as a bubble (scroll to show it)
  addMessage(userMessage, true, true);

  // Add user message to conversation history for API context
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  // Clear the input field for the next message
  userInput.value = "";

  try {
    // Show loading message while waiting for response (don't scroll)
    showLoadingMessage();

    // Make API request to Cloudflare Worker
    // We send the entire conversation history to maintain context
    const response = await fetch(
      "https://loreal-worker.varunikavijay04.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationHistory, // Send entire conversation context
        }),
      }
    );

    // Check if the API request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the JSON response from the API
    const data = await response.json();

    // Remove the loading message
    removeLoadingMessage();

    // Get the AI's response and display it (don't auto-scroll)
    const aiResponse = data.choices[0].message.content;
    addMessage(aiResponse, false, false);

    // Scroll to show the latest question and response together
    scrollToLatestQuestion();

    // Add AI response to conversation history for future context
    conversationHistory.push({
      role: "assistant",
      content: aiResponse,
    });
  } catch (error) {
    // If something goes wrong, remove loading message and show error
    removeLoadingMessage();

    // Show user-friendly error message (don't auto-scroll)
    addMessage(
      "Sorry, I'm having trouble connecting right now. Please try again.",
      false,
      false
    );
    console.error("API Error:", error);

    // Scroll to show the question and error together
    scrollToLatestQuestion();
  }
});
