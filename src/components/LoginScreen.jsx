import React, { useState } from 'react';
import { createProfile, loginProfile } from '../utils/firebaseStorage';
import { AVATAR_EMOJIS } from '../data/avatars';

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_EMOJIS[0]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDisplayNameChange = (val) => {
    setDisplayName(val);
    if (mode === 'create') {
      setUsername(val.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || !passcode.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const profile = await loginProfile(username, passcode);
      onLogin(profile);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError('');
    if (!displayName.trim() || !username.trim() || !passcode.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (passcode.length !== 4 || !/^\d{4}$/.test(passcode)) {
      setError('Passcode must be exactly 4 digits');
      return;
    }
    if (passcode !== confirmPasscode) {
      setError('Passcodes do not match');
      return;
    }
    setLoading(true);
    try {
      const profile = await createProfile(username, passcode, displayName, avatar);
      onLogin({ ...profile, avatar, watched: [], ratings: {}, playlistOrder: null, seed: null, currentIdx: 0, raters: [displayName.trim()] });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (mode === 'login') handleLogin();
      else handleCreate();
    }
  };

  return (
    <div className="login-screen">
      <div className="login-brand">
        <span className="login-brand-icon">🏆</span>
        <span className="login-brand-text">The Oscars Journey</span>
      </div>

      <h2>{mode === 'login' ? 'Welcome Back' : 'Create Profile'}</h2>
      <p className="login-subtitle">
        {mode === 'login'
          ? 'Log in to continue your Oscars journey'
          : 'Set up your profile to start tracking films'}
      </p>

      {error && <div className="login-error">{error}</div>}

      {mode === 'create' && (
        <>
          {/* Avatar picker — tap to expand */}
          <div className="login-field">
            <label>Your Avatar</label>
            <div className="login-avatar-selected" onClick={() => setShowAvatarPicker(p => !p)}>
              <span className="login-avatar-emoji">{avatar}</span>
              <span className="login-avatar-change">{showAvatarPicker ? 'Close' : 'Tap to change'}</span>
            </div>
            {showAvatarPicker && (
              <div className="login-avatar-grid">
                {AVATAR_EMOJIS.map((emoji, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`login-avatar-option ${avatar === emoji ? 'selected' : ''}`}
                    onClick={() => { setAvatar(emoji); setShowAvatarPicker(false); }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="login-field">
            <label>Display Name</label>
            <input
              type="text"
              name="oscars_display"
              autoComplete="off"
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Chris"
            />
          </div>
        </>
      )}

      <div className="login-field">
        <label>Username</label>
        <input
          type="text"
          name="oscars_user"
          autoComplete="off"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
          onKeyDown={handleKeyDown}
          placeholder="e.g. chris"
        />
      </div>

      <div className="login-field">
        <label>4-Digit Passcode</label>
        <input
          type="tel"
          name="oscars_pass"
          autoComplete="off"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={handleKeyDown}
          placeholder="••••"
          inputMode="numeric"
          maxLength={4}
          style={{ WebkitTextSecurity: 'disc' }}
        />
      </div>

      {mode === 'create' && (
        <div className="login-field">
          <label>Confirm Passcode</label>
          <input
            type="tel"
            name="oscars_confirm"
            autoComplete="off"
            value={confirmPasscode}
            onChange={(e) => setConfirmPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={handleKeyDown}
            placeholder="••••"
            inputMode="numeric"
            maxLength={4}
            style={{ WebkitTextSecurity: 'disc' }}
          />
        </div>
      )}

      <button
        className="login-btn"
        onClick={mode === 'login' ? handleLogin : handleCreate}
        disabled={loading}
      >
        {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Profile'}
      </button>

      <div className="login-toggle">
        {mode === 'login' ? (
          <>Don't have a profile? <a onClick={() => { setMode('create'); setError(''); }}>Create one</a></>
        ) : (
          <>Already have a profile? <a onClick={() => { setMode('login'); setError(''); }}>Log in</a></>
        )}
      </div>
    </div>
  );
}
