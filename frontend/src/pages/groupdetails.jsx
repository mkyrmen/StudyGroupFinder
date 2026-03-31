import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';

const GroupDetails = () => {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [user, setUser] = useState(null);
  const [joining, setJoining] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [meetings, setMeetings] = useState([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingTime, setMeetingTime] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    fetchGroupDetails();
  }, [id]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getGroup(id);
      setGroup(data);
      setMessages(data.messages || []);
      setMeetings(data.meetings || []);

      // Check if current user is a member
      const savedUser = localStorage.getItem('user');
      if (savedUser && data.members) {
        const currentUser = JSON.parse(savedUser);
        const isUserInGroup = data.members.some(m => m.id === currentUser.id);
        setIsMember(isUserInGroup);
      }
    } catch (err) {
      setError('Failed to load group details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLeave = async () => {
    if (!user) return;

    setJoining(true);
    try {
      if (!isMember) {
        await api.joinGroup({
          user_id: user.id,
          invitation_code: group.invitation_code
        });
        setIsMember(true);
        fetchGroupDetails(); // Refresh to update member list
      } else {
        // Leave logic not implemented in backend yet, but we toggle for UI
        // In a real app: await api.leaveGroup(id, user.id);
        setIsMember(false);
      }
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setJoining(false);
    }
  };

  const handlePostMessage = async () => {
    if (!user || !newMessage.trim()) return;
    try {
      const res = await api.createGroupMessage(group.id, {
        user_id: user.id,
        content: newMessage.trim(),
      });
      setMessages((prev) => [...prev, res.message]);
      setNewMessage('');
    } catch (err) {
      alert(err.message || 'Failed to post message');
    }
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!user || !meetingTitle.trim() || !meetingTime.trim()) return;

    try {
      const res = await api.createGroupMeeting(group.id, {
        user_id: user.id,
        title: meetingTitle.trim(),
        scheduled_for: meetingTime.trim(),
      });
      setMeetings((prev) => [...prev, res.meeting]);
      setMeetingTitle('');
      setMeetingTime('');
      setShowMeetingForm(false);
    } catch (err) {
      alert(err.message || 'Failed to schedule meeting');
    }
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="spinner"></div>
        <p>Loading group details...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="state-container">
        <div className="error-card glass-panel">
          <h3>Oops!</h3>
          <p>{error || 'Group not found'}</p>
          <Link to="/search-groups" className="btn-back mt-4">Back to Search</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="group-details-container">
      <Link to="/search-groups" className="back-link">
        &larr; Back to Groups
      </Link>

      <div className="details-layout">
        <div className="main-content">
          <div className="group-header glass-panel">
            <div className="header-top">
              <span className="subject-tag">{group.subject || 'General'}</span>
              <span className="member-count">
                <span>👤</span> {group.members_count || 1} members
              </span>
            </div>

            <h1 className="group-title">{group.name}</h1>

            <div className="group-meta">
              <p><strong>Invite Code:</strong> <span className="code-text">{group.invitation_code}</span></p>
              <p><strong>Organizer ID:</strong> {group.creator_id}</p>
            </div>

            <div className="action-buttons">
              <button
                onClick={handleJoinLeave}
                className={isMember ? "btn-leave danger" : "btn-join"}
              >
                {isMember ? 'Leave Group' : 'Join Group'}
              </button>
              {isMember && (
                <button className="btn-share secondary">Share Resources</button>
              )}
            </div>
          </div>

          <div className="group-description panel glass-panel mt-4">
            <h2>About this Group</h2>
            <div className="description-content">
              {group.description.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>

          {isMember && (
            <div className="discussion-board panel glass-panel mt-4">
              <h2>Discussion Board</h2>
              <div className="discussion-messages">
                {messages.length === 0 ? (
                  <p className="text-muted">No discussions yet. Start a conversation!</p>
                ) : (
                  <ul className="messages-list">
                    {messages.map((m) => (
                      <li key={m.id} className="message-item">
                        <div className="message-header">
                          <span className="author-name">
                            {m.author?.name || 'Member'}
                          </span>
                          {m.created_at && (
                            <span className="timestamp">
                              {new Date(m.created_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="message-content">{m.content}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="new-post-box mt-4">
                <textarea
                  placeholder="Write a message..."
                  rows="3"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                ></textarea>
                <button
                  className="btn-post mt-2"
                  onClick={handlePostMessage}
                  disabled={!newMessage.trim()}
                >
                  Post Message
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="sidebar">
          <div className="members-panel glass-panel">
            <h3>Members ({group.members?.length || 0})</h3>
            <ul className="members-list">
              {group.members && group.members.map(member => (
                <li key={member.id} className="member-item">
                  <div className="member-avatar">
                    {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="member-info">
                    <p className="member-name">
                      {member.name} {member.id === group.creator_id ? '(Organizer)' : ''}
                    </p>
                    <p className="member-role">
                      {member.id === group.creator_id ? 'Admin' : 'Member'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="upcoming-meetings glass-panel mt-4">
            <h3>Upcoming Meetings</h3>
            {meetings.length === 0 ? (
              <div className="empty-state">
                <p className="text-muted">No meetings scheduled.</p>
                {isMember && (
                  <button
                    className="btn-small secondary mt-2"
                    onClick={() => setShowMeetingForm(true)}
                  >
                    Schedule
                  </button>
                )}
              </div>
            ) : (
              <ul className="meetings-list">
                {meetings.map((mt) => (
                  <li key={mt.id} className="meeting-item">
                    <div className="meeting-title">{mt.title}</div>
                    <div className="meeting-meta">
                      <span>{mt.scheduled_for}</span>
                      {mt.created_by_name && (
                        <span className="creator">
                          • by {mt.created_by_name}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {isMember && showMeetingForm && (
              <form className="mt-3" onSubmit={handleScheduleMeeting}>
                <input
                  type="text"
                  placeholder="Meeting title"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="meeting-input"
                />
                <input
                  type="datetime-local"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="meeting-input mt-2"
                />
                <button
                  type="submit"
                  className="btn-small secondary mt-2"
                  disabled={!meetingTitle.trim() || !meetingTime.trim()}
                >
                  Save
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default GroupDetails;
