import React from "react";

function KnowledgeBase() {
  // For future expansion: show agent's knowledge, percepts, etc.
  return (
    <div className="knowledge-base">
      <h2>Agent Knowledge</h2>
      <p>
        Use arrow keys or the buttons to move.<br />
        Cells reveal hazards and gold only after you visit them.<br />
        💨 = Breeze (pit nearby), 💩 = Stench (wumpus nearby)
      </p>
    </div>
  );
}

export default KnowledgeBase;
