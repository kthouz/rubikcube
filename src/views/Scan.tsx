import PlaceholderView from '../components/PlaceholderView';

export default function Scan() {
  return (
    <PlaceholderView
      title="Scan"
      description="Use the device camera to capture all six faces of the cube and detect the color of each sticker. The scanned state will feed into the solver."
    >
      <ul className="todo-list">
        <li>Request camera access and render a live video preview.</li>
        <li>Detect the 3×3 sticker grid and sample face colors.</li>
        <li>Validate the captured cube state before solving.</li>
      </ul>
    </PlaceholderView>
  );
}
