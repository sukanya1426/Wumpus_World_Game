import React, { useState, useEffect, useRef } from "react";
import Cell from "./Cell";
import { generateEnvironment, parseBoardFile } from "../logic/environment";
import { agentReasoning } from "../logic/agentLogic";

const GRID_SIZE = 10;

function Board({ fileContent }) {
  const [env, setEnv] = useState(() => generateEnvironment(GRID_SIZE));
  const [agentPos, setAgentPos] = useState({ row: 0, col: 0 });
  const [visited, setVisited] = useState(() =>
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false))
  );
  const [gameStatus, setGameStatus] = useState("playing");
  const [kb, setKb] = useState(() => ({
    safe: [[0, 0]],
    possiblePits: [],
    possibleWumpus: [],
    visited: [[0, 0]],
    reasoning: [],
    arrows: 1,
    moveHistory: [],
  }));
  const [wumpusAlive, setWumpusAlive] = useState([]);
  const [score, setScore] = useState(0);
  const [wumpusKilled, setWumpusKilled] = useState(0);

  const timerRef = useRef(null);

  useEffect(() => {
    if (fileContent) {
      const parsed = parseBoardFile(fileContent, GRID_SIZE);
      console.log("Parsed env at (5,0):", parsed[5][0]);
      setEnv(parsed);
      setAgentPos({ row: 0, col: 0 });
      setVisited(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false)));
      setGameStatus("playing");
      setKb({
        safe: [[0, 0]],
        possiblePits: [],
        possibleWumpus: [],
        visited: [[0, 0]],
        reasoning: [],
        arrows: 1,
        moveHistory: [],
      });
      const wumpusCoords = [];
      parsed.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell.wumpus) wumpusCoords.push([r, c]);
        })
      );
      setWumpusAlive(wumpusCoords);
      setScore(0);
      setWumpusKilled(0);
    }
  }, [fileContent]);

  useEffect(() => {
    if (gameStatus !== "playing") {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      // Process the KB to validate Wumpus locations systematically
      setKb((prevKb) => {
        const validatedWumpus = [];
        // Only keep Wumpus locations that have sufficient evidence
        // This systemically removes false positives without hardcoding
        (prevKb.possibleWumpus || []).forEach(([r, c]) => {
          // Check if there are at least 2 adjacent cells with stench
          // to validate this as a real Wumpus location
          const adjacentCells = [
            [r - 1, c],
            [r + 1, c],
            [r, c - 1],
            [r, c + 1],
          ].filter(([ar, ac]) =>
            ar >= 0 && ar < GRID_SIZE && ac >= 0 && ac < GRID_SIZE
          );

          // Count stench cells around this possible Wumpus
          const stenchCount = adjacentCells.filter(
            ([ar, ac]) => env[ar][ac] && env[ar][ac].stench === true
          ).length;

          // Only include if there's strong evidence (2+ stenches)
          if (stenchCount >= 2 || (env[r][c] && env[r][c].wumpus === true)) {
            validatedWumpus.push([r, c]);
          }
        });

        return {
          ...prevKb,
          possibleWumpus: validatedWumpus
        };
      });

      // Update visited immediately
      const newVisited = visited.map((row) => row.slice());
      newVisited[agentPos.row][agentPos.col] = true;
      setVisited(newVisited);
      setKb((prevKb) => ({
        ...prevKb,
        visited: [...prevKb.visited, [agentPos.row, agentPos.col]],
      }));

      // Use a deep copy of env for percepts
      const currentEnv = env.map(row => [...row].map(cell => ({ ...cell })));
      const currentCell = currentEnv[agentPos.row][agentPos.col];

      // Only detect stench and breeze from the current cell, not from adjacent cells
      const percepts = {
        breeze: currentCell.breeze,
        stench: currentCell.stench,
      };
      console.log("Percepts at", agentPos, ": breeze=", percepts.breeze, "stench=", percepts.stench, "cell=", currentCell);

      const result = agentReasoning(
        agentPos,
        visited,
        kb,
        percepts,
        env,
        wumpusAlive
      );

      setKb(result.knowledge);
      const action = result.action;

      // Shoot first at current position
      if (action.type === "shoot") {
        const [wr, wc] = action.target;

        // ULTRA-STRICT validation before confirming a Wumpus kill
        const targetCell = env[wr][wc];
        console.log(`SHOT VALIDATION - Target cell (${wr},${wc}):`);
        console.log(`- Has Wumpus: ${targetCell.wumpus}`);
        console.log(`- Has Pit: ${targetCell.pit}`);
        console.log(`- Current cell has stench: ${currentCell.stench}`);
        console.log(`- Target in wumpusAlive: ${wumpusAlive.some(([r, c]) => r === wr && c === wc)}`);
        console.log(`- Manhattan distance: ${Math.abs(agentPos.row - wr) + Math.abs(agentPos.col - wc)}`);

        // Advanced validation for confirming Wumpus kills
        // Calculate the number of adjacent cells with stench to verify this is a real Wumpus
        const adjacentToTarget = [
          [wr - 1, wc],
          [wr + 1, wc],
          [wr, wc - 1],
          [wr, wc + 1],
        ].filter(([r, c]) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE);

        // Count how many surrounding cells have stenches
        const stenchCount = adjacentToTarget.filter(
          ([r, c]) => env[r][c].stench === true
        ).length;

        console.log(`- Surrounding stench count: ${stenchCount}`);
        console.log(`- Minimum stench threshold: 2`);

        // Only count as a kill if ALL conditions are met
        let wasActualWumpus = (
          // Must be a Wumpus in target cell
          targetCell.wumpus === true &&
          // No pit in target cell
          !targetCell.pit &&
          // Must have stench in current cell
          currentCell.stench === true &&
          // Must be in wumpusAlive list
          wumpusAlive.some(([r, c]) => r === wr && c === wc) &&
          // Must be adjacent (Manhattan distance = 1)
          Math.abs(agentPos.row - wr) + Math.abs(agentPos.col - wc) === 1 &&
          // Must have at least 2 stenches in adjacent cells (stronger evidence)
          stenchCount >= 2
        );

        setEnv((prevEnv) => {
          const newEnv = prevEnv.map((row) => row.map((cell) => ({ ...cell })));

          // Only modify environment if conditions are met
          if (wasActualWumpus) {
            newEnv[wr][wc].wumpus = false;
            [
              [wr - 1, wc],
              [wr + 1, wc],
              [wr, wc - 1],
              [wr, wc + 1],
            ].forEach(([r, c]) => {
              if (
                r >= 0 &&
                r < GRID_SIZE &&
                c >= 0 &&
                c < GRID_SIZE &&
                newEnv[r][c].stench
              ) {
                newEnv[r][c].stench = false;
              }
            });
          }
          return newEnv;
        });

        // Only update Wumpus state if there was actually a Wumpus
        if (wasActualWumpus) {
          setWumpusAlive((prev) => prev.filter(([r, c]) => !(r === wr && c === wc)));
          setWumpusKilled((prev) => prev + 1);
        }

        // Update KB with appropriate message
        setKb((prevKb) => {
          let updatedReasoning;
          if (wasActualWumpus) {
            updatedReasoning = [...prevKb.reasoning, `Wumpus killed at (${wr},${wc})`];
          } else if (!currentCell.stench) {
            updatedReasoning = [...prevKb.reasoning, `Cannot shoot without detecting stench in current cell`];
          } else if (env[wr][wc].pit) {
            updatedReasoning = [...prevKb.reasoning, `Shot at (${wr},${wc}), but found a pit instead`];
          } else {
            updatedReasoning = [...prevKb.reasoning, `Shot at (${wr},${wc}), but no Wumpus was there`];
          }

          return {
            ...prevKb,
            possibleWumpus: prevKb.possibleWumpus.filter(([r, c]) => !(r === wr && c === wc)),
            safe: [...prevKb.safe, [wr, wc]],
            reasoning: updatedReasoning.slice(-12),
          };
        });

        setScore((prev) => prev - 10);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { }, 600);
        return;
      }

      let { row, col } = agentPos;
      if (action.type === "move") {
        const { direction } = action;
        if (direction === "up" && row > 0) row--;
        if (direction === "down" && row < GRID_SIZE - 1) row++;
        if (direction === "left" && col > 0) col--;
        if (direction === "right" && col < GRID_SIZE - 1) col++;
      }

      setScore((prev) => prev - 1);
      const cell = env[row][col];
      if (cell.pit || (wumpusAlive.some(([r, c]) => r === row && c === col))) { // Use wumpusAlive
        setAgentPos({ row, col });
        setGameStatus("lose");
        setScore((prev) => prev - 1000);
        return;
      }
      if (cell.gold) {
        setAgentPos({ row, col });
        setGameStatus("win");
        setScore((prev) => prev + 1000);
        return;
      }
      if (!action.type) {
        setGameStatus("stuck");
        setScore((prev) => prev - 1000);
        return;
      }
      setAgentPos({ row, col });
    }, 600);

    return () => clearTimeout(timerRef.current);
  }, [agentPos, kb, gameStatus, env, visited, wumpusAlive]);

  const handleReset = () => {
    setEnv(generateEnvironment(GRID_SIZE));
    setAgentPos({ row: 0, col: 0 });
    setVisited(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false)));
    setGameStatus("playing");
    setKb({
      safe: [[0, 0]],
      possiblePits: [],
      possibleWumpus: [],
      visited: [[0, 0]],
      reasoning: [],
      arrows: 1, // Changed from 3 to 1
      moveHistory: [],
    });
    setWumpusAlive([]);
    setScore(0);
    setWumpusKilled(0);
  };

  // Since we don't use getAdjacentCells anymore, we can remove it

  return (
    <div>
      <div className="board">
        {env.map((row, rowIdx) => (
          <div className="board-row" key={rowIdx}>
            {row.map((cell, colIdx) => (
              <Cell
                key={colIdx}
                cell={cell}
                isAgent={agentPos.row === rowIdx && agentPos.col === colIdx}
                visited={visited[rowIdx][colIdx]}
                gameStatus={gameStatus}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="game-status">
        {gameStatus === "win" && <span className="win-msg">🎉 You found the gold! You win!</span>}
        {gameStatus === "lose" && <span className="lose-msg">💀 Game Over! You fell in a pit or met the Wumpus.</span>}
        {gameStatus === "stuck" && <span className="lose-msg">😞 Game Over! Agent is stuck with no safe moves.</span>}
      </div>
      <div className="score">Score: {score}</div>
      <div className="wumpus-killed">Wumpuses Killed: {wumpusKilled}</div>
      <button onClick={handleReset}>Reset Random Board</button>
      <div className="knowledge-base">
        <h2>Agent Knowledge</h2>
        <div>
          <b>Safe Cells:</b> {kb.safe.map(([r, c]) => `(${r},${c})`).join(", ")}
        </div>
        <div>
          <b>Possible Pits:</b> {kb.possiblePits.map(([r, c]) => `(${r},${c})`).join(", ")}
        </div>
        <div>
          <b>Possible Wumpus:</b> {kb.possibleWumpus.map(([r, c]) => `(${r},${c})`).join(", ")}
        </div>
        <div>
          <b>Visited:</b> {kb.visited.map(([r, c]) => `(${r},${c})`).join(", ")}
        </div>
        <div>
          <b>Reasoning:</b>
          <ul>
            {kb.reasoning.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </div>
        <div>
          <b>Arrows left:</b> {kb.arrows}
        </div>
        <div>
          <b>Wumpuses alive:</b> {wumpusAlive.length > 0 ? wumpusAlive.map(([r, c]) => `(${r},${c})`).join(", ") : "None"}
        </div>
      </div>
    </div>
  );
}

export default Board;