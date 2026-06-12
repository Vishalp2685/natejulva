import React from 'react';
import { X, Heart } from 'lucide-react';
import { API_URL } from '../config';

export interface ProfileUser {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  age: number;
  gender: string;
}

export interface ProfileDetails {
  id: number;
  user: ProfileUser;
  height?: string | number;
  religion?: string;
  caste?: string;
  marital_status?: string;
  blood_group?: string;
  city?: string;
  hometown?: string;
  education?: string;
  occupation?: string;
  working_status?: string;
  annual_salary?: string;
  about_me?: string;
  family_type?: string;
  profile_photo?: string | null;
  liked_by_me?: boolean;
}

interface ProfilePreviewProps {
  profile: ProfileDetails | null;
  isOpen: boolean;
  onClose: () => void;
  // Connect/Like Action
  onConnect?: (userId: number, e?: React.MouseEvent) => void;
  isConnected?: boolean;
  isConnectLoading?: boolean;
  // Custom Actions
  customActions?: React.ReactNode;
}

export const ProfilePreview: React.FC<ProfilePreviewProps> = ({
  profile,
  isOpen,
  onClose,
  onConnect,
  isConnected = false,
  isConnectLoading = false,
  customActions,
}) => {
  const infoColumnRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && profile) {
      // Immediate scroll to top
      if (infoColumnRef.current) {
        infoColumnRef.current.scrollTop = 0;
      }
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);

      // Run scroll reset on a small timeout to override browser auto-focus/scroll restoration
      const timer = setTimeout(() => {
        if (infoColumnRef.current) {
          infoColumnRef.current.scrollTop = 0;
        }
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isOpen, profile]);

  if (!isOpen || !profile) return null;

  const fullName = `${profile.user.first_name} ${profile.user.last_name}`;

  // Helper to check if a field value is valid (non-empty/placeholder)
  const isValidValue = (val: any): boolean => {
    if (val === undefined || val === null) return false;
    const str = String(val).trim();
    return (
      str !== '' &&
      str !== '—' &&
      str.toLowerCase() !== 'not specified' &&
      str.toLowerCase() !== 'undefined'
    );
  };

  // Helper to format height nicely
  const formatHeight = (height: any): string | null => {
    if (!isValidValue(height)) return null;
    const str = String(height).trim();
    if (str.includes('cm') || str.includes("'")) return str;
    return `${str} cm`;
  };

  // Helper to format age
  const formatAge = (age: any): string | null => {
    if (!isValidValue(age)) return null;
    const str = String(age).trim();
    if (str.includes('yrs') || str.includes('years')) return str;
    return `${str} yrs`;
  };

  // Profile image URL resolver
  const getProfilePhoto = (photoUrl: string | null) => {
    if (!photoUrl) return '';
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }
    return `${API_URL}${photoUrl}`;
  };

  // Initials generator for fallback avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };



  // Compile Personal Information fields
  const personalFields = [
    { label: 'Age', value: formatAge(profile.user.age) },
    { label: 'Gender', value: isValidValue(profile.user.gender) ? profile.user.gender : null },
    { label: 'Height', value: formatHeight(profile.height) },
    { label: 'Religion', value: isValidValue(profile.religion) ? profile.religion : null },
    { label: 'Caste', value: isValidValue(profile.caste) ? profile.caste : null },
    { label: 'Marital Status', value: isValidValue(profile.marital_status) ? profile.marital_status : null },
    { label: 'Blood Group', value: isValidValue(profile.blood_group) ? profile.blood_group : null },
  ].filter(f => f.value !== null) as { label: string; value: string }[];

  // Compile Professional Information fields
  const professionalFields = [
    { label: 'Education', value: isValidValue(profile.education) ? profile.education : null },
    { label: 'Occupation', value: isValidValue(profile.occupation) ? profile.occupation : null },
    { label: 'Working Status', value: isValidValue(profile.working_status) ? profile.working_status : null },
    { label: 'Annual Salary', value: isValidValue(profile.annual_salary) ? profile.annual_salary : null },
  ].filter(f => f.value !== null) as { label: string; value: string }[];

  // Compile Location & Family fields
  const locationFamilyFields = [
    { label: 'Current City', value: isValidValue(profile.city) ? profile.city : null },
    { label: 'Hometown', value: isValidValue(profile.hometown) ? profile.hometown : null },
    { label: 'Family Type', value: isValidValue(profile.family_type) ? profile.family_type : null },
  ].filter(f => f.value !== null) as { label: string; value: string }[];

  const hasAboutMe = isValidValue(profile.about_me);

  return (
    <div className="profile-preview-overlay" onClick={onClose}>
      <div className="profile-preview-modal" onClick={e => e.stopPropagation()}>
        {/* Close Button */}
        <button
          className="profile-modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div ref={containerRef} className="profile-preview-container">
          {/* Right Column: Photo (First in HTML for correct mobile scroll stacking) */}
          <div className="profile-photo-column">
            {profile.profile_photo ? (
              <img
                src={getProfilePhoto(profile.profile_photo)}
                alt={fullName}
              />
            ) : (
              <div className="profile-fallback-avatar">
                {getInitials(profile.user.first_name, profile.user.last_name)}
              </div>
            )}
          </div>

          {/* Left Column: Details (Second in HTML) */}
          <div ref={infoColumnRef} className="profile-info-column hide-scrollbar">
            <div className="profile-verified-badge">Verified Member</div>
            <h2 className="profile-preview-name">{fullName}</h2>
            
            {/* Core overview subtitle */}
            <div className="profile-preview-subtitle">
              {[
                formatAge(profile.user.age),
                formatHeight(profile.height),
                profile.city || null
              ].filter(Boolean).join(' • ')}
            </div>

            {/* Render Cards in exact specified order */}
            
            {/* 1. Personal Information */}
            {personalFields.length > 0 && (
              <div className="profile-section-card">
                <h3 className="profile-section-card-title">Personal Information</h3>
                <div className="profile-section-card-grid">
                  {personalFields.map(field => (
                    <div key={field.label} className="profile-section-card-item">
                      <span className="profile-section-card-label">{field.label}</span>
                      <span className="profile-section-card-value">{field.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. About Me */}
            {hasAboutMe && (
              <div className="profile-section-card about-me-card">
                <h3 className="profile-section-card-title">About Me</h3>
                {isValidValue(profile.about_me) && (
                  <p className="profile-about-bio">{profile.about_me}</p>
                )}
              </div>
            )}

            {/* 3. Professional Information */}
            {professionalFields.length > 0 && (
              <div className="profile-section-card">
                <h3 className="profile-section-card-title">Professional Information</h3>
                <div className="profile-section-card-grid">
                  {professionalFields.map(field => (
                    <div key={field.label} className="profile-section-card-item">
                      <span className="profile-section-card-label">{field.label}</span>
                      <span className="profile-section-card-value">{field.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Location & Family */}
            {locationFamilyFields.length > 0 && (
              <div className="profile-section-card">
                <h3 className="profile-section-card-title">Location & Family</h3>
                <div className="profile-section-card-grid">
                  {locationFamilyFields.map(field => (
                    <div key={field.label} className="profile-section-card-item">
                      <span className="profile-section-card-label">{field.label}</span>
                      <span className="profile-section-card-value">{field.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Footer */}
            {customActions ? (
              <div className="profile-preview-actions-row">
                {customActions}
              </div>
            ) : (
              onConnect && (
                <div className="profile-preview-actions-row">
                  <button
                    type="button"
                    onClick={(e) => onConnect(profile.user.id, e)}
                    disabled={isConnectLoading || isConnected}
                    className="profile-preview-btn-connect"
                    style={{
                      flex: 1,
                      opacity: isConnected ? 0.7 : 1,
                      cursor: isConnected ? 'default' : 'pointer',
                    }}
                  >
                    <Heart size={16} fill={isConnected ? '#FFF' : 'none'} stroke="#FFF" />
                    {isConnectLoading ? 'Sending...' : isConnected ? 'Request Sent' : 'Connect Now'}
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
