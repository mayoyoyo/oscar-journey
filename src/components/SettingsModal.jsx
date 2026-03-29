import React, { useState } from 'react';

export default function SettingsModal({ raters, onRatersChange, onClose, onReset, onClearCache }) {
  const [editRaters, setEditRaters] = useState(raters);
  const [newName, setNewName] = useState('');

  const addRater = () => {
    const name = newName.trim();
    if (!name || editRaters.some(r => r.toLowerCase() === name.toLowerCase())) return;
    const updated = [...editRaters, name];
    setEditRaters(updated);
    onRatersChange(updated);
    setNewName('');
  };

  const removeRater = (idx) => {
    if (editRaters.length <= 1) return; // keep at least one
    const updated = editRaters.filter((_, i) => i !== idx);
    setEditRaters(updated);
    onRatersChange(updated);
  };

  return (
    <div className="modal-overlay open" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal">
        <h2>Settings</h2>

        <div className="modal-section">
          <label>Raters</label>
          <p style={{ fontSize: '0.82rem', color: 'var(--cream-dim)', marginTop: '2px', marginBottom: '12px' }}>
            Add or remove people who rate films. Each person gets their own star rating on every film.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {editRaters.map((name, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '0.92rem',
                  color: 'var(--cream)',
                }}>
                  {name}
                </span>
                <button
                  onClick={() => removeRater(i)}
                  disabled={editRaters.length <= 1}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border)',
                    color: editRaters.length <= 1 ? 'var(--bg3)' : '#b05050',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    cursor: editRaters.length <= 1 ? 'default' : 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRater()}
                placeholder="Add a name..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--cream)',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={addRater}
                disabled={!newName.trim()}
                style={{
                  background: newName.trim() ? 'var(--gold)' : 'var(--bg3)',
                  color: newName.trim() ? '#fffaee' : 'var(--cream-dim)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontWeight: 'bold',
                  cursor: newName.trim() ? 'pointer' : 'default',
                  fontSize: '0.85rem',
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="modal-section">
          <label>Film Info & Posters</label>
          <p style={{ fontSize: '0.85rem', color: 'var(--cream-dim)', marginTop: '4px' }}>
            Posters, IMDb ratings, plot summaries, and director info load automatically.
          </p>
        </div>

        <div className="modal-section">
          <label style={{ marginBottom: '10px', display: 'block' }}>Danger Zone</label>
          <button className="btn-danger" onClick={onReset}>
            Reset Progress (start over)
          </button>
          {' '}
          <button className="btn-danger" onClick={onClearCache}>
            Clear Film Info Cache
          </button>
        </div>

        <div className="modal-btns">
          <button className="btn-modal-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
