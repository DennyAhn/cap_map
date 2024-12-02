import React, { useState } from "react";
import Map from "./components/map/Map";
import CustomSettingsPanel from "./components/map/CustomSettingsPanel";
import RouteSelectionScreen from "./components/search/RouteSelectionScreen";
import "./App.css";

const App = () => {
  const [selectedMode, setSelectedMode] = useState('일반');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);

  const handleModeChange = (mode) => {
    setSelectedMode(mode);
  };

  const handleDestinationSelect = (destination) => {
    setSelectedDestination(destination);
    setIsSearchOpen(false);
  };

  const handleRouteBack = () => {
    setSelectedDestination(null);
  };

  return (
    <div className="App">
      {selectedDestination ? (
        <RouteSelectionScreen 
          destination={selectedDestination}
          onBack={handleRouteBack}
        />
      ) : (
        <>
          <Map 
            selectedMode={selectedMode}
            isSearchOpen={isSearchOpen}
            setIsSearchOpen={setIsSearchOpen}
            onNavigate={handleDestinationSelect}
          />
          {!isSearchOpen && (
            <CustomSettingsPanel 
              onModeChange={handleModeChange}
              selectedMode={selectedMode}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;