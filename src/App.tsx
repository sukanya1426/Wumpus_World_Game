import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, Brain, Target, MapPin, Activity } from 'lucide-react';

interface GameState {
  grid: string[][];
  playing_grid: string[][];
  agent_pos: [number, number];
  agent_alive: boolean;
  game_over: boolean;
  has_gold: boolean;
  knowledge_base: Array<{
    type: string;
    content: string;
    confidence: number;
  }>;
  last_inference: string;
  percepts: string[];
}

interface AgentAction {
  action: string;
  position: [number, number];
  reasoning: string;
}

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastAction, setLastAction] = useState<AgentAction | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning && gameState && !gameState.game_over) {
      intervalRef.current = setInterval(() => {
        handleStep();
      }, 500);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, gameState]);

  const connectWebSocket = () => {
    setConnectionStatus('connecting');
    wsRef.current = new WebSocket(`ws://${window.location.hostname}:8000/ws`);
    
    wsRef.current.onopen = () => {
      setConnectionStatus('connected');
      console.log('WebSocket connected');
    };
    
    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'game_state') {
        setGameState(message.data);
      } else if (message.type === 'agent_action') {
        setLastAction(message.data);
      }
    };
    
    wsRef.current.onclose = () => {
      setConnectionStatus('disconnected');
      console.log('WebSocket disconnected');
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
    };
  };

  const handleReset = async () => {
    setIsRunning(false);
    try {
      await fetch(`http://${window.location.hostname}:8000/api/reset`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to reset game:', error);
    }
  };

  const handleStart = async () => {
    setIsRunning(true);
    try {
      await fetch(`http://${window.location.hostname}:8000/api/start`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to start game:', error);
      setIsRunning(false);
    }
  };

  const handleStep = async () => {
    try {
      await fetch(`http://${window.location.hostname}:8000/api/step`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to execute step:', error);
    }
  };

  const handleUploadEnv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await fetch(`http://${window.location.hostname}:8000/api/upload_env`, {
        method: "POST",
        body: formData,
      });
      setIsRunning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      alert("Failed to upload environment file.");
    }
  };

  const getCellDisplay = (cell: string, x: number, y: number) => {
    const isAgent = gameState && gameState.agent_pos[0] === x && gameState.agent_pos[1] === y;
    
    let content = '';
    let bgColor = 'bg-slate-50';
    let textColor = 'text-slate-600';
    let borderColor = 'border-slate-200';
    
    if (isAgent) {
      content = '🤖';
      bgColor = 'bg-blue-100';
      borderColor = 'border-blue-300';
    } else if (cell.includes('W')) {
      content = '👹';
      bgColor = 'bg-red-100';
      borderColor = 'border-red-300';
    } else if (cell.includes('P')) {
      content = '🕳️';
      bgColor = 'bg-gray-800';
      textColor = 'text-white';
      borderColor = 'border-gray-600';
    } else if (cell.includes('G')) {
      content = '🏆';
      bgColor = 'bg-yellow-100';
      borderColor = 'border-yellow-300';
    }
    
    return { content, bgColor, textColor, borderColor };
  };

  const getPlayingCellDisplay = (val: string, x: number, y: number) => {
    const isAgent = gameState && gameState.agent_pos[0] === x && gameState.agent_pos[1] === y;
    
    let content = '';
    let bgColor = 'bg-slate-50';
    let textColor = 'text-slate-600';
    let borderColor = 'border-slate-200';
    
    if (isAgent) {
      content = '🤖';
      bgColor = 'bg-blue-200';
      borderColor = 'border-blue-400';
    } else if (val === "0") {
      content = '';
      bgColor = 'bg-slate-50';
    } else if (val === "1") {
      content = '✓';
      bgColor = 'bg-green-200';
      textColor = 'text-green-800';
      borderColor = 'border-green-400';
    } else if (val === "99") {
      content = '🏆';
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-600';
      borderColor = 'border-yellow-300';
    } else if (val === "-1") {
      content = 'W?';
      bgColor = 'bg-yellow-200';
      textColor = 'text-yellow-800';
      borderColor = 'border-yellow-400';
    } else if (val === "-2") {
      content = 'P?';
      bgColor = 'bg-cyan-200';
      textColor = 'text-cyan-800';
      borderColor = 'border-cyan-400';
    } else if (val === "-3") {
      content = 'W!';
      bgColor = 'bg-red-200';
      textColor = 'text-red-800';
      borderColor = 'border-red-400';
    } else if (val === "-4") {
      content = 'P!';
      bgColor = 'bg-gray-600';
      textColor = 'text-white';
      borderColor = 'border-gray-400';
    } else if (val === "-5") {
      content = '?';
      bgColor = 'bg-purple-200';
      textColor = 'text-purple-800';
      borderColor = 'border-purple-400';
    } else if (val === "-6") {
      content = '⚠️';
      bgColor = 'bg-orange-200';
      textColor = 'text-orange-800';
      borderColor = 'border-orange-400';
    } else if (val === "S") {
      content = '💀';
      bgColor = 'bg-purple-100';
      textColor = 'text-purple-600';
      borderColor = 'border-purple-300';
    } else if (val === "B") {
      content = '💨';
      bgColor = 'bg-cyan-100';
      textColor = 'text-cyan-600';
      borderColor = 'border-cyan-300';
    } else if (val === "T") {
      content = '💀💨';
      bgColor = 'bg-indigo-100';
      textColor = 'text-indigo-600';
      borderColor = 'border-indigo-300';
    }
    
    return { content, bgColor, textColor, borderColor };
  };

  const getPerceptsDisplay = () => {
    if (!gameState?.percepts || gameState.percepts.length === 0) {
      return '👁️ No percepts';
    }
    
    const perceptIcons: { [key: string]: string } = {
      'Breeze': '💨',
      'Stench': '💀',
      'Glitter': '✨',
      'Bump': '🚫',
      'Scream': '😱'
    };
    
    return gameState.percepts.map(percept => 
      `${perceptIcons[percept] || '❓'} ${percept}`
    ).join(' | ');
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Initializing Wumpus AI Agent</h2>
          <p className="text-green-200">
            Status: {connectionStatus === 'connecting' ? 'Connecting to server...' : 
                     connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-[Poppins] text-white bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen">
      <header className="border-b border-green-900 bg-black/30 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-green-400" />
              <h1 className="text-2xl font-bold text-green-300 tracking-widest">Wumpus AI</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ring-1 ring-inset ring-green-500/30 ${
                connectionStatus === 'connected' ? 'bg-green-900 text-green-300' :
                connectionStatus === 'connecting' ? 'bg-yellow-900 text-yellow-300' :
                'bg-red-900 text-red-300'
              }`}>{connectionStatus}</span>
              <button onClick={handleReset} className="px-4 py-2 rounded-lg shadow bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-sm font-semibold">
                <RotateCcw className="w-4 h-4 mr-2 inline" /> Reset
              </button>
              <button onClick={isRunning ? () => setIsRunning(false) : handleStart} className={`px-4 py-2 rounded-lg shadow text-sm font-semibold ${isRunning ? 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600' : 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500'}`}>
                {isRunning ? <Pause className="w-4 h-4 mr-2 inline" /> : <Play className="w-4 h-4 mr-2 inline" />} {isRunning ? 'Pause' : 'Start'}
              </button>
              <button onClick={handleStep} disabled={gameState?.game_over} className="px-4 py-2 rounded-lg shadow bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-sm font-semibold disabled:opacity-40">
                <Zap className="w-4 h-4 mr-2 inline" /> Step
              </button>
              <label className="px-4 py-2 rounded-lg shadow bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-sm font-semibold cursor-pointer">
                <input type="file" ref={fileInputRef} onChange={handleUploadEnv} style={{ display: 'none' }} /> Upload Env
              </label>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-4 border border-green-700 rounded-lg shadow-inner">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-green-400">
              <Target className="w-5 h-5 mr-2" /> Game Grid
            </h2>
            <div className="grid grid-cols-10 gap-1">
              {gameState.grid.map((row, y) => row.map((cell, x) => {
                const { content, bgColor, textColor, borderColor } = getCellDisplay(cell, x, y);
                return (
                  <div key={`main-${x}-${y}`} className={`w-8 h-8 ${bgColor} ${textColor} ${borderColor} border-2 flex items-center justify-center rounded shadow-sm hover:scale-105 transition-all duration-200`}>
                    {content}
                  </div>
                );
              }))}
            </div>
          </div>

          <div className="p-4 border border-cyan-700 rounded-lg shadow-inner">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-cyan-300">
              <Brain className="w-5 h-5 mr-2" /> Agent Knowledge
            </h2>
            <div className="grid grid-cols-10 gap-1">
              {gameState.playing_grid.map((row, y) => row.map((val, x) => {
                const { content, bgColor, textColor, borderColor } = getPlayingCellDisplay(val, x, y);
                return (
                  <div key={`playing-${x}-${y}`} className={`w-8 h-8 ${bgColor} ${textColor} ${borderColor} border-2 flex items-center justify-center rounded shadow-sm hover:scale-105 transition-all duration-200`}>
                    {content}
                  </div>
                );
              }))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="neon-panel">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-lime-400" /> Agent Status
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span>Position:</span><span>({gameState.agent_pos[0]}, {gameState.agent_pos[1]})</span></div>
              <div className="flex justify-between"><span>Status:</span><span className={gameState.game_over ? (gameState.agent_alive ? 'text-yellow-300' : 'text-red-400') : 'text-green-400'}>{gameState.game_over ? (gameState.agent_alive ? 'Victory' : 'Defeated') : 'Active'}</span></div>
              <div className="flex justify-between"><span>Has Gold:</span><span className={gameState.has_gold ? 'text-yellow-400' : 'text-gray-400'}>{gameState.has_gold ? '✅ Yes' : '❌ No'}</span></div>
            </div>
          </div>

          <div className="neon-panel">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-teal-400" /> Percepts
            </h3>
            <div className="text-sm bg-black/30 rounded-lg p-3">
              {getPerceptsDisplay()}
            </div>
          </div>

          {lastAction && (
            <div className="neon-panel">
              <h3 className="text-lg font-semibold mb-3 text-green-300">Last Action</h3>
              <div className="text-sm space-y-1">
                <div>Action: <span className="bg-black/20 px-2 py-1 rounded ml-1">{lastAction.action}</span></div>
                <div className="text-xs text-gray-300">{lastAction.reasoning}</div>
              </div>
            </div>
          )}
        </div>

        <div className="neon-panel">
          <h3 className="text-lg font-semibold mb-4 text-green-200">Knowledge Base ({gameState?.knowledge_base.length})</h3>
          <div className="max-h-64 overflow-y-auto space-y-2 text-sm">
            {gameState?.knowledge_base.slice(-10).map((item, idx) => (
              <div key={idx} className="bg-black/30 p-2 rounded border-l-4" style={{ borderColor: item.type === 'fact' ? '#22c55e' : '#a1a1aa' }}>
                <span className="font-semibold mr-2">[{item.type.toUpperCase()}]</span>
                <span>{item.content}</span>
              </div>
            ))}
            {gameState.knowledge_base.length === 0 && <div className="text-gray-400">No knowledge yet</div>}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App; 