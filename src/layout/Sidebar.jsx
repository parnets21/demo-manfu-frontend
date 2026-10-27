import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  MdDashboard, MdShoppingCart, MdInventory2, MdPrecisionManufacturing,
  MdStar, MdAssignment, MdLocalShipping, MdAssignmentReturn,
  MdAccountBalance, MdSync, MdTrendingUp, MdBarChart, MdBuild,
  MdQrCode2, MdTask, MdSettings, MdBusinessCenter, MdReceipt,
  MdChevronLeft, MdChevronRight, MdClose, MdAdminPanelSettings,
  MdExpandMore, MdExpandLess,
} from 'react-icons/md';
import { useAuth } from '../auth/AuthContext';
import { getNavForRole, ROLES } from '../auth/rbac';

const ICON_MAP = {
  MdDashboard, MdShoppingCart, MdInventory2, MdPrecisionManufacturing,
  MdStar, MdAssignment, MdLocalShipping, MdAssignmentReturn,
  MdAccountBalance, MdSync, MdTrendingUp, MdBarChart, MdBuild,
  MdQrCode2, MdTask, MdSettings, MdBusinessCenter, MdReceipt,
  MdAdminPanelSettings,
};

const ROLE_COLORS = {
  super_admin:        '#1e40af',
  management:         '#8e44ad',
  purchase_manager:   '#2980b9',
  production_manager: '#27ae60',
  dealer:             '#f39c12',
  corporate_client:   '#16a085',
};

function NavGroup({ item, showLabels, collapsed }) {
  const location = useLocation();
  const isAnyChildActive = item.children?.some(c => location.pathname.startsWith(c.path));
  const defaultOpen = isAnyChildActive;
  const [open, setOpen] = useState(defaultOpen);

  // Auto-open when navigating to a child route
  useEffect(() => {
    if (isAnyChildActive) setOpen(true);
  }, [isAnyChildActive]);
  const Icon = ICON_MAP[item.icon];

  if (collapsed && !showLabels) {
    return (
      <NavLink
        to={item.children[0].path}
        title={item.label}
        style={{ textDecoration: 'none' }}
        className={isAnyChildActive ? 'nav-link active nav-link-collapsed' : 'nav-link nav-link-collapsed'}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0 }}>
          {Icon && <Icon size={19} />}
        </span>
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 14px', border: 'none',
          background: isAnyChildActive ? '#fef2f2' : 'transparent',
          color: isAnyChildActive ? '#1e40af' : '#4a5568',
          fontSize: 13, fontWeight: isAnyChildActive ? 700 : 500,
          fontFamily: 'inherit', cursor: 'pointer', borderRadius: 8,
          margin: '1px 6px', width: 'calc(100% - 12px)',
          transition: 'background 0.15s, color 0.15s',
          borderLeft: isAnyChildActive ? '3px solid #1e40af' : '3px solid transparent',
        }}
        onMouseEnter={e => { if (!isAnyChildActive) { e.currentTarget.style.background = '#fdf0ef'; e.currentTarget.style.color = '#1e40af'; } }}
        onMouseLeave={e => { if (!isAnyChildActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4a5568'; } }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0 }}>
          {Icon && <Icon size={19} />}
        </span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
          {item.label}
        </span>
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {open ? <MdExpandLess size={17} /> : <MdExpandMore size={17} />}
        </span>
      </button>

      {open && (
        <div style={{ paddingLeft: 14, paddingBottom: 2 }}>
          {item.children.map(child => (
            <NavLink
              key={child.path}
              to={child.path}
              style={{ textDecoration: 'none' }}
              className={({ isActive }) =>
                ['nav-link', isActive ? 'active' : ''].filter(Boolean).join(' ')
              }
            >
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: 'currentColor', marginLeft: 7, marginRight: 3,
              }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {child.label}
              </span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, setCollapsed, sidebarOpen, setSidebarOpen, isMobile }) {
  const { user } = useAuth();
  const showLabels = !collapsed || isMobile;
  const sidebarWidth = isMobile ? 260 : collapsed ? 68 : 252;

  const navItems = user ? getNavForRole(user.role) : [];
  const roleColor = user ? (ROLE_COLORS[user.role] || '#1e40af') : '#1e40af';

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, height: '100vh',
      width: sidebarWidth,
      background: '#fff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex', flexDirection: 'column',
      zIndex: 200,
      overflow: 'hidden',
      transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1), transform 0.28s cubic-bezier(0.4,0,0.2,1)',
      transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
      boxShadow: isMobile && sidebarOpen ? '6px 0 32px rgba(0,0,0,0.18)' : '1px 0 0 #e2e8f0',
    }}>

      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', height: 64, minHeight: 64, maxHeight: 64,
        borderBottom: '1px solid #e2e8f0', flexShrink: 0,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: '#fff',
          border: '2px solid #f5c6c2', boxShadow: '0 2px 8px rgba(192,57,43,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, overflow: 'hidden',
        }}>
          <img src="/logo.svg" alt="Manufacturing ERP" style={{ width: 32, height: 32, objectFit: 'contain' }} />
        </div>
        {showLabels && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1c2833', whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>
              MANUFACTURING ERP
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#1e40af', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 2 }}>
              ERP Platform
            </div>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} style={{
            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
            color: '#718096', padding: 6, borderRadius: 7, display: 'flex',
          }}>
            <MdClose size={20} />
          </button>
        )}
      </div>

      {/* Role badge */}
      {showLabels && user && (
        <div style={{
          margin: '10px 12px 2px',
          padding: '7px 12px',
          background: roleColor + '12',
          border: `1px solid ${roleColor}30`,
          borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: roleColor, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: roleColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {ROLES[user.role]}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}
        className="scrollbar-none">
        {navItems.map((item, i) => {
          if (item.section) {
            return (
              <div key={i} style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '1.8px',
                textTransform: 'uppercase', color: '#a0aec0',
                padding: '14px 18px 5px', whiteSpace: 'nowrap', minHeight: 30,
                visibility: showLabels ? 'visible' : 'hidden',
              }}>
                {item.section}
              </div>
            );
          }

          if (item.children) {
            return (
              <NavGroup key={item.label} item={item} showLabels={showLabels} collapsed={collapsed && !isMobile} />
            );
          }

          const Icon = ICON_MAP[item.icon];
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              title={!showLabels ? item.label : undefined}
              style={{ textDecoration: 'none' }}
              className={({ isActive }) =>
                ['nav-link', !showLabels ? 'nav-link-collapsed' : '', isActive ? 'active' : ''].filter(Boolean).join(' ')
              }
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0 }}>
                {Icon && <Icon size={19} />}
              </span>
              {showLabels && (
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Admin shortcut */}
      {user?.role === 'super_admin' && showLabels && (
        <div style={{ flexShrink: 0, padding: '6px 10px 0', borderTop: '1px solid #f1f5f9' }}>
          <NavLink
            to="/settings/roles"
            style={{ textDecoration: 'none' }}
            className={({ isActive }) => ['nav-link', isActive ? 'active' : ''].filter(Boolean).join(' ')}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0 }}>
              <MdAdminPanelSettings size={19} />
            </span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
              Role Permissions
            </span>
          </NavLink>
        </div>
      )}

      {/* Collapse toggle */}
      {!isMobile && (
        <div style={{ flexShrink: 0, padding: 8, borderTop: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: collapsed ? 10 : '9px 12px', borderRadius: 8, border: 'none',
              background: 'transparent', color: '#718096', fontSize: 12, fontWeight: 500,
              fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fdf0ef'; e.currentTarget.style.color = '#1e40af'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#718096'; }}
          >
            <span style={{ flexShrink: 0 }}>{collapsed ? <MdChevronRight size={20} /> : <MdChevronLeft size={20} />}</span>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </aside>
  );
}
