import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Components
import Navbar from './components/navbar';
import ProtectedRoute from './components/protectedroute';

// Pages
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import Register from './pages/register';
import Profile from './pages/profile';
import SearchGroups from './pages/searchgroups';
import CreateGroup from './pages/creategroup';
import GroupDetails from './pages/groupdetails';
import AdminDashboard from './pages/admin';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
            setIsAuthenticated(true);
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                // Corrupted user data, clear it
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const handleLogin = (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setIsAuthenticated(true);
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <Router>
            <div className="app">
                <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} user={user} />
                <main className="container">
                    <Routes>
                        <Route
                            path="/"
                            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
                        />
                        <Route
                            path="/dashboard"
                            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
                        />
                        <Route
                            path="/search-groups"
                            element={isAuthenticated ? <SearchGroups /> : <Navigate to="/login" />}
                        />
                        <Route
                            path="/group/:id"
                            element={isAuthenticated ? <GroupDetails /> : <Navigate to="/login" />}
                        />

                        {/* Auth Routes */}
                        <Route
                            path="/login"
                            element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />}
                        />
                        <Route
                            path="/register"
                            element={!isAuthenticated ? <Register /> : <Navigate to="/" />}
                        />

                        {/* Protected Routes */}
                        <Route
                            path="/profile"
                            element={
                                <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
                                    <Profile />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/create-group"
                            element={
                                <ProtectedRoute isAuthenticated={isAuthenticated} user={user}>
                                    <CreateGroup />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute
                                    isAuthenticated={isAuthenticated}
                                    user={user}
                                    requiredRole="admin"
                                >
                                    <AdminDashboard />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
