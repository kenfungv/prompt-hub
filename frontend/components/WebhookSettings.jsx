import React, { useState, useEffect } from 'react';
import './WebhookSettings.css';

const WebhookSettings = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [],
    secret: '',
    active: true
  });
  const [testResults, setTestResults] = useState({});

  const availableEvents = [
    { id: 'prompt.created', label: 'Prompt Created' },
    { id: 'prompt.updated', label: 'Prompt Updated' },
    { id: 'prompt.deleted', label: 'Prompt Deleted' },
    { id: 'team.member.added', label: 'Team Member Added' },
    { id: 'team.member.removed', label: 'Team Member Removed' },
    { id: 'marketplace.purchase', label: 'Marketplace Purchase' },
    { id: 'api.limit.reached', label: 'API Limit Reached' }
  ];

  // API Integration - Fetch webhooks
  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/webhooks');
      const data = await response.json();
      setWebhooks(data.webhooks || []);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhook)
      });
      const result = await response.json();

      if (result.success) {
        alert('Webhook added successfully!');
        setShowAddModal(false);
        setNewWebhook({
          name: '',
          url: '',
          events: [],
          secret: '',
          active: true
        });
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Failed to add webhook:', error);
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  };

  const handleToggleWebhook = async (webhookId, active) => {
    try {
      const response = await fetch(`/api/webhooks/${webhookId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      });
      const result = await response.json();

      if (result.success) {
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Failed to toggle webhook:', error);
    }
  };

  const handleTestWebhook = async (webhookId) => {
    setTestResults({ ...testResults, [webhookId]: 'testing' });

    try {
      const response = await fetch(`/api/webhooks/${webhookId}/test`, {
        method: 'POST'
      });
      const result = await response.json();

      setTestResults({
        ...testResults,
        [webhookId]: result.success ? 'success' : 'failed'
      });

      setTimeout(() => {
        setTestResults({ ...testResults, [webhookId]: null });
      }, 3000);
    } catch (error) {
      console.error('Failed to test webhook:', error);
      setTestResults({ ...testResults, [webhookId]: 'failed' });
    }
  };

  const handleEventToggle = (eventId) => {
    const events = newWebhook.events.includes(eventId)
      ? newWebhook.events.filter(e => e !== eventId)
      : [...newWebhook.events, eventId];
    setNewWebhook({ ...newWebhook, events });
  };

  return (
    <div className="webhook-settings">
      <header className="webhook-header">
        <h1>Webhook Settings</h1>
        <p>Configure webhooks to receive real-time notifications</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-add-webhook"
        >
          + Add Webhook
        </button>
      </header>

      {loading ? (
        <div className="loading-spinner">Loading webhooks...</div>
      ) : (
        <div className="webhooks-list">
          {webhooks.length === 0 ? (
            <div className="empty-state">
              <p>No webhooks configured yet. Add your first webhook to get started.</p>
            </div>
          ) : (
            webhooks.map((webhook) => (
              <div key={webhook.id} className="webhook-card">
                <div className="webhook-header-row">
                  <div className="webhook-info">
                    <h3>{webhook.name}</h3>
                    <span className={`webhook-status ${webhook.active ? 'active' : 'inactive'}`}>
                      {webhook.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="webhook-actions">
                    <button
                      onClick={() => handleTestWebhook(webhook.id)}
                      className="btn-test"
                      disabled={testResults[webhook.id] === 'testing'}
                    >
                      {testResults[webhook.id] === 'testing' ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={() => handleToggleWebhook(webhook.id, !webhook.active)}
                      className="btn-toggle"
                    >
                      {webhook.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="btn-delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="webhook-details">
                  <div className="detail-row">
                    <strong>URL:</strong>
                    <code>{webhook.url}</code>
                  </div>
                  <div className="detail-row">
                    <strong>Events:</strong>
                    <div className="event-badges">
                      {webhook.events.map((event) => (
                        <span key={event} className="event-badge">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="detail-row">
                    <strong>Last Triggered:</strong>
                    <span>
                      {webhook.lastTriggered
                        ? new Date(webhook.lastTriggered).toLocaleString()
                        : 'Never'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <strong>Success Rate:</strong>
                    <span>{webhook.successRate || 0}%</span>
                  </div>
                </div>

                {testResults[webhook.id] && testResults[webhook.id] !== 'testing' && (
                  <div className={`test-result ${testResults[webhook.id]}`}>
                    {testResults[webhook.id] === 'success'
                      ? '✓ Test successful!'
                      : '✗ Test failed'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {showAddModal && (
        <div className="webhook-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Webhook</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Webhook Name *</label>
                <input
                  type="text"
                  placeholder="My Webhook"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Payload URL *</label>
                <input
                  type="url"
                  placeholder="https://example.com/webhook"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Secret (Optional)</label>
                <input
                  type="password"
                  placeholder="Webhook secret for verification"
                  value={newWebhook.secret}
                  onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Events to Subscribe</label>
                <div className="events-checklist">
                  {availableEvents.map((event) => (
                    <label key={event.id} className="event-checkbox">
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event.id)}
                        onChange={() => handleEventToggle(event.id)}
                      />
                      {event.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWebhook}
                className="btn-submit"
              >
                Add Webhook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookSettings;
