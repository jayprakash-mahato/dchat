import React, { useEffect, useRef, useState } from "react";
import Img1 from "../../assets/img1.jpg";
import blackbg from "../../assets/black_bg.jpg";
import Input from "../../components/Input/Input";
import { io } from "socket.io-client";
import { MessageCircle, Users, Home, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";  

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user:detail"))
  );
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({
    messages: [],
    receiver: null,
    conversationId: null,
  });
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const messageRef = useRef(null);

  // Initialize socket
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ["websocket"],
    });
    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    socket.emit("addUser", user?.id);

    socket.on("getUsers", (users) => {
      console.log("Active users:", users);
    });

    socket.on("getMessage", (data) => {
      // Only update messages if the message is for the current conversation
      if (
        data.conversationId === messages.conversationId ||
        data.senderId === messages.receiver?.receiverId
      ) {
        setMessages((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            { message: data.message, user: data.user },
          ],
        }));
      }
    });

    return () => {
      socket.off("getUsers");
      socket.off("getMessage");
    };
  }, [socket, user?.id, messages.conversationId, messages.receiver]);

  // Auto scroll to the latest message
  useEffect(() => {
    messageRef?.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.messages]);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/conversations/${user?.id}`
      );
      const resData = await res.json();
      setConversations(resData);
    };
    fetchConversations();
  }, [user?.id]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/${user?.id}`
      );
      const resData = await res.json();
      setUsers(resData);
    };
    fetchUsers();
  }, [user?.id]);

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId, receiver) => {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/message/${conversationId}?senderId=${
        user?.id
      }&receiverId=${receiver?.receiverId}`
    );
    const resData = await res.json();
    setMessages({ messages: resData, receiver, conversationId });
  };

  // Send a message
  //   const sendMessage = async () => {
  //     if (!message.trim()) return;

  //     const payload = {
  //       senderId: user?.id,
  //       receiverId: messages.receiver?.receiverId,
  //       message,
  //       conversationId: messages.conversationId,
  //     };

  //     // Emit message via socket
  //     socket?.emit('sendMessage', payload);

  //     // Save message to DB
  //     await fetch(`${import.meta.env.VITE_API_URL}/api/message`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(payload),
  //     });

  //     // Update UI immediately for sender
  //     setMessages((prev) => ({
  //       ...prev,
  //       messages: [...prev.messages, { message, user }],
  //     }));

  //     setMessage('');
  //   };

  // Send a message
  const sendMessage = async () => {
    if (!message.trim()) return;

    const payload = {
      senderId: user?.id,
      receiverId: messages.receiver?.receiverId,
      message,
      conversationId: messages.conversationId,
    };

    // Emit message via socket
    socket?.emit("sendMessage", payload);

    // Save message to DB
    await fetch(`${import.meta.env.VITE_API_URL}/api/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // ❌ Remove this (causing duplicate):
    // setMessages((prev) => ({
    //   ...prev,
    //   messages: [...prev.messages, { message, user }],
    // }));

    setMessage("");
  };

    // ✅ Logout function
  const handleLogout = () => {
    localStorage.removeItem("user:token");
    localStorage.removeItem("user:detail");
    socket?.disconnect(); // optional
    navigate("/users/sign_in");
  };

  const [activeTab, setActiveTab] = useState("chats");
  return (
    <div className="w-screen flex flex-col md:flex-row h-screen bg-gray-900 text-white">
      {/* Left Panel - Conversations */}
      <div
        className={`${
          activeTab === "chats" ? "flex" : "hidden"
        } md:flex md:w-[25%] w-full h-full bg-gray-800 overflow-y-auto flex-col`}
      >
        {/* User Info */}
        <div className="flex items-center my-4 md:my-8 mx-6 md:mx-10">
          <div className="relative w-[80px] h-[80px]">
            {/* Avatar Image */}
            <img
              src={blackbg}
              alt="profile"
              className="w-full h-full rounded-full border-2 border-indigo-500"
            />

            {/* Dynamic Text */}
            <span className="absolute bottom-0 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded-full shadow-lg">
              {user?.fullName}
            </span>
          </div>
          <div className="ml-4 md:ml-6">
            <h3 className="text-lg md:text-xl font-semibold">
              {user?.fullName}
            </h3>
            <p className="text-sm md:text-base text-gray-400">My Account</p>
          </div>
         {/* Logout Button */}
         <div className="ml-24">

          <button
            onClick={handleLogout}
            className="p-2 bg-red-600 flex gap-2 hover:bg-red-700 rounded-full transition"
            title="Logout"
          >Logout

            <LogOut size={20} />
          </button>
         </div>

        </div>
        <hr className="border-gray-700" />

        {/* Conversations */}
        <div className="mx-6 md:mx-10 mt-6">
          <div className="text-indigo-400 font-semibold mb-4">Messages</div>
          {conversations.length > 0 ? (
            conversations.map(({ conversationId, user }) => (
              <div
                key={conversationId}
                className="flex items-center py-4 border-b border-gray-700 hover:bg-gray-700 rounded-lg px-2 transition cursor-pointer"
                onClick={() => fetchMessages(conversationId, user)}
              >
                <img
                  src={blackbg}
                  className="w-[50px] h-[50px] rounded-full border border-indigo-500"
                />
                <div className="ml-4">
                  <h3 className="text-base font-semibold">{user?.fullName}</h3>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 mt-12">
              No Conversations
            </div>
          )}
        </div>
      </div>

      {/* Center Panel - Messages */}
      <div
        className={`${
          activeTab === "messages" ? "flex" : "hidden"
        } md:flex md:w-[50%] w-full flex-col bg-gray-900`}
      >
        {/* Chat Header */}
        {messages?.receiver?.fullName && (
          <div className="w-full sticky top-0 bg-gray-800 border-b border-gray-700 h-[65px] flex items-center px-6 shadow-md">
            <img
              src={blackbg}
              className="w-[45px] h-[45px] rounded-full border border-indigo-500"
            />
            <div className="ml-4">
              <h3 className="text-sm md:text-lg font-semibold">
                {messages?.receiver?.fullName}
              </h3>
              <p className="text-xs text-gray-400">
                {messages?.receiver?.email}
              </p>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 w-full overflow-y-auto p-4 md:p-8 space-y-4">
          {messages?.messages?.length > 0 ? (
            messages.messages.map(({ message, user: msgUser }, index) => (
              <div
                key={index}
                className={`max-w-[75%] md:max-w-[50%] px-4 py-3 rounded-2xl shadow-md ${
                  msgUser.id === user?.id
                    ? "bg-green-600 text-white ml-auto rounded-tr-none"
                    : "bg-indigo-600 text-white mr-auto rounded-tl-none"
                }`}
              >
                {message}
                {index === messages.messages.length - 1 && (
                  <div ref={messageRef}></div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 mt-12">
              No Messages Yet
            </div>
          )}
        </div>

        {/* Message Input */}
        {messages?.receiver?.fullName && (
          <div className="p-4 bg-gray-800 flex items-center border-t border-gray-700">
            <input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 px-4 mb-12 py-3 rounded-full bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              className={`ml-3 p-3 mb-12 rounded-full bg-green-600 hover:bg-green-700 transition shadow-md ${
                !message && "opacity-50 pointer-events-none"
              }`}
              onClick={sendMessage}
            >
              <Send size={22} />
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - People */}
      <div
        className={`${
          activeTab === "people" ? "flex" : "hidden"
        } md:flex md:w-[25%] w-full h-full bg-gray-800 flex-col overflow-y-auto px-4 md:px-8 py-6 md:py-12`}
      >
        <div className="text-indigo-400 font-semibold mb-4">People</div>
        {users.length > 0 ? (
          users.map(({ userId, user }) => (
            <div
              key={userId}
              className="flex items-center py-4 border-b border-gray-700 hover:bg-gray-700 rounded-lg px-2 transition cursor-pointer"
              onClick={() => fetchMessages("new", user)}
            >
              <img
                src={blackbg}
                className="w-[50px] h-[50px] rounded-full border border-indigo-500"
              />
              <div className="ml-4">
                <h3 className="text-base font-semibold">{user?.fullName}</h3>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 mt-12">No Users</div>
        )}
      </div>

      {/* Bottom Navigation (only mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-gray-800 border-t border-gray-700 flex justify-around py-2 shadow-lg">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex flex-col items-center ${
            activeTab === "chats" ? "text-indigo-400" : "text-gray-400"
          }`}
        >
          <Home size={22} />
          <span className="text-xs mt-1">Chats</span>
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          className={`flex flex-col items-center ${
            activeTab === "messages" ? "text-green-400" : "text-gray-400"
          }`}
        >
          <MessageCircle size={22} />
          <span className="text-xs mt-1">Messages</span>
        </button>
        <button
          onClick={() => setActiveTab("people")}
          className={`flex flex-col items-center ${
            activeTab === "people" ? "text-indigo-400" : "text-gray-400"
          }`}
        >
          <Users size={22} />
          <span className="text-xs mt-1">People</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
