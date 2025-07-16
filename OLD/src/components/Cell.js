import React from "react";

function Cell({ cell, isAgent, visited, gameStatus }) {
  let content = "";
  if (isAgent) content = "🤖";
  else if (visited && cell.gold) content = "💰";
  else if (visited && cell.pit) content = "🕳️";
  else if (visited && cell.wumpus) content = "👹";
  else if (visited && cell.breeze && cell.stench) content = "💨💩";
  else if (visited && cell.breeze) content = "💨";
  else if (visited && cell.stench) content = "💩";
  else content = "";

  let cellClass = "cell";
  if (isAgent) cellClass += " agent";
  else if (visited && cell.gold) cellClass += " gold";
  else if (visited && cell.pit) cellClass += " pit";
  else if (visited && cell.wumpus) cellClass += " wumpus";
  else if (visited) cellClass += " visited";

  // Reveal all on game over
  if (gameStatus !== "playing" && (cell.gold || cell.pit || cell.wumpus)) {
    if (cell.gold) content = "💰";
    if (cell.pit) content = "🕳️";
    if (cell.wumpus) content = "👹";
  }

  return <div className={cellClass}>{content}</div>;
}

export default Cell;
