export function generateEnvironment(size) {
  const env = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      pit: false,
      wumpus: false,
      gold: false,
      breeze: false,
      stench: false,
    }))
  );

  // Random placement (for default generation)
  const wumpusPos = [Math.floor(Math.random() * size), Math.floor(Math.random() * size)];
  env[wumpusPos[0]][wumpusPos[1]].wumpus = true;
  setStench(env, wumpusPos[0], wumpusPos[1]);

  const pitPos = [Math.floor(Math.random() * size), Math.floor(Math.random() * size)];
  env[pitPos[0]][pitPos[1]].pit = true;
  setBreeze(env, pitPos[0], pitPos[1]);

  const goldPos = [Math.floor(Math.random() * size), Math.floor(Math.random() * size)];
  env[goldPos[0]][goldPos[1]].gold = true;

  return env;
}

export function parseBoardFile(content, size) {
  const env = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      pit: false,
      wumpus: false,
      gold: false,
      breeze: false,
      stench: false,
    }))
  );

  const lines = content.trim().split("\n");
  const wumpusPositions = [];
  const pitPositions = [];

  // First pass: set up pits, wumpuses and gold
  lines.forEach((line, row) => {
    line.split("").forEach((cell, col) => {
      const currentCell = env[row][col];
      if (cell === "P") {
        currentCell.pit = true;
        pitPositions.push([row, col]);
      } else if (cell === "W") {
        currentCell.wumpus = true;
        wumpusPositions.push([row, col]);
        console.log(`Created WUMPUS at (${row},${col})`);
      } else if (cell === "G") {
        currentCell.gold = true;
      }
    });
  });

  // Apply stench and breeze after all positions are set
  // Only apply stench to actual Wumpuses
  wumpusPositions.forEach(([row, col]) => {
    console.log(`Setting stench for confirmed Wumpus at (${row},${col})`);
    setStench(env, row, col);
  });
  pitPositions.forEach(([row, col]) => setBreeze(env, row, col));

  // Debug log to verify final state
  console.log("Debug env at (5,0) after updates:", env[5][0]);

  // Return the modified env directly
  return env;
}

function setBreeze(env, row, col) {
  console.log(`Setting breeze for pit at (${row},${col})`);
  const adj = getAdjacentCells(row, col, env.length);
  adj.forEach(([r, c]) => {
    console.log(`Before setting breeze at (${r},${c}):`, env[r][c]);
    if (!env[r][c].breeze) {
      env[r][c].breeze = true;
      console.log(`After setting breeze at (${r},${c}):`, env[r][c]); // Verify change
    }
  });
}

function setStench(env, row, col) {
  console.log(`Setting stench for wumpus at (${row},${col})`);
  const adj = getAdjacentCells(row, col, env.length);
  adj.forEach(([r, c]) => {
    console.log(`Before setting stench at (${r},${c}):`, env[r][c]);
    if (!env[r][c].stench) {
      env[r][c].stench = true;
      console.log(`After setting stench at (${r},${c}):`, env[r][c]); // Verify change
    }
  });
}

function getAdjacentCells(row, col, size) {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ].filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size);
}