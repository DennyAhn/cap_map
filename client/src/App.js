import React, { useState } from "react";
import MapComponent from "./components/MapComponent";
import AddressToCoord from "./components/AddressToCoord"; // 파일명 수정

const App = () => {
  const [startCoords, setStartCoords] = useState(null);
  const [goalCoords, setGoalCoords] = useState(null);

  return (
    <div>
      
      <AddressToCoord 
        setStartCoords={setStartCoords} 
        setGoalCoords={setGoalCoords} 
      />
      <MapComponent 
        startCoords={startCoords} 
        goalCoords={goalCoords} 
      />
    </div>
  );
};

export default App;