import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const CreateGroup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdGroup, setCreatedGroup] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      setError('You must be logged in to create a group.');
      setLoading(false);
      return;
    }
    const user = JSON.parse(savedUser);

    try {
      const data = await api.createGroup({
        ...formData,
        creator_id: user.id
      });
      setCreatedGroup(data.group);
    } catch (err) {
      setError(err.message || 'Failed to create group');
      console.error('Error creating group:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-container">
      <div className="create-card glass-panel">
        <div className="create-header">
          <h1 className="create-title">Create a Study Group</h1>
          <p className="create-subtitle">Start a new community and invite others to join</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {createdGroup ? (
          <div className="success-overlay">
            <div className="success-content">
              <div className="success-icon">🎉</div>
              <h2>Group Created!</h2>
              <p>Your group <strong>{createdGroup.name}</strong> is ready.</p>
              <div className="code-box">
                <span className="code-label">Invitation Code:</span>
                <span className="code-value">{createdGroup.invitation_code}</span>
              </div>
              <p className="code-tip">Share this code with your classmates so they can join!</p>
              <button
                className="btn-submit mt-4"
                onClick={() => navigate(`/group/${createdGroup.id}`)}
              >
                Go to Group Page
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="create-form">
            <div className="form-group">
              <label htmlFor="name">Group Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Intro to Psychology Study Group"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="subject">Subject / Course Code</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="e.g., PSY 101, Computer Science"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What is this group about? When do you usually meet?"
                rows="5"
                required
              ></textarea>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel secondary"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
};

export default CreateGroup;
