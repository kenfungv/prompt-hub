import React from 'react';

const UserProfile = ({ googleId, displayName, email, avatar }) => {
  return (
    <div className="user-profile">
      <div className="user-avatar">
        {avatar ? (
          <img src={avatar} alt={displayName} />
        ) : (
          <div className="default-avatar">{displayName?.charAt(0)}</div>
        )}
      </div>
      <div className="user-info">
        <h2 className="user-name">{displayName}</h2>
        <p className="user-email">{email}</p>
        <p className="user-id">Google ID: {googleId}</p>
      </div>
    </div>
  );
};

export default UserProfile;
