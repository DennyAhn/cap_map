import React, { useEffect, useRef, useState } from 'react';
import './MapComponent.css'; // CSS 파일 import
import MapService from './MapService';
import RouteService from './RouteService';
import RouteInfoPanel from './s_bt';  // 파일 import
import AddressToCoords from './AddressToCoord';

const MapComponent = () => {
  const mapRef = useRef(null);
  const [routeType, setRouteType] = useState('normal');
  const [routeInfo, setRouteInfo] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const [goalCoords, setGoalCoords] = useState(null);
  const mapService = useRef(null);
  const routeService = useRef(null);

  // 경로 초기화 함수
  const resetRouteInfo = () => {
    console.log("경로 초기화 호출됨");
    setRouteInfo(null);
  };

  // 지도 초기화
  useEffect(() => {
    mapService.current = new MapService(mapRef.current);
    routeService.current = new RouteService(mapService.current.getMapInstance());
    
    // 현재 위치 가져오기
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          mapService.current.setCurrentLocation(position.coords);
        },
        (error) => {
          console.error("현재 위치를 가져올 수 없습니다:", error);
        }
      );
    }
  }, []);

  // 경로 그리기
  useEffect(() => {
    const drawRoute = async () => {
      if (startCoords && goalCoords && routeService.current) {
        try {
          const result = await routeService.current.drawRoute(
            startCoords, 
            goalCoords, 
            routeType
          );
          setRouteInfo(result);
        } catch (error) {
          console.error('경로 그리기 실패:', error);
          setRouteInfo({ error: '경로 검색에 실패했습니다.' });
        }
      }
    };

    drawRoute();
  }, [startCoords, goalCoords, routeType]);

  // 거리 포맷팅 함수
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // 시간 포맷팅 함수
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}분`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}시간 ${remainingMinutes}분`;
  };

  return (
    <div className="map-container">
      <div ref={mapRef} className="map" />
      <AddressToCoords 
        setStartCoords={setStartCoords}
        setGoalCoords={setGoalCoords}
        resetRouteInfo={resetRouteInfo}
      />
      <div className="route-buttons">
        <button
          onClick={() => setRouteType('normal')}
          className={`route-button ${routeType === 'normal' ? 'active' : ''}`}
        >
          일반 경로
        </button>
        <button
          onClick={() => setRouteType('safe')}
          className={`route-button ${routeType === 'safe' ? 'active' : ''}`}
        >
          안전 경로
        </button>
      </div>
      <RouteInfoPanel 
        routeInfo={routeInfo}
        routeType={routeType}
        formatDistance={formatDistance}
        formatTime={formatTime}
      />
    </div>
  );
};

export default MapComponent;