import React, { useEffect, useState } from 'react';
import API from '../api';
import '../AdminDashboard.css'; // Import CSS for styling

function AdminDashboard() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ _id: null, title: '', description: '', videos: '', thumbnail: '', duration: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchCourses = async () => {
    try {
      const res = await API.get('http://localhost:5000/api/admin/courses');
      setCourses(res.data);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    // Ensure all fields are treated as strings
    const title = form.title || '';
    const description = form.description || '';
    const videos = form.videos || '';
    const thumbnail = form.thumbnail || '';
    const duration = form.duration || '';

    if (!title.trim()) {
      newErrors.title = 'Title is required';
      isValid = false;
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
      isValid = false;
    }

    if (!videos.trim()) {
      newErrors.videos = 'At least one video URL is required';
      isValid = false;
    } else {
      const videoUrls = videos.split(',').map(url => url.trim()).filter(url => url !== '');
      if (videoUrls.some(url => !isValidUrl(url))) {
        newErrors.videos = 'Invalid video URL(s)';
        isValid = false;
      }
    }

    if (thumbnail && !isValidUrl(thumbnail)) {
      newErrors.thumbnail = 'Invalid thumbnail URL';
      isValid = false;
    }

    if (!duration.trim()) {
      newErrors.duration = 'Duration is required';
      isValid = false;
    } else if (!parseDuration(duration)) {
      newErrors.duration = 'Invalid duration format (e.g., 10h or 2h 30m)';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };

  const addCourse = async () => {
    if (validateForm()) {
      try {
        const numericDuration = parseDuration(form.duration);
        await API.post('http://localhost:5000/api/admin/courses/add', {
          ...form,
          duration: numericDuration,
          videos: form.videos.split(',').map(url => url.trim()).filter(url => url !== '')
        });
        resetForm();
        fetchCourses();
      } catch (error) {
        console.error("Error adding course:", error);
      }
    }
  };

  const updateCourse = async () => {
    if (validateForm()) {
      try {
        const numericDuration = parseDuration(form.duration);
        await API.put(`http://localhost:5000/api/admin/courses/${form._id}`, {
          ...form,
          duration: numericDuration,
          videos: form.videos.split(',').map(url => url.trim()).filter(url => url !== '')
        });
        resetForm();
        fetchCourses();
        setIsEditing(false);
      } catch (error) {
        console.error("Error updating course:", error);
      }
    }
  };

  const deleteCourse = async (id) => {
    try {
      await API.delete(`http://localhost:5000/api/admin/courses/${id}`);
      fetchCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prevForm => ({
      ...prevForm,
      [name]: value,
    }));
    // Clear the error for the changed field
    setErrors(prevErrors => ({ ...prevErrors, [name]: '' }));
  };

  const handleEdit = (course) => {
    setForm({
      _id: course._id,
      title: course.title || '',
      description: course.description || '',
      videos: course.videos ? course.videos.join(',') : '',
      thumbnail: course.thumbnail || '',
      duration: course.duration ? (typeof course.duration === 'number' ? `${course.duration}h` : course.duration) : '',
    });
    setIsEditing(true);
    setErrors({}); // Clear errors when editing
  };

  const resetForm = () => {
    setForm({ _id: null, title: '', description: '', videos: '', thumbnail: '', duration: '' });
    setIsEditing(false);
    setErrors({}); // Clear errors on reset
  };

  const parseDuration = (durationStr) => {
    if (!durationStr) return null;
    const hoursMatch = durationStr.match(/(\d+)\s*h/);
    const minutesMatch = durationStr.match(/(\d+)\s*m/);
    let totalHours = 0;

    if (hoursMatch) {
      totalHours += parseInt(hoursMatch[1], 10);
    }
    if (minutesMatch) {
      totalHours += parseInt(minutesMatch[1], 10) / 60;
    }
    return totalHours || null;
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return (
    <div className="admin-dashboard-container">
      <h2>Admin Dashboard</h2>

      <div className="add-course-section">
        <h3>{isEditing ? 'Edit Course' : 'Add New Course'}</h3>
        <div className="form-group">
          <input
            name="title"
            placeholder="Title"
            value={form.title}
            onChange={handleInputChange}
          />
          {errors.title && <p className="error-message">{errors.title}</p>}
        </div>
        <div className="form-group">
          <input
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleInputChange}
          />
          {errors.description && <p className="error-message">{errors.description}</p>}
        </div>
        <div className="form-group">
          <input
            name="videos"
            placeholder="Videos (comma separated)"
            value={form.videos}
            onChange={handleInputChange}
          />
          {errors.videos && <p className="error-message">{errors.videos}</p>}
        </div>
        <div className="form-group">
          <input
            name="thumbnail"
            placeholder="Thumbnail Image URL"
            value={form.thumbnail}
            onChange={handleInputChange}
          />
          {errors.thumbnail && <p className="error-message">{errors.thumbnail}</p>}
        </div>
        <div className="form-group">
          <input
            name="duration"
            placeholder="Duration (e.g., 10h or 2h 30m)"
            value={form.duration}
            onChange={handleInputChange}
          />
          {errors.duration && <p className="error-message">{errors.duration}</p>}
        </div>
        {isEditing ? (
          <div className="edit-actions">
            <button onClick={updateCourse}>Save Changes</button>
            <button className="cancel-button" onClick={resetForm}>Cancel</button>
          </div>
        ) : (
          <button onClick={addCourse}>Add Course</button>
        )}
      </div>

      <div className="courses-list-section">
        <h3>Course List</h3>
        <ul className="courses-grid">
          {courses.map((course) => (
            <li key={course._id} className="course-card">
              {course.thumbnail && (
                <div className="course-thumbnail">
                  <img src={course.thumbnail} alt={course.title} />
                </div>
              )}
              <div className="course-info">
                <strong>{course.title}</strong>
                <p>{course.description}</p>
                {course.duration && <p>Duration: {typeof course.duration === 'number' ? `${course.duration} hours` : course.duration}</p>}
              </div>
              <div className="admin-actions">
                <button onClick={() => handleEdit(course)}>Modify</button>
                <button className="delete-button" onClick={() => deleteCourse(course._id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default AdminDashboard;