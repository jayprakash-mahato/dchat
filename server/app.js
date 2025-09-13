import dotenv from "dotenv";
import http from "http";
import express from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";

import connectDB from "./db/connection.js";
import Users from "./models/Users.js";
import Conversations from "./models/Conversations.js";
import Messages from "./models/Messages.js";

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.io users
let users = [];

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("addUser", (userId) => {
    const isUserExist = users.find((user) => user.userId === userId);
    if (!isUserExist) {
      const user = { userId, socketId: socket.id };
      users.push(user);
      io.emit("getUsers", users);
    }
  });

  socket.on("sendMessage", async ({ senderId, receiverId, message, conversationId }) => {
  try {
    const receiver = users.find((user) => user.userId === receiverId);
    const user = await Users.findById(senderId);

    const payload = {
      senderId,
      message,
      conversationId,
      receiverId,
      user: { id: user._id, fullName: user.fullName, email: user.email },
    };

    // Always emit to sender using current socket.id
    if (receiver) {
      io.to(receiver.socketId).to(socket.id).emit("getMessage", payload);
    } else {
      io.to(socket.id).emit("getMessage", payload);
    }
  } catch (err) {
    console.error("Socket sendMessage error:", err);
  }
});


  socket.on("disconnect", () => {
    users = users.filter((user) => user.socketId !== socket.id);
    io.emit("getUsers", users);
  });
});

// Routes
app.get("/", (req, res) => res.send("Welcome"));

// ✅ Register Route
app.post("/api/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).send("Please fill all required fields");
    }

    const isAlreadyExist = await Users.findOne({ email });
    if (isAlreadyExist) {
      return res.status(400).send("User already exists");
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const newUser = new Users({ fullName, email, password: hashedPassword });
    await newUser.save();

    return res.status(200).send("User registered successfully");
    // return res.status(200).json({ message: "User registered successfully" });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server error");
  }
});

// ✅ Login Route
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Users.findOne({ email });
    if (!user) return res.status(400).send("User email or password is incorrect");

    const validateUser = await bcryptjs.compare(password, user.password);
    if (!validateUser) return res.status(400).send("User email or password is incorrect");

    const payload = { userId: user._id, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: "1d" });

    await Users.updateOne({ _id: user._id }, { $set: { token } });

    return res.status(200).json({
      user: { id: user._id, email: user.email, fullName: user.fullName },
      token,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server error");
  }
});

// ✅ Conversation Routes
app.post("/api/conversation", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    const newConversation = new Conversations({ members: [senderId, receiverId] });
    await newConversation.save();
    res.status(200).send("Conversation created successfully");
  } catch (error) {
    console.error("Error:", error);
  }
});

app.get("/api/conversations/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const conversations = await Conversations.find({ members: { $in: [userId] } });

    const conversationUserData = await Promise.all(
      conversations.map(async (conversation) => {
        const receiverId = conversation.members.find((member) => member !== userId);
        const user = await Users.findById(receiverId);
        return {
          user: { receiverId: user._id, email: user.email, fullName: user.fullName },
          conversationId: conversation._id,
        };
      })
    );

    res.status(200).json(conversationUserData);
  } catch (error) {
    console.error("Error:", error);
  }
});

// ✅ Messages Routes
app.post("/api/message", async (req, res) => {
  try {
    const { conversationId, senderId, message, receiverId = "" } = req.body;

    if (!senderId || !message) return res.status(400).send("Please fill all required fields");

    if (conversationId === "new" && receiverId) {
      const newConversation = new Conversations({ members: [senderId, receiverId] });
      await newConversation.save();

      const newMessage = new Messages({ conversationId: newConversation._id, senderId, message });
      await newMessage.save();

      return res.status(200).send("Message sent successfully");
    }

    const newMessage = new Messages({ conversationId, senderId, message });
    await newMessage.save();

    res.status(200).send("Message sent successfully");
  } catch (error) {
    console.error("Error:", error);
  }
});

app.get("/api/message/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;

    const getMessages = async (convId) => {
      const messages = await Messages.find({ conversationId: convId });
      return Promise.all(
        messages.map(async (message) => {
          const user = await Users.findById(message.senderId);
          return { user: { id: user._id, email: user.email, fullName: user.fullName }, message: message.message };
        })
      );
    };

    if (conversationId === "new") {
      const checkConversation = await Conversations.find({
        members: { $all: [req.query.senderId, req.query.receiverId] },
      });
      if (checkConversation.length > 0) {
        return res.status(200).json(await getMessages(checkConversation[0]._id));
      } else {
        return res.status(200).json([]);
      }
    } else {
      return res.status(200).json(await getMessages(conversationId));
    }
  } catch (error) {
    console.error("Error:", error);
  }
});

// ✅ Users Route
app.get("/api/users/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const users = await Users.find({ _id: { $ne: userId } });

    const usersData = await Promise.all(
      users.map(async (user) => ({
        user: { email: user.email, fullName: user.fullName, receiverId: user._id },
      }))
    );

    res.status(200).json(usersData);
  } catch (error) {
    console.error("Error:", error);
  }
});

// Start server
const PORT = process.env.PORT || 8000;
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
  });
};

startServer();
