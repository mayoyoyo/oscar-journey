import React, { useState } from 'react';
import { createProfile, loginProfile } from '../utils/firebaseStorage';

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'create'
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-generate username from display name
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
      const profile = await createProfile(username, passcode, displayName);
      // Reload full profile data after creation
      onLogin({ ...profile, watched: [], ratings: {}, playlistOrder: null, seed: null, currentIdx: 0, raters: [displayName.trim()] });
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
      <h2>{mode === 'login' ? 'Welcome Back' : 'Create Profile'}</h2>
      <p className="login-subtitle">
        {mode === 'login'
          ? 'Log in to continue your Oscar journey'
          : 'Set up your profile to start tracking films'}
      </p>

      {error && <div className="login-error">{error}</div>}

      {mode === 'create' && (
        <div className="login-field">
          <label>Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => handleDisplayNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Chris"
            autoFocus
          />
        </div>
      )}

      <div className="login-field">
        <label>Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
          onKeyDown={handleKeyDown}
          placeholder="e.g. chris"
          autoFocus={mode === 'login'}
        />
      </div>

      <div className="login-field">
        <label>4-Digit Passcode</label>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={handleKeyDown}
          placeholder="1234"
          inputMode="numeric"
          maxLength={4}
        />
      </div>

      {mode === 'create' && (
        <div className="login-field">
          <label>Confirm Passcode</label>
          <input
            type="password"
            value={confirmPasscode}
            onChange={(e) => setConfirmPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={handleKeyDown}
            placeholder="1234"
            inputMode="numeric"
            maxLength={4}
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
