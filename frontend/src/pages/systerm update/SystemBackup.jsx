import React, { useState, useEffect } from 'react';

// Use Vite environment variable with a safe fallback
const BACKEND_BASE = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, '');
const API_BASE = `${BACKEND_BASE}/api/backup`;

export default function SystemBackup() {
    const [backups, setBackups] = useState([]);
    const [storagePath, setStoragePath] = useState('D:\\Athukorala\\Backup');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });

    const showAlert = (message, type = 'info') => {
        setAlert({ show: true, message, type });
        setTimeout(() => {
            setAlert({ show: false, message: '', type: '' });
        }, 6000);
    };

    // 1. Fetch all local backups
    const loadBackups = async () => {
        try {
            setFetching(true);
            const res = await fetch(`${API_BASE}/list`);
            const data = await res.json();

            if (data.success) {
                setBackups(data.backups || []);
                if (data.storagePath) setStoragePath(data.storagePath);
                if (data.isRunning) setLoading(true);
            } else {
                showAlert(data.message || 'Failed to read local backup directory.', 'error');
            }
        } catch (err) {
            showAlert(`Unable to reach backend at ${API_BASE}. Check if server is running.`, 'error');
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        loadBackups();
    }, []);

    // 2. Trigger Manual Backup
    const handleTriggerBackup = async () => {
        if (loading) return;

        setLoading(true);
        showAlert('Manual backup initiated. Exporting database...', 'info');

        try {
            const res = await fetch(`${API_BASE}/trigger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();

            if (data.success) {
                showAlert('Backup finished successfully and saved locally!', 'success');
                await loadBackups();
            } else {
                showAlert(data.message || 'Backup script encountered an error.', 'error');
            }
        } catch (err) {
            showAlert('Network error while running backup.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredBackups = backups.filter((b) =>
        (b.filename || b.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={styles.container}>
            {/* Header Section */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>System Backup Management</h1>
                    <p style={styles.subtitle}>
                        Manage automated snapshots and trigger manual local database dumps.
                    </p>
                </div>
                <button
                    onClick={handleTriggerBackup}
                    disabled={loading}
                    style={{
                        ...styles.buttonPrimary,
                        ...(loading ? styles.buttonDisabled : {}),
                    }}
                >
                    {loading ? (
                        <span style={styles.flexCenter}>
                            <span style={styles.spinner}></span> Creating Backup...
                        </span>
                    ) : (
                        '⚡ Run Manual Backup Now'
                    )}
                </button>
            </div>

            {/* Notification Banner */}
            {alert.show && (
                <div
                    style={{
                        ...styles.alertBanner,
                        ...(alert.type === 'error'
                            ? styles.alertError
                            : alert.type === 'success'
                                ? styles.alertSuccess
                                : styles.alertInfo),
                    }}
                >
                    <span>{alert.message}</span>
                    <button
                        onClick={() => setAlert({ show: false, message: '', type: '' })}
                        style={styles.closeAlertBtn}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Status Overview Cards */}
            <div style={styles.cardGrid}>
                <div style={styles.infoCard}>
                    <span style={styles.cardLabel}>Local Storage Directory</span>
                    <code style={styles.cardValueCode}>{storagePath}</code>
                </div>
                <div style={styles.infoCard}>
                    <span style={styles.cardLabel}>Total Backups Available</span>
                    <span style={styles.cardValue}>{backups.length} archives</span>
                </div>
                <div style={styles.infoCard}>
                    <span style={styles.cardLabel}>Engine State</span>
                    <span
                        style={{
                            ...styles.cardValue,
                            color: loading ? '#d97706' : '#16a34a',
                        }}
                    >
                        {loading ? '● Backup in Progress' : '● System Ready'}
                    </span>
                </div>
            </div>

            {/* Backup Records Table Area */}
            <div style={styles.tableCard}>
                <div style={styles.tableHeaderBar}>
                    <h3 style={styles.tableHeading}>Local Archive History</h3>
                    <div style={styles.searchWrapper}>
                        <input
                            type="text"
                            placeholder="Search backups..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={styles.searchInput}
                        />
                        <button onClick={loadBackups} style={styles.refreshButton} title="Refresh list">
                            ↻
                        </button>
                    </div>
                </div>

                <div style={styles.tableResponsive}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeaderRow}>
                                <th style={styles.th}>File / Folder Name</th>
                                <th style={styles.th}>Creation Date</th>
                                <th style={styles.th}>Archive Size</th>
                                <th style={styles.th}>Type</th>
                                <th style={{ ...styles.th, textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fetching ? (
                                <tr>
                                    <td colSpan="5" style={styles.emptyCell}>
                                        Scanning local backup folder...
                                    </td>
                                </tr>
                            ) : filteredBackups.length > 0 ? (
                                filteredBackups.map((item, index) => {
                                    const displayName = item.filename || item.name;
                                    const isAuto = displayName.includes('auto') || !displayName.includes('manual');
                                    const dateStr = item.createdAt
                                        ? new Date(item.createdAt).toLocaleString()
                                        : 'N/A';

                                    return (
                                        <tr
                                            key={displayName + index}
                                            style={{
                                                ...styles.tableRow,
                                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                                            }}
                                        >
                                            <td style={styles.td}>
                                                <span style={styles.fileIcon}>🗄️</span>
                                                <strong>{displayName}</strong>
                                            </td>
                                            <td style={styles.td}>{dateStr}</td>
                                            <td style={styles.td}>
                                                <span style={styles.badge}>{item.sizeFormatted || 'Unknown'}</span>
                                            </td>
                                            <td style={styles.td}>
                                                <span
                                                    style={{
                                                        ...styles.typeBadge,
                                                        backgroundColor: isAuto ? '#e0f2fe' : '#fef3c7',
                                                        color: isAuto ? '#0369a1' : '#b45309',
                                                    }}
                                                >
                                                    {isAuto ? 'Scheduled' : 'Manual'}
                                                </span>
                                            </td>
                                            <td style={{ ...styles.td, textAlign: 'right' }}>
                                                <a
                                                    href={`${API_BASE}/download/${encodeURIComponent(displayName)}`}
                                                    download
                                                    style={styles.downloadLink}
                                                >
                                                    ⬇ Download
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" style={styles.emptyCell}>
                                        {searchQuery
                                            ? 'No backup files match your query.'
                                            : 'No backup records found in local directory.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ---------------- Inline CSS Styling ----------------
const styles = {
    container: {
        padding: '32px 24px',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
        color: '#1f2937',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
    },
    title: {
        fontSize: '26px',
        fontWeight: '700',
        margin: '0 0 6px 0',
        color: '#111827',
    },
    subtitle: {
        fontSize: '14px',
        color: '#6b7280',
        margin: 0,
    },
    buttonPrimary: {
        backgroundColor: '#2563eb',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        padding: '12px 20px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
        cursor: 'not-allowed',
    },
    flexCenter: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    spinner: {
        width: '14px',
        height: '14px',
        border: '2px solid #ffffff',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'spin 0.8s linear infinite',
    },
    alertBanner: {
        padding: '12px 18px',
        borderRadius: '6px',
        marginBottom: '24px',
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    alertSuccess: { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' },
    alertError: { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' },
    alertInfo: { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' },
    closeAlertBtn: {
        background: 'none',
        border: 'none',
        fontSize: '18px',
        cursor: 'pointer',
        color: 'inherit',
        lineHeight: '1',
    },
    cardGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
    },
    infoCard: {
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '18px 20px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    },
    cardLabel: {
        display: 'block',
        fontSize: '12px',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '6px',
    },
    cardValue: {
        fontSize: '17px',
        fontWeight: '600',
        color: '#111827',
    },
    cardValueCode: {
        display: 'block',
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#374151',
        backgroundColor: '#f3f4f6',
        padding: '4px 8px',
        borderRadius: '4px',
        wordBreak: 'break-all',
    },
    tableCard: {
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden',
    },
    tableHeaderBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        flexWrap: 'wrap',
        gap: '12px',
    },
    tableHeading: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '600',
        color: '#111827',
    },
    searchWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    searchInput: {
        padding: '7px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        outline: 'none',
        width: '200px',
    },
    refreshButton: {
        padding: '7px 12px',
        backgroundColor: '#f3f4f6',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '15px',
    },
    tableResponsive: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
    },
    tableHeaderRow: {
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
    },
    th: {
        padding: '12px 20px',
        fontSize: '12px',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },
    tableRow: {
        borderBottom: '1px solid #f3f4f6',
    },
    td: {
        padding: '14px 20px',
        fontSize: '14px',
        color: '#374151',
    },
    fileIcon: {
        marginRight: '8px',
        fontSize: '16px',
    },
    badge: {
        backgroundColor: '#f3f4f6',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        color: '#4b5563',
    },
    typeBadge: {
        padding: '3px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    downloadLink: {
        display: 'inline-block',
        padding: '6px 12px',
        backgroundColor: '#f3f4f6',
        color: '#1f2937',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        textDecoration: 'none',
        fontSize: '12px',
        fontWeight: '500',
    },
    emptyCell: {
        padding: '32px 20px',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '14px',
    },
};