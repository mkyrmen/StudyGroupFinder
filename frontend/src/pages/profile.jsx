import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import GroupCard from '../components/groupcard';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({
    created_groups: [],
    joined_groups: []
  });
  const [loading, setLoading] = useState(true);
  const [setError] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      fetchProfile(userData.id);
    }
  }, []);

  const fetchProfile = async (userId) => {
    try {
      setLoading(true);
      const data = await api.getUserProfile(userId);
      setProfileData(data);
    } catch (err) {
      setError('Failed to load profile data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return <div className="error-state">Please log in to view your profile.</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header glass-panel">
        <div className="avatar">{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
        <div className="user-info">
          <h2 className="user-name">{user.name}</h2>
          <p className="user-email">{user.email}</p>
        </div>
        <button className="btn-edit secondary">Edit Profile</button>
      </div>

      <div className="profile-content">
        <div className="my-groups-section">
          <div className="groups-container glass-panel">
            <h3 className="section-title">Groups I've Created</h3>
            {!profileData.created_groups || profileData.created_groups.length === 0 ? (
              <div className="empty-mini">
                <p>You haven't created any groups yet.</p>
                <Link to="/create-group" className="text-primary">Create one now</Link>
              </div>
            ) : (
              <div className="groups-grid-mini">
                {profileData.created_groups.map(group => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            )}
          </div>

          <div className="groups-container glass-panel mt-4">
            <h3 className="section-title">Groups I've Joined</h3>
            {!profileData.joined_groups || profileData.joined_groups.length === 0 ? (
              <div className="empty-mini">
                <p>You haven't joined any other groups yet.</p>
                <Link to="/search-groups" className="text-primary">Search for groups</Link>
              </div>
            ) : (
              <div className="groups-grid-mini">
                {profileData.joined_groups.map(group => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-stats">
          <div className="stats-panel glass-panel">
            <h3 className="section-title">Activity Stats</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{profileData.joined_groups?.length || 0}</span>
                <span className="stat-label">Groups Joined</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{profileData.created_groups?.length || 0}</span>
                <span className="stat-label">Groups Created</span>
              </div>
            </div>
          </div>

          <div className="achievements-panel glass-panel mt-4">
            <h3 className="section-title">Achievements</h3>
            <div className="achievement-list">
              <div className="achievement-item locked">
                <span className="ach-icon">🏆</span>
                <div className="ach-info">
                  <p className="ach-name">Top Contributor</p>
                  <p className="ach-desc">Post 50 messages in discussions</p>
                </div>
              </div>
              <div className="achievement-item locked">
                <span className="ach-icon">📚</span>
                <div className="ach-info">
                  <p className="ach-name">Studious</p>
                  <p className="ach-desc">Join 3 study groups</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Profile;
