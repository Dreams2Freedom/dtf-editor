export default function SimplePage() {
  return (
    <div
      style={{
        backgroundColor: 'blue',
        color: 'white',
        padding: '50px',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: '48px' }}>Simple Test - No Tailwind</h1>
      <p>
        If you see this with blue background, React is working but Tailwind
        might not be.
      </p>
    </div>
  );
}
