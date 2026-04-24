import Badge from './components/common/Badge';

function App() {
  return (
    <div style={{ padding: '32px', display: 'flex', gap: '12px' }}>
      <Badge level="high" />
      <Badge level="med" />
      <Badge level="low" />
    </div>
  );
}

export default App;