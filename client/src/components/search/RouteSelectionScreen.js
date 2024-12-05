import React, { useState, useEffect, useRef, useCallback } from 'react';
import SearchScreen from './SearchScreen';
import MapService from '../map/MapService';
import RouteService from '../map/RouteService';
import RouteInfoPanel from '../map/s_bt';
import './RouteSelectionScreen.css';
import axios from 'axios';

const RouteSelectionScreen = ({ destination, onBack, onNavigate }) => {
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [startLocation, setStartLocation] = useState(null);
  const [routeType, setRouteType] = useState('normal');
  const [routeInfo, setRouteInfo] = useState(null);
  const mapRef = useRef(null);
  const mapServiceRef = useRef(null);
  const routeServiceRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  // drawRoute를 useCallback으로 감싸서 메모이제이션
  const drawRoute = useCallback(async () => {
    if (!routeServiceRef.current) return;
    
    try {
      const result = await routeServiceRef.current.drawRoute(
        startLocation?.coords,
        destination?.coords,
        routeType
      );
      setRouteInfo(result);
    } catch (error) {
      console.error('경로 그리기 실패:', error);
      setRouteInfo({ error: '경로를 찾을 수 없습니다.' });
    }
  }, [startLocation, destination, routeType]);

  // 맵 초기화 useEffect 수정
  useEffect(() => {
    if (mapRef.current) {
      // 시작 위치가 없어도 맵을 초기화하도록 변경
      const initialCoords = startLocation?.coords || {
        latitude: 37.5665, // 서울시청 좌표(기본값)
        longitude: 126.9780
      };
      
      mapServiceRef.current = new MapService(mapRef.current, initialCoords);
      routeServiceRef.current = new RouteService(mapServiceRef.current.getMapInstance());
      
      if (startLocation) {
        mapServiceRef.current.setCurrentLocation(startLocation.coords);
      }
    }
  }, [mapRef.current]); // 의존성 배열 수정

  // 경로 그리기는 별도의 useEffect로 분리
  useEffect(() => {
    if (startLocation && destination && routeServiceRef.current) {
      drawRoute();
    }
  }, [startLocation, destination, routeType, drawRoute]);

  // 거리 포맷팅
  const formatDistance = (meters) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // 시간 포맷팅
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}시간 ${remainingMinutes}분`;
  };

  const handleStartLocationClick = () => {
    setIsSearchingStart(true);
  };

  const handleDestinationClick = () => {
    setIsSearchingDestination(true);
  };

  const handleStartLocationSelect = (location) => {
    setStartLocation(location);
    setIsSearchingStart(false);
  };

  // 컴포넌트 마운트 시 현재 위치 가져오기
  useEffect(() => {
    const getCurrentLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              // 카카오 API를 사용하여 현재 위치의 주소 정보 가져오기
              const response = await axios.get(
                `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${position.coords.longitude}&y=${position.coords.latitude}`,
                {
                  headers: {
                    Authorization: `KakaoAK ${process.env.REACT_APP_KAKAO_API_KEY}`
                  }
                }
              );

              const addressInfo = response.data.documents[0];
              const locationData = {
                id: 'current-location',
                name: '현재 위치',
                address: addressInfo.road_address?.address_name || addressInfo.address?.address_name,
                coords: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                }
              };
              
              setCurrentLocation(locationData);
              setStartLocation(locationData); // 현재 위치를 출발지로 자동 설정
            } catch (error) {
              console.error('주소 변환 실패:', error);
            }
          },
          (error) => {
            console.error('현재 위치를 가져올 수 없습니다:', error);
          }
        );
      }
    };

    getCurrentLocation();
  }, []);

  if (isSearchingDestination) {
    onBack();
    return null;
  }

  if (isSearchingStart) {
    return (
      <SearchScreen 
        onClose={() => setIsSearchingStart(false)}
        onNavigate={handleStartLocationSelect}
        isStartLocation={true}
      />
    );
  }

  const handleBackClick = () => {
    if (isSearchingStart) {
      setIsSearchingStart(false);
    } else if (isSearchingDestination) {
      setIsSearchingDestination(false);
    } else {
      onBack();
    }
  };

  return (
    <div className="route-selection-screen">
      <div className="route-header">
        <div className="header-top">
          <button className="back-button" onClick={handleBackClick}>
            ✕
          </button>
        </div>
        <div className="location-inputs">
          <div 
            className="input-row clickable"
            onClick={handleStartLocationClick}
          >
            <span className="location-icon">⬆️</span>
            <input 
              type="text" 
              placeholder="현재 위치 확인 중..."
              className="location-input"
              value={startLocation ? startLocation.name : ''}
              readOnly
            />
          </div>
          <div 
            className="input-row clickable"
            onClick={handleDestinationClick}
          >
            <span className="location-icon">⬇️</span>
            <input 
              type="text" 
              value={destination.name}
              className="location-input"
              readOnly
            />
          </div>
        </div>
      </div>
      
      <div className="transport-tabs">
        <button 
          className={`transport-tab ${routeType === 'normal' ? 'active' : ''}`}
          onClick={() => setRouteType('normal')}
        >
          <img 
            src="/images/RouteSelectionScreen/normal.svg" 
            alt="일반 경로"
            className="tab-icon"
          />
          <span className="tab-text">일반</span>
        </button>
        <button 
          className={`transport-tab ${routeType === 'safe' ? 'active' : ''}`}
          onClick={() => setRouteType('safe')}
        >
          <img 
            src="/images/RouteSelectionScreen/safe.svg" 
            alt="안전 경로"
            className="tab-icon"
          />
          <span className="tab-text">안전</span>
        </button>
      </div>

      {startLocation && destination && (
        <>
          <div className="map-container" ref={mapRef}></div>
          <RouteInfoPanel
            routeInfo={routeInfo}
            routeType={routeType}
            formatDistance={formatDistance}
            formatTime={formatTime}
          />
        </>
      )}
    </div>
  );
};

export default RouteSelectionScreen;