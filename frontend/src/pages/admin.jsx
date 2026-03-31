import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

const AdminDashboard = () => {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingGroupId, setDeletingGroupId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [groupsData, usersData] = await Promise.all([
          api.getGroups(),
          api.getAdminUsers(),
        ]);

        setGroups(groupsData || []);
        setUsers(usersData.users || []);
      } catch (err) {
        setError(err.message || 'Failed to load admin data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) {
      return;
    }

    try {
      setDeletingGroupId(groupId);
      await api.deleteGroup(groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (err) {
      alert(err.message || 'Failed to delete group.');
    } finally {
      setDeletingGroupId(null);
    }
  };

  const activeUsers = users.filter((u) => u.is_active);
  const sortedUsers = [...users].sort((a, b) => {
    const aDate = a.created_at ? new Date(a.created_at) : 0;
    const bDate = b.created_at ? new Date(b.created_at) : 0;
    return bDate - aDate;
  });

  if (loading) {
    return (
      <div className="admin-container">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="error-card glass-panel">
          <h3>Admin Dashboard</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header glass-panel animate-fade-in">
        <div className="admin-header-main">
          <h1 className="admin-title">Admin Console</h1>
          <p className="admin-subtitle">
            Comprehensive oversight of platform groups and user activity.
          </p>
        </div>
        <div className="admin-header-actions">
          <button
            onClick={() => navigate('/creategroup')}
            className="btn-primary btn-glow"
          >
            + Create New Group
          </button>
        </div>
        <div className="admin-stats">
          <div className="admin-stat">
            <span className="admin-stat-label">Total Groups</span>
            <span className="admin-stat-value">{groups.length}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-label">Registered Users</span>
            <span className="admin-stat-value">{users.length}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-label">Active Now</span>
            <span className="admin-stat-value">{activeUsers.length}</span>
          </div>
        </div>
      </div>

      <div className="admin-grid">
        <section className="admin-section glass-panel animate-slide-up">
          <div className="admin-section-header">
            <h2>System Groups</h2>
            <p className="admin-section-subtitle">
              Manage all study groups across the platform.
            </p>
          </div>
          {groups.length === 0 ? (
            <p className="admin-empty">No groups have been created yet.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Subject</th>
                    <th>Created At</th>
                    <th>Created By</th>
                    <th>Members</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr key={group.id} className="hover-row">
                      <td className="font-medium">{group.name}</td>
                      <td>
                        <span className="badge-subject">{group.subject || 'General'}</span>
                      </td>
                      <td>
                        {group.created_at
                          ? new Date(group.created_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td>
                        <div className="admin-creator-info">
                          <span className="creator-name">{group.creator_name || 'System'}</span>
                          <span className="creator-email">{group.creator_email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="members-count">{group.members_count ?? 0}</span>
                      </td>
                      <td>
                        <div className="admin-action-btns">
                          <Link to={`/group/${group.id}`} className="btn-small secondary">
                            View
                          </Link>
                          <button
                            type="button"
                            className="btn-small danger"
                            onClick={() => handleDeleteGroup(group.id)}
                            disabled={deletingGroupId === group.id}
                          >
                            {deletingGroupId === group.id ? '...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-section glass-panel animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="admin-section-header">
            <h2>User Activity</h2>
            <p className="admin-section-subtitle">
              User registration trends and online status.
            </p>
          </div>

          <div className="admin-users-layout">
            <div className="admin-users-block">
              <h3 className="admin-block-title">Recently Registered</h3>
              {sortedUsers.length === 0 ? (
                <p className="admin-empty">No users found.</p>
              ) : (
                <ul className="admin-user-list">
                  {sortedUsers.slice(0, 10).map((user) => (
                    <li key={user.id} className="admin-user-item">
                      <div className="admin-user-main">
                        <span className="admin-user-name">
                          {user.name || `User #${user.id}`}
                        </span>
                        <span className="admin-user-email">{user.email}</span>
                        {user.groups_joined && user.groups_joined.length > 0 && (
                          <div className="admin-user-groups">
                            <span className="label">Groups:</span>
                            {user.groups_joined.map((gn, idx) => (
                              <span key={idx} className="user-group-tag">{gn}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="admin-user-meta text-right">
                        <span className={`admin-user-role ${user.role}`}>
                          {user.role}
                        </span>
                        {user.created_at && (
                          <span className="admin-user-date">
                            {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="admin-users-block">
              <h3 className="admin-block-title">Active Members</h3>
              {activeUsers.length === 0 ? (
                <p className="admin-empty">No users are active right now.</p>
              ) : (
                <ul className="admin-user-list">
                  {activeUsers.map((user) => (
                    <li key={user.id} className="admin-user-item">
                      <div className="admin-user-main">
                        <span className="admin-user-name">
                          {user.name || `User #${user.id}`}
                          <span className="status-indicator online"></span>
                        </span>
                        <span className="admin-user-email">{user.email}</span>
                        {user.groups_joined && user.groups_joined.length > 0 && (
                          <div className="admin-user-groups">
                            <span className="label">Groups:</span>
                            {user.groups_joined.map((gn, idx) => (
                              <span key={idx} className="user-group-tag">{gn}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="admin-user-meta text-right">
                        <span className={`admin-user-role ${user.role}`}>
                          {user.role}
                        </span>
                        {user.last_seen_at && (
                          <span className="admin-user-date">
                            {new Date(user.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
