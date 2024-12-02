import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SearchScreen.css';
import RouteSelectionScreen from './RouteSelectionScreen';

const SearchScreen = ({ onClose, onNavigate, isStartLocation = false }) => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // 카카오 키워드 검색 API 호출
  const searchPlaces = async (keyword) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    // 로딩 상태는 유지하되 화면에 표시하지 않음
    setIsLoading(true);
    try {
      const response = await axios.get(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}`,
        {
          headers: {
            Authorization: `KakaoAK ${process.env.REACT_APP_KAKAO_API_KEY}`
          }
        }
      );

      const places = response.data.documents.map(place => ({
        id: place.id,
        name: place.place_name,
        address: place.road_address_name || place.address_name,
        coords: {
          latitude: place.y,
          longitude: place.x
        }
      }));

      setSearchResults(places);
    } catch (error) {
      console.error('장소 검색 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Google Places Autocomplete 설정
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      const searchInput = document.getElementById('search-input');
      const autocomplete = new window.google.maps.places.Autocomplete(searchInput, {
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'kr' }
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const placeData = {
            id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            coords: {
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng()
            }
          };
          setSearchResults([placeData]);
        }
      });
    }
  }, []);

  // 검색어 변경 시 API 호출
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      searchPlaces(searchText);
    }, 100);

    return () => clearTimeout(delayDebounce);
  }, [searchText]);

  const handleRouteSelect = (place) => {
    if (isStartLocation) {
      onNavigate(place);
    } else {
      setSelectedDestination(place);
    }
  };

  const handleBack = () => {
    setSelectedDestination(null);
  };

  if (selectedDestination) {
    return (
      <RouteSelectionScreen 
        destination={selectedDestination}
        onBack={handleBack}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="search-screen">
      <div className="search-header">
        <button className="back-button" onClick={onClose}>
          ←
        </button>
        <div className="search-input-container">
          <span className="search-icon">🔍</span>
          <input
            id="search-input"
            type="text"
            placeholder={isStartLocation ? "출발지 검색" : "도착지 검색"}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            autoFocus
          />
          {searchText && (
            <button 
              className="clear-button"
              onClick={() => setSearchText('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="search-results">
        {/* 로딩 중이어도 기존 결과를 계속 표시 */}
        {searchResults.map((result) => (
          <div key={result.id} className="result-item">
            <div className="result-info">
              <h3 className="result-name">{result.name}</h3>
              <p className="result-address">{result.address}</p>
            </div>
            <button 
              className="find-route-button"
              onClick={() => handleRouteSelect(result)}
            >
              {isStartLocation ? "선택" : "길찾기"}
            </button>
          </div>
        ))}
        {/* 검색 결과가 없을 때만 메시지 표시 */}
        {!isLoading && searchText && searchResults.length === 0 && (
          <div className="no-results">검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  );
};

export default SearchScreen; 