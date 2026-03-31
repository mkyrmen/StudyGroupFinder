import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../services/api';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [invitationCode, setInvitationCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!invitationCode.trim()) return;

    setJoining(true);
    setJoinError('');
    setJoinSuccess('');

    try {
      const response = await api.joinGroup({
        user_id: user.id,
        invitation_code: invitationCode.toUpperCase()
      });
      setJoinSuccess(`Successfully joined ${response.group.name}!`);
      setInvitationCode('');
      // Redirect to group details after a short delay
      setTimeout(() => navigate(`/group/${response.group.id}`), 1500);
    } catch (err) {
      setJoinError(err.message || 'Failed to join group. Check your code.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="hero-section text-center glass-panel">
        {user && (
          <div className="welcome-banner">
            <span className="wave-icon">👋</span>
            <h2>Welcome, {user.name}!</h2>
          </div>
        )}
        <h1 className="hero-title">
          Find Your Perfect <span className="text-gradient">Study Group</span>
        </h1>
        <p className="hero-subtitle">
          Connect with peers, share knowledge, and ace your classes together.
          Join hundreds of students already studying smarter.
        </p>

        <div className="hero-actions">
          <Link to="/search-groups">
            <button className="btn-large">Find a Group</button>
          </Link>
          <Link to="/create-group">
            <button className="btn-large secondary">Create Group</button>
          </Link>
        </div>
      </div>

      <div className="join-code-section glass-panel">
        <div className="join-code-content">
          <div className="join-code-info">
            <h3>Join with Invite Code</h3>
            <p>Have a special code from a classmate? Enter it here to join their group instantly.</p>
          </div>
          <form onSubmit={handleJoinByCode} className="join-code-form">
            <input
              type="text"
              placeholder="ENTER CODE"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              maxLength="10"
              className="code-input"
            />
            <button type="submit" disabled={joining || !invitationCode} className="btn-join-code">
              {joining ? 'Joining...' : 'Join Group'}
            </button>
          </form>
        </div>
        {joinError && <div className="join-message error">{joinError}</div>}
        {joinSuccess && <div className="join-message success">{joinSuccess}</div>}
      </div>

      <div className="features-section">
        <Link to="/search-groups" className="feature-link">
          <div className="feature-card glass-panel">
            <div className="feature-icon">🔍</div>
            <h3 className="feature-title">Smart Search</h3>
            <p className="feature-desc">Filter groups by subject, course number, or meeting times to find exactly what you need.</p>
            <div className="feature-action">Try Smart Search &rarr;</div>
          </div>
        </Link>

        <Link to="/profile" className="feature-link">
          <div className="feature-card glass-panel">
            <div className="feature-icon">🤝</div>
            <h3 className="feature-title">Your Groups & Peers</h3>
            <p className="feature-desc">See the groups you’ve joined and the classmates you collaborate with.</p>
            <div className="feature-action">View Your Groups &rarr;</div>
          </div>
        </Link>

        <Link to="/create-group" className="feature-link">
          <div className="feature-card glass-panel">
            <div className="feature-icon">🚀</div>
            <h3 className="feature-title">Achieve More</h3>
            <p className="feature-desc">Students in study groups consistently perform better and retain more information.</p>
            <div className="feature-action">Start a Group &rarr;</div>
          </div>
        </Link>
      </div>

    </div>
  );
};

export default Dashboard;
