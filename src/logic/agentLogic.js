function inList(lst, r, c) {
  return lst.some(([rr, cc]) => rr === r && cc === c);
}

function getAdjacent(row, col, size) {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1]
  ].filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size);
}

function isSafe(r, c, safe, possiblePits, possibleWumpus) {
  return inList(safe, r, c) &&
         !inList(possiblePits, r, c) &&
         !inList(possibleWumpus, r, c);
}

export function agentReasoning(agentPos, visited, kb, percepts, env, wumpusAlive = true) {
  const size = env.length;
  let safe = kb.safe ? kb.safe.slice() : [];
  let possiblePits = kb.possiblePits ? kb.possiblePits.slice() : [];
  let possibleWumpus = kb.possibleWumpus ? kb.possibleWumpus.slice() : [];
  let visitedList = kb.visited ? kb.visited.slice() : [];
  let reasoning = kb.reasoning ? kb.reasoning.slice() : [];
  let arrows = typeof kb.arrows === "number" ? kb.arrows : 1;
  const { row, col } = agentPos;

  if (!inList(visitedList, row, col)) visitedList.push([row, col]);
  if (!inList(safe, row, col)) safe.push([row, col]);

  const adj = getAdjacent(row, col, size);

  if (percepts.breeze) {
    adj.forEach(([r, c]) => {
      if (!inList(safe, r, c) && !inList(possiblePits, r, c)) {
        possiblePits.push([r, c]);
        reasoning.push(`Breeze at (${row},${col}) ⇒ possible pit at (${r},${c})`);
      }
    });
  } else {
    adj.forEach(([r, c]) => {
      if (!inList(safe, r, c)) {
        safe.push([r, c]);
        reasoning.push(`No breeze at (${row},${col}) ⇒ (${r},${c}) is safe`);
        possiblePits = possiblePits.filter(([rr, cc]) => !(rr === r && cc === c));
      }
    });
  }

  if (percepts.stench && wumpusAlive) {
    adj.forEach(([r, c]) => {
      if (!inList(safe, r, c) && !inList(possibleWumpus, r, c)) {
        possibleWumpus.push([r, c]);
        reasoning.push(`Stench at (${row},${col}) ⇒ possible Wumpus at (${r},${c})`);
      }
    });
  } else {
    adj.forEach(([r, c]) => {
      if (!inList(safe, r, c)) {
        safe.push([r, c]);
        reasoning.push(`No stench at (${row},${col}) ⇒ (${r},${c}) is safe`);
        possibleWumpus = possibleWumpus.filter(([rr, cc]) => !(rr === r && cc === c));
      }
    });
  }

  let shootAction = null;
  if (wumpusAlive && arrows > 0 && possibleWumpus.length === 1) {
    const [wr, wc] = possibleWumpus[0];
    for (const [dir, [r, c]] of [
      ["up", [row - 1, col]],
      ["down", [row + 1, col]],
      ["left", [row, col - 1]],
      ["right", [row, col + 1]],
    ]) {
      if (wr === r && wc === c) {
        shootAction = { type: "shoot", direction: dir, target: [wr, wc] };
        reasoning.push(`Certain Wumpus at (${wr},${wc}), shooting ${dir}`);
        arrows -= 1;
        break;
      }
    }
  }

  let nextMove = null;
  const directions = [
    ['up', [row - 1, col]],
    ['down', [row + 1, col]],
    ['left', [row, col - 1]],
    ['right', [row, col + 1]]
  ];

  if (!shootAction) {
    for (const [dir, [r, c]] of directions) {
      if (
        r >= 0 && r < size && c >= 0 && c < size &&
        !visited[r][c] &&
        isSafe(r, c, safe, possiblePits, possibleWumpus)
      ) {
        nextMove = dir;
        reasoning.push(`Moving ${dir} to provably safe unvisited cell (${r},${c})`);
        break;
      }
    }
    if (!nextMove) {
      for (const [dir, [r, c]] of directions) {
        if (
          r >= 0 && r < size && c >= 0 && c < size &&
          isSafe(r, c, safe, possiblePits, possibleWumpus)
        ) {
          nextMove = dir;
          reasoning.push(`Backtracking: moving ${dir} to provably safe visited cell (${r},${c})`);
          break;
        }
      }
    }
    if (!nextMove) {
      for (const [dir, [r, c]] of directions) {
        if (
          r >= 0 && r < size && c >= 0 && c < size &&
          inList(safe, r, c) &&
          !inList(possibleWumpus, r, c)
        ) {
          nextMove = dir;
          reasoning.push(`Desperate: moving ${dir} to cell (${r},${c}) (possible pit, but not possible Wumpus)`);
          break;
        }
      }
    }
    if (!nextMove) {
      for (const [dir, [r, c]] of directions) {
        if (
          r >= 0 && r < size && c >= 0 && c < size &&
          inList(safe, r, c)
        ) {
          nextMove = dir;
          reasoning.push(`Desperate: moving ${dir} to cell (${r},${c}) (possible Wumpus)`);
          break;
        }
      }
    }
  }

  if (reasoning.length > 12) reasoning = reasoning.slice(-12);

  return {
    nextMove,
    shootAction,
    updatedKB: {
      safe,
      possiblePits,
      possibleWumpus,
      visited: visitedList,
      reasoning,
      arrows
    }
  };
}