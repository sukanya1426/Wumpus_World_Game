import React, { useState } from "react";
import Board from "./components/Board";
import KnowledgeBase from "./components/KnowledgeBase";

function App() {
  const [fileContent, setFileContent] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setFileContent(evt.target.result);
    };
    reader.readAsText(file);
  };

  return (
    <div className="App">
      <h1>Wumpus World</h1>
      <div>
        <label>
          Load Board from File:{" "}
          <input type="file" accept=".txt" onChange={handleFileUpload} />
        </label>
      </div>
      <div className="main-content">
        <Board fileContent={fileContent} />
        <KnowledgeBase />
      </div>
    </div>
  );
}

export default App;
