const admin = require('firebase-admin');

/**
 * Firebase helper functions for server-side operations
 */
class FirebaseService {
  constructor() {
    this.db = admin.database();
    this.auth = admin.auth();
  }

  /**
   * Get user profile by user ID
   * @param {string} uid - User ID
   * @returns {Promise<object>} User profile
   */
  async getUserProfile(uid) {
    try {
      const snapshot = await this.db.ref(`users/${uid}`).once('value');
      return snapshot.val();
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Create or update user profile
   * @param {string} uid - User ID
   * @param {object} profileData - User profile data
   * @returns {Promise<void>}
   */
  async updateUserProfile(uid, profileData) {
    try {
      await this.db.ref(`users/${uid}`).update({
        ...profileData,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Send a message to a chat room
   * @param {string} roomId - Chat room ID
   * @param {object} messageData - Message data
   * @returns {Promise<string>} Message ID
   */
  async sendMessage(roomId, messageData) {
    try {
      const newMessageRef = this.db.ref(`messages/${roomId}`).push();
      await newMessageRef.set({
        ...messageData,
        timestamp: admin.database.ServerValue.TIMESTAMP
      });
      return newMessageRef.key;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Create a new chat room
   * @param {object} roomData - Room data
   * @returns {Promise<string>} Room ID
   */
  async createRoom(roomData) {
    try {
      const newRoomRef = this.db.ref('rooms').push();
      await newRoomRef.set({
        ...roomData,
        createdAt: admin.database.ServerValue.TIMESTAMP
      });
      return newRoomRef.key;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  /**
   * Get a list of chat rooms
   * @param {number} limit - Maximum number of rooms to fetch
   * @returns {Promise<Array>} List of rooms
   */
  async getRooms(limit = 50) {
    try {
      const snapshot = await this.db.ref('rooms')
        .orderByChild('createdAt')
        .limitToLast(limit)
        .once('value');
      
      const rooms = [];
      snapshot.forEach((childSnapshot) => {
        rooms.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      
      return rooms.reverse();
    } catch (error) {
      console.error('Error getting rooms:', error);
      throw error;
    }
  }
}

module.exports = new FirebaseService();
