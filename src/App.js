import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Dash from './pages/UserDashboard';
import AdminRegister from './admin/AdminRegister';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import Chat from './pages/ChatPage';
import { SocketProvider } from './pages/SocketContext';
function App() {
  return (
    <SocketProvider>
    <Router>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Routes>
          <Route path="/" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route path='/admin/login' element={<AdminLogin/>}/>
          <Route path='/dash' element={<Dash/>} />
          <Route path='/admin/dash' element={<AdminDashboard/>} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </div>
    </Router>
    </SocketProvider>
  );
}

export default App;
