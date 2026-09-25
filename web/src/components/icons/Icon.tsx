import React from 'react';

type IconName =
  | 'dashboard'
  | 'calendar_month'
  | 'event_available'
  | 'category'
  | 'contacts'
  | 'hub'
  | 'settings'
  | 'chevron_right'
  | 'close'
  | 'person'
  | 'bolt'
  | 'payments'
  | 'auto_awesome'
  | 'auto_fix_high'
  | 'mail'
  | 'link'
  | 'info'
  | 'arrow_back'
  | 'search'
  | 'notifications'
  | 'add'
  | 'expand_more'
  | 'videocam'
  | 'dashboard_customize';

export default function Icon({
  name,
  className,
  size = 20,
  fill = false,
}: {
  name: IconName;
  className?: string;
  size?: number;
  fill?: boolean;
}) {
  const commonProps = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', className };

  // Material Symbols Fallback for new icons
  const materialIcons: Partial<Record<IconName, string>> = {
    bolt: 'bolt',
    payments: 'payments',
    auto_awesome: 'auto_awesome',
    auto_fix_high: 'auto_fix_high',
    mail: 'mail',
    link: 'link',
    info: 'info',
    arrow_back: 'arrow_back',
    search: 'search',
    notifications: 'notifications',
    add: 'add',
    expand_more: 'expand_more',
    videocam: 'videocam',
    dashboard_customize: 'dashboard_customize',
  };

  if (materialIcons[name]) {
    return (
      <span
        className={`material-symbols-outlined ${className || ''}`}
        style={{
          fontSize: size,
          fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        }}
      >
        {materialIcons[name]}
      </span>
    );
  }

  switch (name) {
    case 'dashboard':
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="8" height="8" fill="currentColor" rx="1" />
          <rect x="13" y="3" width="8" height="4" fill="currentColor" rx="1" />
          <rect x="13" y="9" width="8" height="11" fill="currentColor" rx="1" />
        </svg>
      );
    case 'calendar_month':
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="16" stroke="currentColor" strokeWidth="1.5" rx="2" />
          <path d="M16 3v4M8 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'event_available':
      return (
        <svg {...commonProps}>
          <rect x="3" y="4" width="18" height="16" stroke="currentColor" strokeWidth="1.5" rx="2" />
          <path d="M9 12l2 2 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'category':
      return (
        <svg {...commonProps}>
          <path d="M4 7h7v13H4zM13 4h7v16h-7z" fill="currentColor" />
        </svg>
      );
    case 'contacts':
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 20c1.5-4 6-6 12-6s10.5 2 12 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'hub':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.8 2.8M14.7 14.7l2.8 2.8M6.5 17.5l2.8-2.8M14.7 9.3l2.8-2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...commonProps}>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" stroke="currentColor" strokeWidth="1.4" />
          <path d="M19.4 15a7.7 7.7 0 0 0 0-6l2.1-1.6-2-3.4-2.6.8a7.7 7.7 0 0 0-3.2-1.8L12 1H9.9L9 3.1A7.7 7.7 0 0 0 5.8 4.8L3.2 4 1 7.4l2.1 1.6a7.7 7.7 0 0 0 0 6L1 17.6 3.2 21l2.6-.8a7.7 7.7 0 0 0 3.2 1.8L9.9 23H12l.9-2.1a7.7 7.7 0 0 0 3.2-1.8l2.6.8L23 17.6 20.9 16a7.7 7.7 0 0 0-.2-1z" stroke="currentColor" strokeWidth="0.6" fill="none" />
        </svg>
      );
    case 'chevron_right':
      return (
        <svg {...commonProps}>
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    case 'close':
      return (
        <svg {...commonProps}>
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    case 'person':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4 20c1.8-4.2 7-6 12-6s10.2 1.8 12 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    default:
      return <svg {...commonProps} />;
  }
}
