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

 
  let wumpusPlaced = false;
  while (!wumpusPlaced) {
    const r = rand(1, size - 1);
    const c = rand(1, size - 1);
    if (!env[r][c].wumpus && !env[r][c].pit && !env[r][c].gold) {
      env[r][c].wumpus = true;
      setStench(env, r, c);
      wumpusPlaced = true;
    }
  }

  let pitCount = Math.floor(size * 1.5);
  while (pitCount > 0) {
    const r = rand(1, size - 1);
    const c = rand(1, size - 1);
    if (!env[r][c].pit && !env[r][c].wumpus && !env[r][c].gold) {
      env[r][c].pit = true;
      setBreeze(env, r, c);
      pitCount--;
    }
  }

  let goldPlaced = false;
  while (!goldPlaced) {
    const r = rand(1, size - 1);
    const c = rand(1, size - 1);
    if (!env[r][c].pit && !env[r][c].wumpus && !env[r][c].gold) {
      env[r][c].gold = true;
      goldPlaced = true;
    }
  }

  return env;
}

function setBreeze(env, r, c) {
  const dirs = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  dirs.forEach(([dr, dc]) => {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < env.length && nc >= 0 && nc < env.length) {
      env[nr][nc].breeze = true;
    }
  });
}

function setStench(env, r, c) {
  const dirs = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  dirs.forEach(([dr, dc]) => {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < env.length && nc >= 0 && nc < env.length) {
      env[nr][nc].stench = true;
    }
  });
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function parseBoardFile(fileContent, size) {
  const env = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      pit: false,
      wumpus: false,
      gold: false,
      breeze: false,
      stench: false,
    }))
  );
  const lines = fileContent.trim().split("\n");
  for (let r = 0; r < Math.min(size, lines.length); r++) {
    const line = lines[r].trim();
    for (let c = 0; c < Math.min(size, line.length); c++) {
      const ch = line[c];
      if (ch === "P") {
        env[r][c].pit = true;
        setBreeze(env, r, c);
      } else if (ch === "W") {
        env[r][c].wumpus = true;
        setStench(env, r, c);
      } else if (ch === "G") {
        env[r][c].gold = true;
      }
    }
  }
  return env;
}