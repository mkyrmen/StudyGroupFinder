import { Link } from 'react-router-dom';

const GroupCard = ({ group }) => {
  return (
    <div className="group-card glass-panel">
      <div className="group-content">
        <h3 className="group-title">{group.name}</h3>
        <p className="group-description">{group.description}</p>

        <div className="group-details">
          <span className="detail-item">
            <span>📚</span> {group.subject || 'General'}
          </span>
          <span className="detail-item">
            <span>👤</span> {group.members_count || 1} members
          </span>
        </div>
      </div>

      <div className="group-footer">
        <Link to={`/group/${group.id}`} className="view-btn">
          View Details
        </Link>
      </div>

    </div>
  );
};

export default GroupCard;
