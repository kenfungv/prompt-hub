import React, { useState, useEffect } from 'react';
import './TeamCollaborate.css';

const TeamCollaborate = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sharedPrompts, setSharedPrompts] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');

  // API Integration - Fetch team data
  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const [membersRes, promptsRes] = await Promise.all([
        fetch('/api/team/members'),
        fetch('/api/team/shared-prompts')
      ]);
      const membersData = await membersRes.json();
      const promptsData = await promptsRes.json();
      
      setTeamMembers(membersData.members || []);
      setSharedPrompts(promptsData.prompts || []);
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail) return;
    
    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail })
      });
      const result = await response.json();
      
      if (result.success) {
        alert('Invitation sent successfully!');
        setInviteEmail('');
        fetchTeamData();
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    try {
      const response = await fetch(`/api/team/members/${memberId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        fetchTeamData();
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleUpdatePermission = async (memberId, permission) => {
    try {
      const response = await fetch(`/api/team/members/${memberId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission })
      });
      const result = await response.json();
      
      if (result.success) {
        fetchTeamData();
      }
    } catch (error) {
      console.error('Failed to update permission:', error);
    }
  };

  const handleSharePrompt = async (promptId, memberIds) => {
    try {
      const response = await fetch('/api/team/share-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId, memberIds })
      });
      const result = await response.json();
      
      if (result.success) {
        alert('Prompt shared successfully!');
        fetchTeamData();
      }
    } catch (error) {
      console.error('Failed to share prompt:', error);
    }
  };

  return (
    <div className="team-collaborate">
      <header className="team-header">
        <h1>Team Collaboration</h1>
        <p>Manage your team members and collaborate on prompts</p>
      </header>

      <div className="team-tabs">
        <button
          className={activeTab === 'members' ? 'tab-active' : ''}
          onClick={() => setActiveTab('members')}
        >
          Team Members
        </button>
        <button
          className={activeTab === 'shared' ? 'tab-active' : ''}
          onClick={() => setActiveTab('shared')}
        >
          Shared Prompts
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <div className="team-content">
          {activeTab === 'members' && (
            <div className="members-section">
              <div className="invite-section">
                <h2>Invite Team Member</h2>
                <div className="invite-form">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="invite-input"
                  />
                  <button
                    onClick={handleInviteMember}
                    className="btn-invite"
                  >
                    Send Invite
                  </button>
                </div>
              </div>

              <div className="members-list">
                <h2>Current Members</h2>
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Permission</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr key={member.id}>
                        <td>{member.name}</td>
                        <td>{member.email}</td>
                        <td>{member.role}</td>
                        <td>
                          <select
                            value={member.permission}
                            onChange={(e) => handleUpdatePermission(member.id, e.target.value)}
                            disabled={member.role === 'owner'}
                          >
                            <option value="read">Read Only</option>
                            <option value="write">Read & Write</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          {member.role !== 'owner' && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="btn-remove"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'shared' && (
            <div className="shared-prompts-section">
              <h2>Shared Prompts</h2>
              <div className="shared-prompts-grid">
                {sharedPrompts.map((prompt) => (
                  <div key={prompt.id} className="shared-prompt-card">
                    <h3>{prompt.title}</h3>
                    <p className="prompt-description">{prompt.description}</p>
                    <div className="prompt-meta">
                      <span className="shared-by">Shared by: {prompt.sharedBy}</span>
                      <span className="shared-date">{new Date(prompt.sharedDate).toLocaleDateString()}</span>
                    </div>
                    <div className="shared-with">
                      <strong>Shared with:</strong>
                      <div className="member-badges">
                        {prompt.sharedWith.map((member) => (
                          <span key={member.id} className="member-badge">
                            {member.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="prompt-actions">
                      <button className="btn-view">View</button>
                      <button className="btn-edit">Edit</button>
                      <button className="btn-share">Share More</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamCollaborate;
