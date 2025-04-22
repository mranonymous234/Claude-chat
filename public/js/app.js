/**
 * FireChat - Real-time Chat Application
 * A modern chat application built with Firebase
 */

// Firebase Configuration - Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// DOM Elements
const authSection = document.getElementById('auth-section');
const chatSection = document.getElementById('chat-section');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');
const currentUserName = document.getElementById('current-user-name');
const newChatBtn = document.getElementById('new-chat-btn');
const newChatModal = document.getElementById('new-chat-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const conversationList = document.getElementById('conversation-list');
const noChatSelected = document.getElementById('no-chat-selected');
const chatContainer = document.getElementById('chat-container');
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const chatTitle = document.getElementById('chat-title');
const chatParticipantsCount = document.getElementById('chat-participants-count');
const newChatForm = document.getElementById('new-chat-form');
const chatNameInput = document.getElementById('chat-name');
const userSearchInput = document.getElementById('user-search');
const userSearchResults = document.getElementById('user-search-results');
const selectedUsersContainer = document.getElementById('selected-users');
const loadingOverlay = document.getElementById('loading-overlay');

// App State
const state = {
  currentUser: null,
  currentChat: null,
  selectedUsers: [],
  allUsers: [],
  conversations: [],
  messages: [],
  lastMessageRef: null,
  unsubscribeListeners: [],
};

// Helper functions
function showLoading() {
  loadingOverlay.classList.remove('hidden');
  setTimeout(() => {
    loadingOverlay.classList.add('visible');
  }, 10);
}

function hideLoading() {
  loadingOverlay.classList.remove('visible');
  setTimeout(() => {
    loadingOverlay.classList.add('hidden');
  }, 300);
}

function showError(message) {
  console.error(message);
  // TODO: Implement a proper error notification system
  alert(message);
}

function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString();
  }
}

// Authentication
function setupAuthListeners() {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      // User is signed in
      state.currentUser = user;
      onUserSignedIn(user);
    } else {
      // User is signed out
      state.currentUser = null;
      onUserSignedOut();
    }
  });
}

function onUserSignedIn(user) {
  showLoading();
  
  // Update user profile in the database if needed
  updateUserInDatabase(user)
    .then(() => {
      // Set user display name
      currentUserName.textContent = user.displayName || 'User';
      
      // Hide auth section and show chat section
      authSection.classList.add('hidden');
      chatSection.classList.remove('hidden');
      
      // Load conversations
      loadConversations();
      
      // Set user online
      setUserOnlineStatus(true);
      
      hideLoading();
    })
    .catch(error => {
      showError(`Error updating user: ${error.message}`);
      hideLoading();
    });
}

function onUserSignedOut() {
  // Set user offline
  if (state.currentUser) {
    setUserOnlineStatus(false);
  }
  
  // Unsubscribe from all listeners
  state.unsubscribeListeners.forEach(unsubscribe => unsubscribe());
  state.unsubscribeListeners = [];
  
  // Reset state
  state.currentChat = null;
  state.conversations = [];
  state.messages = [];
  state.selectedUsers = [];
  
  // Clear UI
  conversationList.innerHTML = '';
  messagesContainer.innerHTML = '';
  chatTitle.textContent = 'Chat Title';
  chatParticipantsCount.textContent = '0';
  
  // Show auth section and hide chat section
  chatSection.classList.add('hidden');
  authSection.classList.remove('hidden');
  noChatSelected.classList.remove('hidden');
  chatContainer.classList.add('hidden');
}

function updateUserInDatabase(user) {
  const userRef = firebase.database().ref(`users/${user.uid}`);
  return userRef.update({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    photoURL: user.photoURL || null,
    lastActive: firebase.database.ServerValue.TIMESTAMP
  });
}

function setUserOnlineStatus(status) {
  if (!state.currentUser) return;
  
  const userStatusRef = firebase.database().ref(`users/${state.currentUser.uid}/status`);
  const userLastActiveRef = firebase.database().ref(`users/${state.currentUser.uid}/lastActive`);
  
  // When app closes or user navigates away
  window.addEventListener('beforeunload', () => {
    if (state.currentUser) {
      userStatusRef.set('offline');
      userLastActiveRef.set(firebase.database.ServerValue.TIMESTAMP);
    }
  });
  
  userStatusRef.set(status ? 'online' : 'offline');
  userLastActiveRef.set(firebase.database.ServerValue.TIMESTAMP);
}

// Auth Form Handling
function setupAuthForms() {
  // Show signup form
  showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
  });
  
  // Show login form
  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });
  
  // Handle login form submission
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }
    
    showLoading();
    
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(() => {
        loginForm.reset();
      })
      .catch(error => {
        hideLoading();
        showError(`Login failed: ${error.message}`);
      });
  });
  
  // Handle signup form submission
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    if (!name || !email || !password) {
      showError('Please fill out all fields');
      return;
    }
    
    showLoading();
    
    firebase.auth().createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        // Update profile with display name
        return userCredential.user.updateProfile({
          displayName: name
        });
      })
      .then(() => {
        signupForm.reset();
      })
      .catch(error => {
        hideLoading();
        showError(`Signup failed: ${error.message}`);
      });
  });
  
  // Handle logout
  logoutBtn.addEventListener('click', () => {
    firebase.auth().signOut()
      .catch(error => {
        showError(`Logout failed: ${error.message}`);
      });
  });
}

// Load conversations
function loadConversations() {
  if (!state.currentUser) return;
  
  // Clear previous listeners
  if (state.unsubscribeListeners.length > 0) {
    state.unsubscribeListeners.forEach(unsubscribe => unsubscribe());
    state.unsubscribeListeners = [];
  }
  
  const userConversationsRef = firebase.database().ref('userConversations')
    .orderByChild(`${state.currentUser.uid}/timestamp`)
    .limitToLast(20);
  
  const unsubscribe = userConversationsRef.on('value', snapshot => {
    if (!snapshot.exists()) {
      conversationList.innerHTML = `
        <div class="empty-state" style="padding: 20px; text-align: center;">
          <i class="fas fa-comments" style="font-size: 32px; color: var(--light-gray);"></i>
          <p style="margin-top: 10px;">No conversations yet</p>
          <p style="font-size: 14px; color: var(--gray-color);">Start a new chat to get going!</p>
        </div>
      `;
      return;
    }
    
    const conversations = [];
    const promises = [];
    
    snapshot.forEach(childSnapshot => {
      const conversationId = childSnapshot.key;
      
      if (childSnapshot.child(state.currentUser.uid).exists()) {
        const promise = firebase.database().ref(`conversations/${conversationId}`).once('value')
          .then(convSnapshot => {
            if (convSnapshot.exists()) {
              const conversationData = convSnapshot.val();
              
              // Only add conversations this user is a part of
              if (conversationData.participants && 
                  conversationData.participants[state.currentUser.uid]) {
                conversations.push({
                  id: conversationId,
                  ...conversationData,
                  lastMessage: conversationData.lastMessage || null,
                  timestamp: conversationData.updatedAt || 0
                });
              }
            }
          });
        
        promises.push(promise);
      }
    });
    
    Promise.all(promises)
      .then(() => {
        // Sort conversations by timestamp in descending order
        conversations.sort((a, b) => b.timestamp - a.timestamp);
        
        state.conversations = conversations;
        renderConversationList();
      })
      .catch(error => {
        showError(`Error loading conversations: ${error.message}`);
      });
  });
  
  state.unsubscribeListeners.push(() => userConversationsRef.off('value', unsubscribe));
}

// Render conversation list
function renderConversationList() {
  if (state.conversations.length === 0) {
    conversationList.innerHTML = `
      <div class="empty-state" style="padding: 20px; text-align: center;">
        <i class="fas fa-comments" style="font-size: 32px; color: var(--light-gray);"></i>
        <p style="margin-top: 10px;">No conversations yet</p>
        <p style="font-size: 14px; color: var(--gray-color);">Start a new chat to get going!</p>
      </div>
    `;
    return;
  }
  
  conversationList.innerHTML = '';
  
  state.conversations.forEach(conversation => {
    const isActive = state.currentChat && state.currentChat.id === conversation.id;
    const lastMessage = conversation.lastMessage || { text: 'No messages yet', timestamp: null };
    
    // Count participants excluding current user
    const participantsCount = Object.keys(conversation.participants || {}).length - 1;
    
    const conversationElement = document.createElement('div');
    conversationElement.className = `conversation-item ${isActive ? 'active' : ''}`;
    conversationElement.setAttribute('data-id', conversation.id);
    conversationElement.innerHTML = `
      <div class="conversation-avatar">
        ${conversation.name ? getInitials(conversation.name) : 'CH'}
      </div>
      <div class="conversation-info">
        <div class="conversation-name">${conversation.name || 'Chat'}</div>
        <div class="conversation-last-message">
          ${lastMessage.text}
        </div>
      </div>
      <div class="conversation-meta">
        <div class="conversation-time">
          ${lastMessage.timestamp ? formatTime(lastMessage.timestamp) : ''}
        </div>
        ${conversation.unreadCount ? `
          <div class="unread-badge">${conversation.unreadCount}</div>
        ` : ''}
      </div>
    `;
    
    conversationElement.addEventListener('click', () => {
      selectConversation(conversation);
    });
    
    conversationList.appendChild(conversationElement);
  });
}

// Select a conversation
function selectConversation(conversation) {
  // Unselect previous conversation in UI
  const activeConversation = conversationList.querySelector('.conversation-item.active');
  if (activeConversation) {
    activeConversation.classList.remove('active');
  }
  
  // Mark new conversation as active in UI
  const newActiveConversation = conversationList.querySelector(`.conversation-item[data-id="${conversation.id}"]`);
  if (newActiveConversation) {
    newActiveConversation.classList.add('active');
  }
  
  // Update state
  state.currentChat = conversation;
  
  // Show chat container and hide "no chat selected" message
  noChatSelected.classList.add('hidden');
  chatContainer.classList.remove('hidden');
  
  // Update chat header
  chatTitle.textContent = conversation.name || 'Chat';
  const participantsCount = Object.keys(conversation.participants || {}).length;
  chatParticipantsCount.textContent = participantsCount;
  
  // Load messages
  loadMessages(conversation.id);
  
  // Mark conversation as read
  markConversationAsRead(conversation.id);
}

// Load messages for a conversation
function loadMessages(conversationId) {
  // Clear previous messages
  messagesContainer.innerHTML = '';
  state.messages = [];
  
  // Clear previous message listener
  if (state.lastMessageRef) {
    state.lastMessageRef.off();
  }
  
  // Get messages for this conversation
  const messagesRef = firebase.database().ref(`messages/${conversationId}`)
    .orderByChild('timestamp')
    .limitToLast(50);
  
  state.lastMessageRef = messagesRef;
  
  messagesRef.on('value', snapshot => {
    if (!snapshot.exists()) {
      messagesContainer.innerHTML = `
        <div class="empty-state" style="padding: 20px; text-align: center;">
          <i class="fas fa-comment-alt" style="font-size: 32px; color: var(--light-gray);"></i>
          <p style="margin-top: 10px;">No messages yet</p>
          <p style="font-size: 14px; color: var(--gray-color);">Send a message to start the conversation!</p>
        </div>
      `;
      return;
    }
    
    const messages = [];
    snapshot.forEach(childSnapshot => {
      messages.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    
    state.messages = messages;
    renderMessages();
  });
}

// Render messages
function renderMessages() {
  if (state.messages.length === 0) return;
  
  messagesContainer.innerHTML = '';
  
  let currentDate = null;
  
  state.messages.forEach((message, index) => {
    // Check if we need to add a date divider
    const messageDate = formatDate(message.timestamp);
    if (messageDate !== currentDate) {
      currentDate = messageDate;
      
      const dateDivider = document.createElement('div');
      dateDivider.className = 'date-divider';
      dateDivider.innerHTML = `<span>${messageDate}</span>`;
      messagesContainer.appendChild(dateDivider);
    }
    
    const isOutgoing = message.senderId === state.currentUser.uid;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
    messageElement.innerHTML = `
      <div class="message-avatar">
        ${getInitials(message.senderName || 'User')}
      </div>
      <div class="message-content">
        ${!isOutgoing ? `<div class="message-sender">${message.senderName || 'User'}</div>` : ''}
        <div class="message-bubble">
          ${message.text}
        </div>
        <div class="message-meta">
          <span class="message-time">${formatTime(message.timestamp)}</span>
          ${isOutgoing ? `
            <span class="message-status">
              <i class="fas fa-check"></i>
            </span>
          ` : ''}
        </div>
      </div>
    `;
    
    messagesContainer.appendChild(messageElement);
  });
  
  // Scroll to bottom
  scrollToBottom();
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Mark conversation as read
function markConversationAsRead(conversationId) {
  if (!state.currentUser) return;
  
  const userConversationRef = firebase.database()
    .ref(`userConversations/${conversationId}/${state.currentUser.uid}`);
  
  userConversationRef.update({
    unreadCount: 0,
    lastRead: firebase.database.ServerValue.TIMESTAMP
  });
}

// Send a message
function sendMessage(text) {
  if (!text.trim() || !state.currentChat || !state.currentUser) return;
  
  const newMessageRef = firebase.database().ref(`messages/${state.currentChat.id}`).push();
  
  const message = {
    text: text.trim(),
    senderId: state.currentUser.uid,
    senderName: state.currentUser.displayName || 'User',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    read: false
  };
  
  // Add message to database
  newMessageRef.set(message)
    .then(() => {
      // Update conversation metadata
      updateConversationMetadata(state.currentChat.id, text.trim());
      
      // Clear input
      messageInput.value = '';
      messageInput.focus();
    })
    .catch(error => {
      showError(`Error sending message: ${error.message}`);
    });
}

// Update conversation metadata after sending a message
function updateConversationMetadata(conversationId, messageText) {
  const conversationRef = firebase.database().ref(`conversations/${conversationId}`);
  const userConversationsRef = firebase.database().ref(`userConversations/${conversationId}`);
  
  // Update the conversation's last message
  conversationRef.update({
    lastMessage: {
      text: messageText,
      senderId: state.currentUser.uid,
      senderName: state.currentUser.displayName || 'User',
      timestamp: firebase.database.ServerValue.TIMESTAMP
    },
    updatedAt: firebase.database.ServerValue.TIMESTAMP
  });
  
  // Get participants to update their unread counts
  conversationRef.child('participants').once('value')
    .then(snapshot => {
      if (!snapshot.exists()) return;
      
      const updates = {};
      
      // For each participant (except sender), increment unread count
      snapshot.forEach(participantSnapshot => {
        const participantId = participantSnapshot.key;
        
        if (participantId !== state.currentUser.uid) {
          updates[`${participantId}/unreadCount`] = firebase.database.ServerValue.increment(1);
        }
        
        updates[`${participantId}/timestamp`] = firebase.database.ServerValue.TIMESTAMP;
      });
      
      // Update all participants' metadata in one go
      userConversationsRef.update(updates);
    });
}

// Create a new conversation
function createNewConversation(name, participants) {
  if (!state.currentUser) return Promise.reject(new Error('User not signed in'));
  if (!name.trim()) return Promise.reject(new Error('Chat name is required'));
  if (participants.length === 0) return Promise.reject(new Error('Please select at least one participant'));
  
  // Create a new conversation ref
  const newConversationRef = firebase.database().ref('conversations').push();
  const conversationId = newConversationRef.key;
  
  // Add current user to participants
  const participantsObj = {
    [state.currentUser.uid]: {
      displayName: state.currentUser.displayName || 'User',
      email: state.currentUser.email
    }
  };
  
  // Add selected participants
  participants.forEach(user => {
    participantsObj[user.uid] = {
      displayName: user.displayName,
      email: user.email
    };
  });
