import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiGrid, FiFilePlus, FiSearch, FiFolder, FiCalendar, FiShield, FiLogOut } from 'react-icons/fi';

const menuVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
};

export default function Sidebar() {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const role = user?.role || '';

    const isActive = (path) => location.pathname === path;

    const menuItems = [
        { icon: <FiGrid />, label: 'Dashboard', path: '/dashboard', show: true },
        { icon: <FiFilePlus />, label: 'Add Case', path: '/dashboard/file-case', show: ['CLIENT', 'ADMIN'].includes(role) },
        { icon: <FiFilePlus />, label: 'File New Case', path: '/dashboard/file-case', show: role === 'LAWYER' },
        { icon: <FiSearch />, label: 'Search Cases', path: '/dashboard/search', show: true },
        { icon: <FiFolder />, label: 'Manage Cases', path: '/dashboard/manage', show: true },
        { icon: <FiCalendar />, label: 'Hearings', path: '/dashboard/hearings', show: true },
        { icon: <FiShield />, label: 'Orders', path: '/dashboard/orders', show: true },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="dots-icon">•••</div>
            </div>
            <motion.ul
                className="sidebar-menu"
                variants={menuVariants}
                initial="hidden"
                animate="visible"
            >
                {menuItems.filter(i => i.show).map((item, i) => (
                    <motion.li
                        key={i}
                        variants={itemVariants}
                        className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <span className="menu-icon">{item.icon}</span>
                        {item.label}
                    </motion.li>
                ))}
                <motion.li
                    variants={itemVariants}
                    className="menu-item logout-menu"
                    onClick={() => { logoutUser(); navigate('/logout'); }}
                >
                    <span className="menu-icon"><FiLogOut /></span>
                    Logout
                </motion.li>
            </motion.ul>
        </aside>
    );
}
