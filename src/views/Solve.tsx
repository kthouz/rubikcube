import PlaceholderView from '../components/PlaceholderView';

export default function Solve() {
  return (
    <PlaceholderView
      title="Solve"
      description="Compute a solution from the scanned cube state and visualize it with an interactive 3D cube you can step through move by move."
    >
      <ul className="todo-list">
        <li>Render the cube in 3D with three.js.</li>
        <li>Run the solver to produce a move sequence.</li>
        <li>Add playback controls (prev / next / autoplay).</li>
      </ul>
    </PlaceholderView>
  );
}
