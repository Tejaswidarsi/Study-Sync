import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../index.css";

const Register = () => {
    const navigate = useNavigate(); 
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        branch: '',
        yearOfStudy: '',
        expertise: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [responseMessage, setResponseMessage] = useState(null);
    const [responseStatus, setResponseStatus] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevFormData => ({
            ...prevFormData,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setResponseMessage(null);
        setResponseStatus(null);

        try {
            const response = await fetch('http://localhost:5000/api/auth/register', { // Make sure this matches your server
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            console.log('Full API Response:', response);

            if (!response.ok) {
                console.error(`HTTP error! Status: ${response.status}`);
                setResponseStatus('error');
                let errorMessage = 'An error occurred. Please try again.';
                try {
                    const errorData = await response.json();
                    console.error('Error details:', errorData);
                    errorMessage = errorData.message || errorMessage;
                    setResponseMessage(errorMessage);
                } catch (jsonError) {
                    console.error("Error parsing error response", jsonError);
                    setResponseMessage(errorMessage);
                    errorMessage = "Network error or invalid server response";
                }
                setResponseMessage(errorMessage);
                return;
            }

            const responseData = await response.json();
            console.log('Parsed Response Data:', responseData);
            setResponseStatus('success');
            setResponseMessage(responseData.message || 'Registered successfully!');
            setFormData({ name: '', email: '', password: '', branch: '',yearOfStudy: '' });
            alert('Successfully Registered');
            navigate('/login'); 

        } catch (error) {
            console.error('Error during API request:', error);
            setResponseStatus('error');
            setResponseMessage('Failed to register. Please check your network connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <h1 className="register-title">Register</h1>

                <form onSubmit={handleSubmit} className="register-form">
                    <InputField label="Name" id="name" value={formData.name} onChange={handleChange} required />
                    <InputField label="Email" id="email" type="email" value={formData.email} onChange={handleChange} required />
                    <InputField label="Password" id="password" type="password" value={formData.password} onChange={handleChange} required />

                    <SelectField label="Branch" id="branch" value={formData.branch} onChange={handleChange} options={[
                        { value: '', text: 'Select a branch' },
                        { value: 'CSE', text: 'Computer Science and Engineering' },
                        { value: 'ECE', text: 'Electronics and Communication Engineering' },
                        { value: 'EEE', text: 'Electrical and Electronics Engineering' },
                        { value: 'MECH', text: 'Mechanical Engineering' },
                        { value: 'CIVIL', text: 'Civil Engineering' }
                    ]} />

                    <SelectField label="Year of Study" id="yearOfStudy" value={formData.yearOfStudy} onChange={handleChange} options={[
                        { value: '', text: 'Select year' },
                        { value: '1', text: '1st Year' },
                        { value: '2', text: '2nd Year' },
                        { value: '3', text: '3rd Year' },
                        { value: '4', text: '4th Year' }
                    ]} />

                    <InputField label="Area of Expertise" id="expertise" value={formData.expertise} onChange={handleChange} placeholder="e.g. AI, Web Development" />

                    <button type="submit" className="register-button" disabled={isLoading}>
                        {isLoading ? 'Registering...' : 'Register'}
                    </button>

                    {responseMessage && (
                        <div className={`response-message ${responseStatus}`}>
                            {responseMessage}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );

}
// Reusable Input Field component
const InputField = ({ label, id, value, onChange, required = false, type = 'text', placeholder }) => (
    <div className="form-group">
        <label htmlFor={id} className="form-label">{label}</label>
        <input
            type={type}
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className="form-input"
        />
    </div>
);

// Reusable Select Field component
const SelectField = ({ label, id, value, onChange, options }) => (
    <div className="form-group">
        <label htmlFor={id} className="form-label">{label}</label>
        <select
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            className="form-select"
        >
            {options.map((opt, idx) => (
                <option key={idx} value={opt.value}>{opt.text}</option>
            ))}
        </select>
    </div>
);
export default Register;