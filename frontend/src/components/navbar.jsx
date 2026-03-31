import { Link, useNavigate } from 'react-router-dom';
import logo from '../../photos/adbulogo.png';

const Navbar = ({ isAuthenticated, onLogout, user }) => {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    onLogout();
    navigate('/');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="navbar glass-panel">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <img src={logo} alt="ADBU Logo" className="navbar-logo-img" />
          <span className="navbar-logo-text">
            StudyGroup<span className="text-secondary">Finder</span>
          </span>
        </Link>

        <div className="navbar-links">
          <Link to="/search-groups" className="nav-link">Search Groups</Link>

          {isAuthenticated ? (
            <>
              <Link to="/create-group" className="nav-link">Create Group</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              {isAdmin && (
                <Link to="/admin" className="nav-link">Admin</Link>
              )}
              <button onClick={handleLogoutClick} className="btn-logout secondary">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-btn">
                <button>Sign Up</button>
              </Link>
            </>
          )}
        </div>
      </div>

    </nav>
  );
};

export default Navbar;
