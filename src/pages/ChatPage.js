import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { useSocket } from './SocketContext';
import '../Chatpage.css';
import { FaPlus, FaTrash, FaVideo } from 'react-icons/fa';

function ChatPage() {
  const navigate = useNavigate();
  const socket = useSocket().current;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [group, setGroup] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const groupId = localStorage.getItem('selectedGroupId');
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (!socket) {
      setError('Socket not initialized. Check SocketContext.');
      setLoading(false);
      return;
    }

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setError('No access token found. Please log in again.');
      setLoading(false);
      navigate('/login');
      return;
    }
    API.defaults.headers.Authorization = `Bearer ${accessToken}`;

    const fetchUserProfile = async () => {
      try {
        const res = await API.get('/user/profile');
        setUserProfile(res.data);
        console.log('Fetched user profile:', res.data);
      } catch (err) {
        setError(`Failed to load user profile: ${err.message}`);
      }
    };

    const fetchGroupDetails = async (groupId) => {
      try {
        if (!groupId) throw new Error('No groupId found in localStorage');
        const res = await API.get(`/group/${groupId}`);
        setMessages(res.data.chat?.map(msg => ({ ...msg, messageId: msg._id || Date.now() + Math.random() })) || []);
        setGroup(res.data);
        console.log('Fetched group data:', res.data);
      } catch (err) {
        setError(`Failed to load group details: ${err.message}`);
        setMessages([]);
      }
    };

    setLoading(true);
    setError(null);
    fetchUserProfile();
    if (groupId) {
      fetchGroupDetails(groupId).then(() => setLoading(false)).catch(() => setLoading(false));
      socket.emit('joinGroup', groupId, (response) => {
        if (!response?.success) setError(`Failed to join group: ${response?.error}`);
      });

      const handleNewMessage = (data) => {
        if (data.groupId === groupId && data.userId !== userProfile?._id) {
          setMessages((prev) => [...prev, { ...data, messageId: data.messageId || Date.now() + Math.random() }]);
        }
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('connect', () => socket.emit('joinGroup', groupId));
      socket.on('disconnect', () => setError('Socket disconnected. Reconnecting...'));
      socket.on('connect_error', (error) => setError(`Socket connection error: ${error.message}`));

      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.emit('leaveGroup', groupId);
      };
    } else {
      setError('No group ID found in localStorage.');
      setLoading(false);
    }
  }, [groupId, navigate, socket]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    console.log('Group state updated:', group);
  }, [group, messages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && groupId && userProfile?._id && socket) {
      const messageId = Date.now() + Math.random();
      const messageData = {
        groupId,
        message: newMessage,
        userId: userProfile._id,
        timestamp: new Date().toISOString(),
        messageId,
      };
      setMessages((prev) => [...prev, { ...messageData, tempMessageId: Date.now() }]);

      try {
        const response = await API.post('/group/group-chat', messageData);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.tempMessageId === Date.now() ? { ...response.data.message, messageId: response.data.message._id || messageId } : msg
          ).filter((msg) => !msg.tempMessageId)
        );
      } catch (err) {
        setError(`Failed to send message: ${err.response?.data?.error || err.message}`);
        setMessages((prev) => prev.filter((msg) => !msg.tempMessageId));
      }

      setNewMessage('');
    }
  };

  const handleFileUpload = async (event) => {
    console.log('File input triggered:', event.target.files[0]);
    const file = event.target.files[0];
    if (file && groupId && userProfile?._id) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('groupId', groupId);
      formData.append('userId', userProfile._id);

      try {
        const response = await API.post('/group/upload-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        console.log('Upload response:', response.data);
        const res = await API.get(`/group/${groupId}`);
        console.log('Updated group data with resources:', res.data.resources);
        setGroup(res.data);
      } catch (err) {
        setError(`Failed to upload file: ${err.message}`);
        console.error('Upload error:', err);
      }
      setSelectedFile(null);
    } else {
      setError('Missing file, groupId, or userProfile');
      console.log('Missing data:', { file, groupId, userProfile });
    }
  };

  const handleClearChat = async () => {
    if (groupId && userProfile?._id && window.confirm('Are you sure you want to clear all chat messages?')) {
      try {
        const response = await API.post(`/group/clear-chat`, { groupId });
        if (response.data.success) {
          setMessages([]);
          setGroup({ ...group, chat: [] });
          console.log('Chat cleared successfully');
        } else {
          setError('Failed to clear chat');
        }
      } catch (err) {
        setError(`Error clearing chat: ${err.message}`);
        console.error('Clear chat error:', err);
      }
    }
  };

  const handleStartZoomMeeting = () => {
    // Replace with your pre-generated Zoom meeting link
    const zoomMeetingLink = 'https://zoom.us/j/1234567890?pwd=yourpassword'; // Example link
    if (zoomMeetingLink) {
      window.open(zoomMeetingLink, '_blank');
    } else {
      setError('Zoom meeting link not configured');
    }
  };

  if (loading) return <div>Loading Chat...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="chat-page-container">
      <header className="chat-header">
        <h2>{group ? group.name : 'Chat'}</h2>
        <button onClick={() => navigate('/dash')}>Back to Dashboard</button>
      </header>
      <div className="chat-area" ref={chatContainerRef}>
        <ul>
          {messages.map((msg, index) => (
            <li key={index} className={msg.userId === userProfile?._id ? 'sent' : 'received'}>
              <strong>
                {msg.userId === userProfile?._id ? 'You' : group?.members.find((m) => m._id === msg.userId)?.name || 'User'}
                :
              </strong>{' '}
              {msg.message} <br />
              <small>{new Date(msg.timestamp).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      </div>
      <div className="resources-section">
        <h4>Uploaded Images</h4>
        <div className="image-gallery">
          {group?.resources?.length > 0 ? (
            group.resources.map((resource, index) => {
              const isImage = /\.(jpg|jpeg|png|gif)$/i.test(resource.filename);
              const imagePath = resource.path.replace(/^uploads\//, '');
              console.log(`Attempting to load image: http://localhost:5000/${imagePath}`, resource);
              return isImage ? (
                <div key={index} className="image-item">
                  <img
                    src={`http://localhost:5000/${imagePath}`}
                    alt={resource.filename}
                    className="uploaded-image"
                    onError={(e) => {
                      console.log(`Image load failed for: ${resource.filename}`, resource);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ) : null;
            })
          ) : (
            <div>No images uploaded yet</div>
          )}
        </div>
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={handleSendMessage}>Send</button>
        <button onClick={handleClearChat} className="clear-chat-btn">
          <FaTrash /> Clear Chat
        </button>
        <button onClick={handleStartZoomMeeting} className="zoom-btn">
          <FaVideo /> Zoom
        </button>
        <label htmlFor="file-upload" className="resource-upload-btn">
          <FaPlus />
        </label>
        <input
          id="file-upload"
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
}

export default ChatPage;