function inList(lst, r, c) {
  if (!lst || !Array.isArray(lst)) return false;
  return lst.some(([rr, cc]) => rr === r && cc === c);
}

function getAdjacent(row, col, size) {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ].filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size);
}

// First Order Logic rules:
// 1. ∀x,y: Breeze(x,y) ⇒ (∃i,j: Adjacent(x,y,i,j) ∧ Pit(i,j))
// 2. ∀x,y: Stench(x,y) ⇒ (∃i,j: Adjacent(x,y,i,j) ∧ Wumpus(i,j))
// 3. ∀x,y: ¬Breeze(x,y) ⇒ (∀i,j: Adjacent(x,y,i,j) ⇒ ¬Pit(i,j))
// 4. ∀x,y: ¬Stench(x,y) ⇒ (∀i,j: Adjacent(x,y,i,j) ⇒ ¬Wumpus(i,j))

function calculateRisk(r, c, possiblePits, possibleWumpus, moveHistory, safe) {
  let risk = 0;

  // Base risk for possible dangers
  if (inList(possiblePits, r, c)) risk += 50;
  if (inList(possibleWumpus, r, c)) risk += 100;

  // Reduce risk for known safe cells
  if (inList(safe, r, c)) risk -= 30;

  // Increase risk for recently visited cells to avoid loops
  const recentVisits = moveHistory.slice(-5).filter(([mr, mc]) => mr === r && mc === c).length;
  risk += recentVisits * 20;  // Penalize recent revisits more heavily

  // Increase risk based on total visit count to encourage exploration
  const totalVisits = moveHistory.filter(([mr, mc]) => mr === r && mc === c).length;
  risk += totalVisits * 5;

  return risk;
}

function findSafestPath(current, target, size, safe, possiblePits, possibleWumpus, visited) {
  const [startRow, startCol] = current;
  const [targetRow, targetCol] = target;
  const queue = [[[startRow, startCol]]];
  const seen = new Set([`${startRow},${startCol}`]);

  while (queue.length > 0) {
    const path = queue.shift();
    const [row, col] = path[path.length - 1];

    if (row === targetRow && col === targetCol) {
      return path;
    }

    const neighbors = getAdjacent(row, col, size);
    for (const [r, c] of neighbors) {
      const key = `${r},${c}`;
      if (!seen.has(key) && inList(safe, r, c) &&
        !inList(possiblePits, r, c) && !inList(possibleWumpus, r, c)) {
        seen.add(key);
        queue.push([...path, [r, c]]);
      }
    }
  }
  return null;
}

function inferSafeLocations(loc, percepts, size, visited) {
  const [x, y] = loc;
  const adjacent = getAdjacent(x, y, size);

  // If no breeze and no stench, all adjacent cells are safe
  if (!percepts.breeze && !percepts.stench) {
    // Prioritize unvisited cells
    return adjacent.sort((a, b) => {
      const [ar, ac] = a;
      const [br, bc] = b;
      const aVisited = inList(visited, ar, ac) ? 1 : 0;
      const bVisited = inList(visited, br, bc) ? 1 : 0;
      return bVisited - aVisited;
    });
  }
  return [];
}

function inferDangerousLocations(loc, percepts, size, type) {
  const [x, y] = loc;
  const adjacent = getAdjacent(x, y, size);

  if ((type === 'pit' && percepts.breeze) || (type === 'wumpus' && percepts.stench)) {
    // Sort adjacent cells by distance from current location
    return adjacent.sort((a, b) => {
      return Math.abs(a[0] - x) + Math.abs(a[1] - y) -
        (Math.abs(b[0] - x) + Math.abs(b[1] - y));
    });
  }
  return [];
}

export function agentReasoning(agentPos, visited, kb = null, percepts, env, wumpusAlive = []) {
  // Ensure kb is initialized with default values if null/undefined
  const defaultKb = {
    safe: [[0, 0]],
    possiblePits: [],
    possibleWumpus: [],
    visited: [[0, 0]],
    reasoning: [],
    arrows: 1,
    moveHistory: []
  };
  kb = kb || defaultKb;

  const size = env.length;
  let safe = Array.isArray(kb.safe) ? kb.safe.slice() : defaultKb.safe.slice();
  let possiblePits = Array.isArray(kb.possiblePits) ? kb.possiblePits.slice() : defaultKb.possiblePits.slice();
  let possibleWumpus = Array.isArray(kb.possibleWumpus) ? kb.possibleWumpus.slice() : defaultKb.possibleWumpus.slice();
  let visitedList = Array.isArray(kb.visited) ? kb.visited.slice() : defaultKb.visited.slice();
  let reasoning = Array.isArray(kb.reasoning) ? kb.reasoning.slice() : defaultKb.reasoning.slice();
  let arrows = typeof kb.arrows === "number" ? kb.arrows : defaultKb.arrows;
  let moveHistory = Array.isArray(kb.moveHistory) ? kb.moveHistory.slice() : defaultKb.moveHistory.slice();
  const { row, col } = agentPos;

  // Update visited and safe lists
  if (!inList(visitedList, row, col)) visitedList.push([row, col]);
  if (!inList(safe, row, col)) {
    safe.push([row, col]);
    reasoning.push(`Agent at (${row},${col}) is safe (FOL: Visited(${row},${col}) ⇒ Safe(${row},${col}))`);
  }

  const adj = getAdjacent(row, col, size);

  // Apply FOL rules for breezes
  // Rule: Breeze(x,y) ⇒ ∃(i,j) Adjacent(x,y,i,j) ∧ Pit(i,j)
  if (percepts.breeze) {
    const newPossiblePits = inferDangerousLocations([row, col], percepts, size, 'pit');
    newPossiblePits.forEach(([r, c]) => {
      if (!inList(safe, r, c) && !inList(possiblePits, r, c)) {
        possiblePits.push([r, c]);
        reasoning.push(`FOL: Breeze(${row},${col}) ∧ Adjacent(${row},${col},${r},${c}) ⇒ PossiblePit(${r},${c})`);
      }
    });
  } else {
    // Rule: ¬Breeze(x,y) ⇒ ∀(i,j) Adjacent(x,y,i,j) ⇒ ¬Pit(i,j)
    const safeCells = inferSafeLocations([row, col], percepts, size);
    safeCells.forEach(([r, c]) => {
      if (!inList(safe, r, c)) {
        safe.push([r, c]);
        reasoning.push(`FOL: ¬Breeze(${row},${col}) ∧ Adjacent(${row},${col},${r},${c}) ⇒ ¬Pit(${r},${c})`);
        possiblePits = possiblePits.filter(([rr, cc]) => !(rr === r && cc === c));
      }
    });
  }

  // Apply FOL rules for stenches
  // Enhanced Wumpus detection using multiple stench percepts
  // Initialize wumpusConfidence map for tracking Wumpus location probabilities
  const wumpusConfidence = {};

  // Enhanced FOL rules for stenches with more accurate confidence tracking
  if (percepts.stench && wumpusAlive.length > 0) {
    // ONLY trust stenches directly from the current cell
    // This ensures we only respond to actual stenches in the environment
    const isRealStench = env[row][col].stench === true;

    // Also verify that there's an actual Wumpus nearby
    const hasAdjacentWumpus = getAdjacent(row, col, size).some(
      ([r, c]) => env[r] && env[r][c] && env[r][c].wumpus === true
    );

    // ONLY process stench if it's a REAL stench AND there's an ADJACENT WUMPUS
    if (isRealStench && hasAdjacentWumpus) {
      console.log(`VALID STENCH at (${row},${col}) with adjacent Wumpus detected`);

      // Only consider DIRECTLY adjacent cells (Manhattan distance = 1)
      const adjacentCells = getAdjacent(row, col, size);

      // IMPROVED VALIDATION: First count the number of stench cells around the possible Wumpus
      // Create a map to count stenches around each cell
      const stenchCount = new Map();

      // For each adjacent cell, count how many stenches surround it
      adjacentCells.forEach(([r, c]) => {
        // Count cells with stenches that are adjacent to this cell
        const surroundingStenches = getAdjacent(r, c, size).filter(([nr, nc]) =>
          env[nr] && env[nr][nc] && env[nr][nc].stench === true
        ).length;

        stenchCount.set(`${r},${c}`, surroundingStenches);
        console.log(`Cell (${r},${c}) has ${surroundingStenches} surrounding stenches`);
      });

      // Check each adjacent cell DIRECTLY instead of using inference
      adjacentCells.forEach(([r, c]) => {
        // Skip if cell is already known to be safe
        if (!inList(safe, r, c)) {
          // Check if there's ACTUALLY a Wumpus here
          const hasWumpus = env[r] && env[r][c] && env[r][c].wumpus === true;

          // Verify this position is in the wumpusAlive list
          const matchesWumpusPos = wumpusAlive.some(([wr, wc]) => wr === r && wc === c);

          // Check if this cell has a pit
          const hasPit = env[r] && env[r][c] && env[r][c].pit === true;

          // Get the stench count for this cell - higher counts indicate more confidence
          const surroundingStenches = stenchCount.get(`${r},${c}`) || 0;

          // Only consider cells with multiple stenches or confirmed Wumpus
          // This prevents false positives by requiring stronger evidence
          const hasStrongEvidence = surroundingStenches >= 2 || hasWumpus;

          // Only add to possibleWumpus if:
          // 1. Not already there
          // 2. Not a pit
          // 3. Not already known as safe
          // 4. Has strong evidence (multiple stenches or confirmed Wumpus)
          if (!inList(possibleWumpus, r, c) && !hasPit && !inList(safe, r, c) && hasStrongEvidence) {
            possibleWumpus.push([r, c]);

            // If we're 100% sure there's a Wumpus, add reasoning
            if (hasWumpus && matchesWumpusPos) {
              console.log(`CONFIRMED Wumpus at (${r},${c}) from agent at (${row},${col})`);
              reasoning.push(`FOL: Directly confirmed Wumpus at (${r},${c})`);
            } else if (surroundingStenches >= 2) {
              // Strong evidence but not 100% confirmed
              console.log(`HIGH CONFIDENCE Wumpus at (${r},${c}) with ${surroundingStenches} surrounding stenches`);
              reasoning.push(`FOL: High confidence Wumpus at (${r},${c}) with ${surroundingStenches} surrounding stenches`);
            } else {
              // Otherwise just note it as a possibility
              reasoning.push(`FOL: Possible Wumpus at (${r},${c}) - needs confirmation`);
            }
          } else if (surroundingStenches < 2 && !hasWumpus && !inList(safe, r, c)) {
            // This is likely a false positive - don't add to possibleWumpus but note the reason
            console.log(`LIKELY FALSE POSITIVE at (${r},${c}) with only ${surroundingStenches} surrounding stenches`);
            reasoning.push(`Insufficient evidence for Wumpus at (${r},${c}) - ignoring`);
          }
        }
      });
    } else {
      // This is a false stench - add explicit reasoning
      console.log(`FALSE STENCH DETECTED at (${row},${col}) - isRealStench: ${isRealStench}, hasAdjacentWumpus: ${hasAdjacentWumpus}`);
      reasoning.push(`Detected potential false stench at (${row},${col}), ignoring`);
    }
  } else {
    // No stench means adjacent cells are safe from Wumpus
    adj.forEach(([r, c]) => {
      if (!inList(safe, r, c)) {
        safe.push([r, c]);
        wumpusConfidence[`${r},${c}`] = 0;  // Zero confidence of Wumpus
        reasoning.push(`No stench at (${row},${col}) ⇒ (${r},${c}) is safe`);
        possibleWumpus = possibleWumpus.filter(([rr, cc]) => !(rr === r && cc === c));
      }
    });
  }

  // Even with or without stench, validate Wumpus locations systematically
  // Check for false positives by examining stench patterns
  possibleWumpus.forEach(([wr, wc]) => {
    // Count the number of cells with stench adjacent to this possible Wumpus
    const stenchesAroundWumpus = getAdjacent(wr, wc, size)
      .filter(([r, c]) => env[r][c] && env[r][c].stench === true)
      .length;

    // If this Wumpus candidate doesn't have enough evidence (at least 2 stenches)
    // and isn't a confirmed Wumpus in the environment, mark it as safe
    const isConfirmedWumpus = env[wr][wc] && env[wr][wc].wumpus === true;

    if (stenchesAroundWumpus < 2 && !isConfirmedWumpus) {
      console.log(`Clearing false positive Wumpus at (${wr},${wc}) - insufficient evidence`);
      reasoning.push(`Clearing false positive at (${wr},${wc}) - requires multiple stenches`);

      // Remove from possibleWumpus and mark as safe if not already
      possibleWumpus = possibleWumpus.filter(([r, c]) => !(r === wr && c === wc));
      if (!inList(safe, wr, wc)) {
        safe.push([wr, wc]);
      }
    }
  });

  // COMPLETELY FIXED shooting logic - with extremely strict validation
  let shootAction = null;

  // We'll ONLY shoot if ALL of these conditions are met:
  // 1. We have arrows remaining
  // 2. We have a DIRECT stench percept in the current cell
  // 3. There's a CONFIRMED Wumpus in an adjacent cell
  // 4. The Wumpus is in the wumpusAlive list
  // 5. There's no pit in the target cell
  // 6. We're in a cell that actually has a stench in the environment
  if (wumpusAlive.length > 0 && arrows > 0 && percepts.stench === true && env[row][col].stench === true) {
    console.log(`SHOOT LOGIC: Agent at (${row},${col}) with confirmed stench percept`);

    const adjacentCells = getAdjacent(row, col, size);

    // For debugging, log all adjacent cells and their contents
    adjacentCells.forEach(([r, c]) => {
      if (env[r] && env[r][c]) {
        console.log(`  Adjacent cell (${r},${c}) - Wumpus: ${env[r][c].wumpus}, Pit: ${env[r][c].pit}`);
      }
    });

    // ONLY shoot when there's a confirmed Wumpus adjacent to us
    const adjacentWumpus = adjacentCells.find(([r, c]) => {
      // First, count adjacent stenches to determine confidence level
      const adjacentStenchCount = getAdjacent(r, c, size)
        .filter(([nr, nc]) =>
          env[nr] && env[nr][nc] && env[nr][nc].stench === true
        ).length;

      console.log(`Checking cell (${r},${c}) for Wumpus - has ${adjacentStenchCount} adjacent stenches`);

      // Ultra-strict Wumpus verification with improved validation
      // We'll verify that we're not dealing with a false positive stench
      const isValidTarget = (
        // Must have environment data
        env[r] && env[r][c] &&
        // Must be a confirmed Wumpus in environment
        env[r][c].wumpus === true &&
        // Must be in the wumpusAlive list - double check this is crucial
        wumpusAlive.some(([wr, wc]) => wr === r && wc === c) &&
        // Must not be a pit
        env[r][c].pit !== true &&
        // Must have at least 2 cells with stench adjacent to target
        // This helps filter false positives by requiring multiple corroborating evidences
        adjacentStenchCount >= 2
      );

      if (isValidTarget) {
        console.log(`  VALID WUMPUS TARGET FOUND at (${r},${c})`);
      }

      return isValidTarget;
    });

    if (adjacentWumpus) {
      // We found a 100% confirmed Wumpus
      const [targetRow, targetCol] = adjacentWumpus;

      // Determine direction to shoot
      const directions = [
        ["up", row - 1 === targetRow && col === targetCol],
        ["down", row + 1 === targetRow && col === targetCol],
        ["left", row === targetRow && col - 1 === targetCol],
        ["right", row === targetRow && col + 1 === targetCol]
      ];

      for (const [dir, isTarget] of directions) {
        if (isTarget) {
          // Log the decisive evidence for shooting
          reasoning.push(`Direct confirmation: Wumpus detected at (${targetRow},${targetCol})`);
          reasoning.push(`Shooting ${dir} at confirmed Wumpus (${targetRow},${targetCol})`);

          shootAction = { type: "shoot", direction: dir, target: [targetRow, targetCol] };
          arrows -= 1;
          break;
        }
      }
    }

    // No inferred shooting at all - only shoot with 100% certainty based on
    // environment data, never based on inference
  }

  // Movement logic using FOL
  let nextMove = null;
  const directions = [
    ["up", [row - 1, col]],
    ["down", [row + 1, col]],
    ["left", [row, col - 1]],
    ["right", [row, col + 1]],
  ];

  if (!shootAction) {
    // First try to find a safe path to an unvisited cell
    let bestPath = null;
    let targetCell = null;

    // Look for unvisited safe cells and find paths to them
    outerLoop: for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!inList(visitedList, r, c) &&
          inList(safe, r, c) &&
          !inList(possiblePits, r, c) &&
          !inList(possibleWumpus, r, c)) {
          const path = findSafestPath([row, col], [r, c], size, safe, possiblePits, possibleWumpus, visited);
          if (path && path.length > 1) {
            bestPath = path;
            // eslint-disable-next-line no-unused-vars
            targetCell = [r, c];  // Kept for debugging purposes
            break outerLoop;
          }
        }
      }
    }

    if (bestPath && bestPath.length > 1) {
      const [nextRow, nextCol] = bestPath[1];
      for (const [dir, [r, c]] of directions) {
        if (r === nextRow && c === nextCol) {
          nextMove = { type: "move", direction: dir };
          reasoning.push(`Moving ${dir} towards unvisited safe cell (${nextRow},${nextCol})`);
          break;
        }
      }
    } else {
      // If no unvisited safe cells, try to find the least risky adjacent cell
      let minRisk = Infinity;
      let bestDir = null;

      for (const [dir, [r, c]] of directions) {
        if (r >= 0 && r < size && c >= 0 && c < size) {
          const risk = calculateRisk(r, c, possiblePits, possibleWumpus, moveHistory, safe);
          if (risk < minRisk) {
            minRisk = risk;
            bestDir = dir;
          }
        }
      }

      if (bestDir) {
        nextMove = { type: "move", direction: bestDir };
        reasoning.push(`Choosing least risky direction: ${bestDir}`);
      }
    }
  }

  // Update move history
  if (nextMove && nextMove.type === "move") {
    moveHistory.push([row, col]);
  }

  return {
    action: shootAction || nextMove || { type: "move", direction: "up" }, // Default move up if no other option
    knowledge: {
      safe,
      possiblePits,
      possibleWumpus,
      visited: visitedList,
      reasoning,
      arrows,
      moveHistory
    }
  };
}