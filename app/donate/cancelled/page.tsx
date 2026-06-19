"use client";

export default function DonateCancelledPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FAFAF9',
      padding: 20,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EF4444',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}>
        <span style={{ fontSize: 40, color: '#FFF' }}>✕</span>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Donation Cancelled</h1>
      <p style={{ fontSize: 16, color: '#666', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
        Your donation was cancelled. No charges were made.
        You can close this page and return to the app to try again.
      </p>
    </div>
  );
}
