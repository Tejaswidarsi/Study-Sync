import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import '../UserDashboard.css';

function UserDashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [progress, setProgress] = useState({});
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [playerError, setPlayerError] = useState(null);
  const [activeSection, setActiveSection] = useState('home');
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', maxSize: 5 });
  const [groupError, setGroupError] = useState(null);
  const videoRefs = useRef([]);
  const [selectedGroupId, setSelectedGroupId] = useState(() => localStorage.getItem('selectedGroupId') || null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/dist/index.js';
    script.async = true;
    script.onload = () => {
      if (customElements.get('emoji-picker')) {
        console.log('Emoji picker loaded successfully');
      }
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileError(null);
      const res = await API.get('/user/profile');
      setUserProfile(res.data);
      const backendProgress = res.data.progress || {};
      setProgress((prev) => ({ ...prev, ...backendProgress }));
    } catch (error) {
      setProfileError('Failed to load profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await API.get('/user/courses');
      setCourses(res.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await API.get('/group');
      if (Array.isArray(res.data)) {
        setGroups(res.data);
        setGroupError(null);
        const savedGroupId = localStorage.getItem('selectedGroupId');
        if (savedGroupId && res.data.some((group) => group.groupId === savedGroupId)) {
          setSelectedGroupId(savedGroupId);
        }
      } else {
        setGroups([]);
        setGroupError('Invalid group data received');
      }
    } catch (error) {
      console.error('Error fetching groups:', error.response?.data || error.message);
      setGroups([]);
      setGroupError('Failed to load groups. Check backend server or endpoint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      API.defaults.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      navigate('/login');
      return;
    }
    fetchUserProfile();
    fetchCourses();
    fetchGroups();
  }, [navigate]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!userProfile?._id) {
      setGroupError('User profile not loaded. Please try again.');
      return;
    }
    try {
      const res = await API.post('/group/create-group', newGroup);
      setGroups((prevGroups) => [...prevGroups, res.data]);
      setNewGroup({ name: '', description: '', maxSize: 5 });
      setGroupError(null);
      setSelectedGroupId(res.data.groupId);
      localStorage.setItem('selectedGroupId', res.data.groupId);
    } catch (error) {
      setGroupError('Failed to create group');
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      if (!userProfile?._id) {
        setGroupError('User profile not loaded. Please try again.');
        return;
      }
      const res = await API.post('/group/join-group', { groupId });
      setGroups(groups.map((g) => (g.groupId === groupId ? res.data : g)));
      setSelectedGroupId(groupId);
      localStorage.setItem('selectedGroupId', groupId);
      setGroupError(null);
    } catch (error) {
      setGroupError(error.response?.data?.message || 'Failed to join group');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    try {
      await API.delete(`/group/${groupId}`);
      setGroups(groups.filter((g) => g.groupId !== groupId));
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
        localStorage.removeItem('selectedGroupId');
      }
      setGroupError(null);
    } catch (error) {
      setGroupError('Failed to delete group');
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const renderVideos = () => {
    if (!selectedCourse || !selectedCourse.videos || selectedCourse.videos.length === 0) {
      return <p>No videos available for this course.</p>;
    }

    return (
      <div className="video-section">
        <h2>{selectedCourse.title}</h2>
        <div className="video-content">
          <div className="video-player">
            <div ref={(el) => (videoRefs.current[0] = el)} id="player" className="video-container"></div>
            {playerError && <p className="error-message">{playerError}</p>}
            <p className="video-title">
              Video {selectedVideoIndex + 1} of {selectedCourse.videos.length}
            </p>
          </div>
          <div className="lecture-list">
            <h3>Lectures</h3>
            <ul>
              {selectedCourse.videos.map((videoUrl, index) => (
                <li
                  key={index}
                  className={`lecture-item ${selectedVideoIndex === index ? 'active' : ''}`}
                  onClick={() => handleLectureClick(index)}
                >
                  <span>L{index + 1} - Video {index + 1}</span>
                  <span className="progress-indicator">{progress[selectedCourse._id] || 0}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="progress-bar">
          <label>Overall Progress: {progress[selectedCourse._id] || 0}%</label>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${progress[selectedCourse._id] || 0}%` }}></div>
          </div>
        </div>
        <button className="back-btn" onClick={() => setSelectedCourse(null)}>
          Back to Courses
        </button>
      </div>
    );
  };

  const renderHome = () => {
    const filteredCourses = courses.filter(
      (course) =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="courses-container">
        {loading ? (
          <div className="loading">Loading courses...</div>
        ) : selectedCourse ? (
          renderVideos()
        ) : filteredCourses.length === 0 ? (
          <p className="no-courses">No courses found</p>
        ) : (
          <div className="courses-grid">
            {filteredCourses.map((course) => {
              const isEnrolled = userProfile?.enrolledCourses?.includes(course._id);
              return (
                <div key={course._id} className="course-card">
                  {course.thumbnail && (
                    <div className="course-thumbnail">
                      <img src={course.thumbnail} alt={course.title} />
                    </div>
                  )}
                  <div className="course-content">
                    <h3>{course.title}</h3>
                    <p className="course-description">{course.description}</p>
                    <div className="course-meta">
                      {course.duration && (
                        <span className="duration">
                          Duration: {course.duration} {typeof course.duration === 'number' ? 'hours' : ''}
                        </span>
                      )}
                      <span className="video-count">
                        {course.videos.length} {course.videos.length === 1 ? 'video' : 'videos'}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <label>Progress: {progress[course._id] || 0}%</label>
                      <div className="progress">
                        <div className="progress-fill" style={{ width: `${progress[course._id] || 0}%` }}></div>
                      </div>
                    </div>
                    {isEnrolled ? (
                      <>
                        <button className="start-course-btn" onClick={() => handleStartCourse(course)}>
                          Start Course
                        </button>
                        <button
                          className="unenroll-course-btn"
                          onClick={() => handleUnenrollCourse(course._id)}
                        >
                          Unenroll Course
                        </button>
                      </>
                    ) : (
                      <button className="enroll-course-btn" onClick={() => handleEnrollCourse(course)}>
                        Enroll Course
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderProfile = () => {
    return (
      <div className="profile-section">
        <h2>User Profile</h2>
        {profileLoading ? (
          <p>Loading profile...</p>
        ) : profileError ? (
          <p className="error-message">{profileError}</p>
        ) : userProfile ? (
          <div className="profile-details">
            <div className="profile-field">
              <strong>Name:</strong> <span>{userProfile.name}</span>
            </div>
            <div className="profile-field">
              <strong>Email:</strong> <span>{userProfile.email}</span>
            </div>
            <div className="profile-field">
              <strong>Branch:</strong> <span>{userProfile.branch}</span>
            </div>
            <div className="profile-field">
              <strong>Year of Study:</strong> <span>{userProfile.yearOfStudy}</span>
            </div>
            <div className="profile-field">
              <strong>Expertise:</strong> <span>{userProfile.expertise}</span>
            </div>
            <div className="profile-field">
              <strong>Enrolled Courses:</strong>
              {userProfile.enrolledCourses && userProfile.enrolledCourses.length > 0 ? (
                <ul className="enrolled-courses">
                  {userProfile.enrolledCourses.map((courseId, index) => {
                    const course = courses.find((c) => c._id === courseId);
                    return (
                      <li key={index}>
                        {course ? (
                          <div>
                            <div style={{ marginBottom: '5px', fontWeight: '500' }}>{course.title}</div>
                            <div className="progress-bar-container">
                              <div className="progress-p" style={{ width: `${progress[courseId] || 0}%` }}></div>
                            </div>
                            <small>{progress[courseId] || 0}% complete</small>
                          </div>
                        ) : (
                          <span>Course ID: {courseId} (Details unavailable)</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>No courses enrolled.</p>
              )}
            </div>
          </div>
        ) : (
          <p>No profile data available.</p>
        )}
      </div>
    );
  };

  const renderStudyGroups = () => {
    return (
      <div className="study-groups-section">
        <h2>Study Groups</h2>
        {groupError && <p className="error-message">{groupError}</p>}
        <h3>Create New Group</h3>
        <form onSubmit={handleCreateGroup}>
          <input
            type="text"
            placeholder="Group Name"
            value={newGroup.name}
            onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={newGroup.description}
            onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
          />
          <input
            type="number"
            min="2"
            max="10"
            value={newGroup.maxSize}
            onChange={(e) => setNewGroup({ ...newGroup, maxSize: e.target.value })}
            required
          />
          <button type="submit">Create Group</button>
        </form>
        <div className="groups-container">
          <div className="group-list">
            <h3>Available Groups</h3>
            <ul>
              {groups.map((group) => (
                <li key={group.groupId}>
                  <span className={selectedGroupId === group.groupId ? 'active-group' : ''}>
                    {group.name} ({group.members.length}/{group.maxSize} members)
                  </span>
                  {!group.members.some((m) => m._id === userProfile?._id) &&
                    group.members.length < group.maxSize && (
                      <button onClick={() => handleJoinGroup(group.groupId)}>Join</button>
                    )}
                  {group.members.some((m) => m._id === userProfile?._id) && (
                    <button
                      onClick={() => {
                        setSelectedGroupId(group.groupId);
                        localStorage.setItem('selectedGroupId', group.groupId);
                        navigate('/chat');
                      }}
                    >
                      Open Chat
                    </button>
                  )}
                  {group.createdBy === userProfile?._id && (
                    <button onClick={() => handleDeleteGroup(group.groupId)}>Delete</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const handleLectureClick = (index) => {
    setSelectedVideoIndex(index);
    setPlayerError(null);
  };

  const handleStartCourse = (course) => {
    setSelectedCourse(course);
    setSelectedVideoIndex(0);
    setPlayerError(null);
    videoRefs.current = [];
  };

  const handleEnrollCourse = async (course) => {
    try {
      const res = await API.post('/user/enroll', { courseId: course._id });
      setUserProfile(res.data);
      fetchUserProfile();
      setSelectedCourse(course);
      setSelectedVideoIndex(0);
      setPlayerError(null);
      videoRefs.current = [];
    } catch (error) {
      setProfileError('Failed to enroll in course. Please try again.');
    }
  };

  const handleUnenrollCourse = async (courseId) => {
    try {
      const res = await API.post('/user/unenroll', { courseId });
      setUserProfile(res.data);
      fetchUserProfile();
      if (selectedCourse && selectedCourse._id === courseId) {
        setSelectedCourse(null);
      }
    } catch (error) {
      setProfileError('Failed to unenroll from course. Please try again.');
    }
  };

  const updateProgress = async (courseId, progressValue) => {
    try {
      await API.post('/user/update-progress', { courseId, progressValue });
      fetchUserProfile();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleVideoEnd = useCallback(
    (index, courseId) => {
      if (!selectedCourse || !selectedCourse.videos) return;
      const totalVideos = selectedCourse.videos.length;
      const rawProgress = ((index + 1) / totalVideos) * 100;
      const newProgress = Math.floor(Math.min(rawProgress, 100)); 
      setProgress((prev) => {
        const updatedProgress = { ...prev, [courseId]: newProgress };
        updateProgress(courseId, newProgress);
        return updatedProgress;
      });
      if (index + 1 < totalVideos) {
        setSelectedVideoIndex(index + 1);
      }
    },
    [selectedCourse]
  );

  const getVideoId = (url) => {
    try {
      const urlObj = new URL(url);
      const searchParams = new URLSearchParams(urlObj.search);
      const pathname = urlObj.pathname.split('/').filter((segment) => segment !== '');

      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        if (searchParams.has('v')) {
          return searchParams.get('v');
        } else if (pathname.length === 1) {
          return pathname[0];
        } else if (pathname.length >= 2 && pathname[0] === 'embed') {
          return pathname[1];
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    if (!selectedCourse || !selectedCourse.videos || !selectedCourse.videos[selectedVideoIndex]) return;

    const initializePlayer = () => {
      const ref = videoRefs.current[0];
      if (ref) {
        const videoId = getVideoId(selectedCourse.videos[selectedVideoIndex]);
        if (!videoId || typeof window.YT === 'undefined') {
          setPlayerError('Invalid video URL or YouTube API not loaded.');
          return;
        }
        if (ref.player) ref.player.destroy();
        const player = new window.YT.Player(ref, {
          height: '315',
          width: '560',
          videoId,
          events: {
            onReady: (event) => event.target.playVideo(),
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                handleVideoEnd(selectedVideoIndex, selectedCourse._id);
              }
            },
            onError: () => setPlayerError('Failed to load video.'),
          },
          playerVars: { rel: 0, modestbranding: 1 },
        });
        ref.player = player;
      }
    };

    if (typeof window.YT !== 'undefined' && window.YT.loaded) {
      initializePlayer();
    } else {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      window.onYouTubeIframeAPIReady = initializePlayer;
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
        window.onYouTubeIframeAPIReady = null;
        const ref = videoRefs.current[0];
        if (ref && ref.player) ref.player.destroy();
      };
    }
  }, [selectedCourse, selectedVideoIndex, handleVideoEnd]);

  return (
    <div className="user-dashboard-container">
      <nav className="navbar">
        <h1>Study Sync Dashboard</h1>
        <div className="nav-links">
          <button
            className={`nav-btn ${activeSection === 'home' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCourse(null);
              setActiveSection('home');
            }}
          >
            Home
          </button>
          <button
            className={`nav-btn ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            Profile
          </button>
          <button
            className={`nav-btn ${activeSection === 'studyGroups' ? 'active' : ''}`}
            onClick={() => setActiveSection('studyGroups')}
          >
            Study Groups
          </button>
        </div>
      </nav>

      <header className="dashboard-header">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </header>

      {activeSection === 'home' && renderHome()}
      {activeSection === 'profile' && renderProfile()}
      {activeSection === 'studyGroups' && renderStudyGroups()}
    </div>
  );
}

export default UserDashboard;