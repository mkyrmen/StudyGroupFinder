import { useState, useEffect } from 'react';
import GroupCard from '../components/groupcard';
import { api } from '../services/api';

const SearchGroups = () => {
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await api.getGroups();
      setGroups(data);
    } catch (err) {
      setError('Failed to fetch groups. Please try again later.');
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter(group => {
    return (
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.subject && group.subject.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="search-container">
      <div className="search-header glass-panel">
        <h1 className="search-title">Find Study Groups</h1>
        <p className="search-subtitle">Discover groups that match your courses and interests</p>

        <div className="search-bar-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, subject, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="search-btn">
            🔍 Search
          </button>
        </div>
      </div>

      <div className="results-section">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading groups...</p>
          </div>
        ) : error ? (
          <div className="error-state glass-panel">
            <p>{error}</p>
            <button onClick={fetchGroups} className="mt-4">Try Again</button>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="empty-state glass-panel">
            <h3>No groups found</h3>
            <p className="text-muted">Try adjusting your search terms or create a new group!</p>
          </div>
        ) : (
          <div className="groups-grid">
            {filteredGroups.map(group => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default SearchGroups;
