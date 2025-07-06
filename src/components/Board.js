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
  const [kb, setKb] = useState({
    safe: [[0, 0]],
    possiblePits: [],
    possibleWumpus: [],
    visited: [[0, 0]],
    reasoning: [],
    arrows: 1,
  });
  const [wumpusAlive, setWumpusAlive] = useState(true);

  const timerRef = useRef(null);

  useEffect(() => {
    if (fileContent) {
      const parsed = parseBoardFile(fileContent, GRID_SIZE);
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
      });
      setWumpusAlive(true);
    }
  }, [fileContent]);

  useEffect(() => {
    setVisited((prev) => {
      const copy = prev.map((row) => row.slice());
      copy[agentPos.row][agentPos.col] = true;
      return copy;
    });
  }, [agentPos]);

  useEffect(() => {
    if (gameStatus !== "playing") {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      const percepts = {
        breeze: env[agentPos.row][agentPos.col].breeze,
        stench: env[agentPos.row][agentPos.col].stench && wumpusAlive,
      };

      const { nextMove, shootAction, updatedKB } = agentReasoning(
        agentPos,
        visited,
        kb,
        percepts,
        env,
        wumpusAlive
      );

      setKb(updatedKB);

      if (shootAction) {
        // Remove Wumpus from the board
        const [wr, wc] = shootAction.target;
        setEnv((prevEnv) => {
          const newEnv = prevEnv.map((row) => row.map((cell) => ({ ...cell })));
          newEnv[wr][wc].wumpus = false;
          // Remove stench from adjacent cells
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
          return newEnv;
        });
        setWumpusAlive(false);
        return;
      }

      if (!nextMove) return;

      let { row, col } = agentPos;
      if (nextMove === "up" && row > 0) row--;
      if (nextMove === "down" && row < GRID_SIZE - 1) row++;
      if (nextMove === "left" && col > 0) col--;
      if (nextMove === "right" && col < GRID_SIZE - 1) col++;

      const cell = env[row][col];
      if (cell.pit || (cell.wumpus && wumpusAlive)) {
        setAgentPos({ row, col });
        setGameStatus("lose");
        return;
      }
      if (cell.gold) {
        setAgentPos({ row, col });
        setGameStatus("win");
        return;
      }
      setAgentPos({ row, col });
    }, 600);

    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line
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
      arrows: 1,
    });
    setWumpusAlive(true);
  };

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
      </div>
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
          <b>Wumpus alive:</b> {wumpusAlive ? "Yes" : "No"}
        </div>
      </div>
    </div>
  );
}

export default Board;
