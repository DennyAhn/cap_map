import React, { useEffect, useRef, useState } from 'react';
import MapService from './MapService';
import RouteService from './RouteService';

const MapComponent = ({ startCoords, goalCoords }) => {
  const mapRef = useRef(null);
  const [routeType, setRouteType] = useState('normal');
  const [routeInfo, setRouteInfo] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const mapService = useRef(null);
  const routeService = useRef(null);
  const locationWatcher = useRef(null);

  // 지도 초기화
  useEffect(() => {
    const initializeMap = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const initialPosition = { latitude, longitude };

            setCurrentLocation(initialPosition);
            if (window.naver && window.naver.maps) {
              mapService.current = new MapService(mapRef.current, initialPosition);
              routeService.current = new RouteService(mapService.current.getMapInstance());
              mapService.current.setCurrentLocation(initialPosition);
            }
          },
          (error) => {
            console.error('현재 위치를 가져올 수 없습니다:', error);
          }
        );
      }
    };

    initializeMap();
  }, []);

  // 실시간 위치 추적
  useEffect(() => {
    const startWatchingLocation = () => {
      if (!navigator.geolocation) {
        console.error('Geolocation is not supported by this browser.');
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      };

      locationWatcher.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const updatedPosition = { latitude, longitude };
          
          setCurrentLocation(updatedPosition);

          if (mapService.current) {
            mapService.current.updateCurrentLocationMarker(updatedPosition);
            mapService.current.panToLocation(updatedPosition);
          }
        },
        (error) => {
          console.error('실시간 위치 추적 실패:', error);
          switch(error.code) {
            case error.PERMISSION_DENIED:
              alert("위치 정보 접근 권한이 거부되었습니다.");
              break;
            case error.POSITION_UNAVAILABLE:
              alert("위치 정보를 사용할 수 없습니다.");
              break;
            case error.TIMEOUT:
              alert("위치 정보 요청 시간이 초과되었습니다.");
              break;
            default:
              alert("알 수 없는 오류가 발생했습니다.");
          }
        },
        options
      );
    };

    startWatchingLocation();

    return () => {
      if (locationWatcher.current) {
        navigator.geolocation.clearWatch(locationWatcher.current);
        locationWatcher.current = null;
      }
    };
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

  return (
    <div style={{ 
      position: 'absolute', 
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%'
    }}>
      {/* 경로 타입 선택 버튼 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 100,
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={() => setRouteType('normal')}
          style={{
            padding: '8px 16px',
            backgroundColor: routeType === 'normal' ? '#2db400' : '#fff',
            color: routeType === 'normal' ? '#fff' : '#333',
            border: '1px solid #2db400',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          일반 경로
        </button>
        <button
          onClick={() => setRouteType('safe')}
          style={{
            padding: '8px 16px',
            backgroundColor: routeType === 'safe' ? '#4CAF50' : '#fff',
            color: routeType === 'safe' ? '#fff' : '#333',
            border: '1px solid #4CAF50',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          안전 경로
        </button>
      </div>

      <div ref={mapRef} style={{ 
        width: '100%', 
        height: '100%',
        position: 'absolute'
      }} />

      {routeInfo?.error && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          backgroundColor: '#fff3f3',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          color: '#ff0000',
          zIndex: 100
        }}>
          {routeInfo.error}
        </div>
      )}
    </div>
  );
};

export default MapComponent;
