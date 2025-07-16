import React from "react";

function Agent({ moveAgent }) {
  return (
    <div className="agent-controls">
      <button onClick={() => moveAgent("up")}>⬆️</button>
      <button onClick={() => moveAgent("left")}>⬅️</button>
      <button onClick={() => moveAgent("down")}>⬇️</button>
      <button onClick={() => moveAgent("right")}>➡️</button>
    </div>
  );
}

export default Agent;
