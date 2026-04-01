import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import NotificationCenter from '../../components/NotificationCenter';

export default function DashboardLayout() {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;

    return (
        <div className="dashboard-container" style={{ display: 'flex' }}>
            <Sidebar />
            <div className="dashboard-content">
                <div className="dashboard-toolbar">
                    <NotificationCenter />
                </div>
                <Outlet />
            </div>
        </div>
    );
}
