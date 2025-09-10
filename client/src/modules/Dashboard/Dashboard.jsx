
import React, { useEffect, useRef, useState } from 'react';
import Img1 from '../../assets/img1.jpg';
import tutorialsdev from '../../assets/tutorialsdev.png';
import Input from '../../components/Input/Input';
import { io } from 'socket.io-client';

const Dashboard = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user:detail')));
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({ messages: [], receiver: null, conversationId: null });
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const messageRef = useRef(null);

  // Initialize socket
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket'],
    });
    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    socket.emit('addUser', user?.id);

    socket.on('getUsers', (users) => {
      console.log('Active users:', users);
    });

    socket.on('getMessage', (data) => {
      // Only update messages if the message is for the current conversation
      if (data.conversationId === messages.conversationId || data.senderId === messages.receiver?.receiverId) {
        setMessages((prev) => ({
          ...prev,
          messages: [...prev.messages, { message: data.message, user: data.user }],
        }));
      }
    });

    return () => {
      socket.off('getUsers');
      socket.off('getMessage');
    };
  }, [socket, user?.id, messages.conversationId, messages.receiver]);

  // Auto scroll to the latest message
  useEffect(() => {
    messageRef?.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.messages]);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/conversations/${user?.id}`);
      const resData = await res.json();
      setConversations(resData);
    };
    fetchConversations();
  }, [user?.id]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${user?.id}`);
      const resData = await res.json();
      setUsers(resData);
    };
    fetchUsers();
  }, [user?.id]);

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId, receiver) => {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/message/${conversationId}?senderId=${user?.id}&receiverId=${receiver?.receiverId}`
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
  socket?.emit('sendMessage', payload);

  // Save message to DB
  await fetch(`${import.meta.env.VITE_API_URL}/api/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // ❌ Remove this (causing duplicate):
  // setMessages((prev) => ({
  //   ...prev,
  //   messages: [...prev.messages, { message, user }],
  // }));

  setMessage('');
};


  return (
    <div className="w-screen flex">
      {/* Left Panel - Conversations */}
      <div className="w-[25%] h-screen bg-secondary overflow-scroll">
        <div className="flex items-center my-8 mx-14">
          <div>
            <img src={tutorialsdev} width={75} height={75} className="border border-primary p-[2px] rounded-full" />
          </div>
          <div className="ml-8">
            <h3 className="text-2xl">{user?.fullName}</h3>
            <p className="text-lg font-light">My Account</p>
          </div>
        </div>
        <hr />
        <div className="mx-14 mt-10">
          <div className="text-primary text-lg">Messages</div>
          <div>
            {conversations.length > 0 ? (
              conversations.map(({ conversationId, user }) => (
                <div key={conversationId} className="flex items-center py-8 border-b border-b-gray-300">
                  <div className="cursor-pointer flex items-center" onClick={() => fetchMessages(conversationId, user)}>
                    <img src={Img1} className="w-[60px] h-[60px] rounded-full p-[2px] border border-primary" />
                    <div className="ml-6">
                      <h3 className="text-lg font-semibold">{user?.fullName}</h3>
                      <p className="text-sm font-light text-gray-600">{user?.email}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-lg font-semibold mt-24">No Conversations</div>
            )}
          </div>
        </div>
      </div>

      {/* Center Panel - Messages */}
      <div className="w-[50%] h-screen bg-white flex flex-col items-center">
        {messages?.receiver?.fullName && (
          <div className="w-[75%] bg-secondary h-[80px] my-14 rounded-full flex items-center px-14 py-2">
            <img src={Img1} width={60} height={60} className="rounded-full cursor-pointer" />
            <div className="ml-6 mr-auto">
              <h3 className="text-lg">{messages?.receiver?.fullName}</h3>
              <p className="text-sm font-light text-gray-600">{messages?.receiver?.email}</p>
            </div>
          </div>
        )}

        <div className="h-[75%] w-full overflow-scroll shadow-sm">
          <div className="p-14">
            {messages?.messages?.length > 0 ? (
              messages.messages.map(({ message, user: msgUser }, index) => (
                <div
                  key={index}
                  className={`max-w-[40%] rounded-b-xl p-4 mb-6 ${
                    msgUser.id === user?.id ? 'bg-blue-500 text-white rounded-tl-xl ml-auto' : 'bg-secondary rounded-tr-xl'
                  }`}
                >
                  {message}
                  {index === messages.messages.length - 1 && <div ref={messageRef}></div>}
                </div>
              ))
            ) : (
              <div className="text-center text-lg font-semibold mt-24">No Messages or No Conversation Selected</div>
            )}
          </div>
        </div>

        {messages?.receiver?.fullName && (
          <div className="p-14 w-full flex items-center">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-[75%]"
              inputClassName="p-4 border-0 shadow-md rounded-full bg-light focus:ring-0 focus:border-0 outline-none"
            />
            <div
              className={`ml-4 p-2 cursor-pointer bg-light rounded-full ${!message && 'pointer-events-none'}`}
              onClick={sendMessage}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler icon-tabler-send" width="30" height="30" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#2c3e50" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <line x1="10" y1="14" x2="21" y2="3" />
                <path d="M21 3l-6.5 18a0.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a0.55 .55 0 0 1 0 -1l18 -6.5" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - People */}
      <div className="w-[25%] h-screen bg-light px-8 py-16 overflow-scroll">
        <div className="text-primary text-lg">People</div>
        <div>
          {users.length > 0 ? (
            users.map(({ userId, user }) => (
              <div key={userId} className="flex items-center py-8 border-b border-b-gray-300">
                <div className="cursor-pointer flex items-center" onClick={() => fetchMessages('new', user)}>
                  <img src={Img1} className="w-[60px] h-[60px] rounded-full p-[2px] border border-primary" />
                  <div className="ml-6">
                    <h3 className="text-lg font-semibold">{user?.fullName}</h3>
                    <p className="text-sm font-light text-gray-600">{user?.email}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-lg font-semibold mt-24">No Users</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
