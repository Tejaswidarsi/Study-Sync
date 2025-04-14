import React, { useEffect, useState } from 'react';
import API from '../api'; // axios instance
import '../UserProfile.css'; // optional CSS

function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await API.get('http://localhost:5000/api/user/profile'); // Adjust this endpoint to your backend
        setUser(res.data);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
  
    fetchCourses();  // existing call
    fetchUserProfile(); // new call
  }, []);
  

  if (!user) return <p>Loading profile...</p>;

  return (
    <div className="user-profile">
      <h2>Welcome, {user.name}</h2>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Branch:</strong> {user.branch}</p>
      <p><strong>Year of Study:</strong> {user.yearOfStudy}</p>
      <p><strong>Expertise:</strong> {user.expertise}</p>
    </div>
  );
}

export default UserProfile;
