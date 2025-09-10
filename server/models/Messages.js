import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
  },
  senderId: {
    type: String,
  },
  message: {
    type: String,
  },
});

const Messages = mongoose.model("Message", messageSchema);

export default Messages;
