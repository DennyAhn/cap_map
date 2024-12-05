import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SearchScreen.css';
import RouteSelectionScreen from './RouteSelectionScreen';

const SearchScreen = ({ onClose, onNavigate, isStartLocation = false }) => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // 카카오 장소 검색 API 호출 (키워드 + 주소)
  const searchPlaces = async (keyword) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // 키워드 검색과 주소 검색을 동시에 실행
      const [keywordResponse, addressResponse] = await Promise.all([
        axios.get(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}`,
          {
            headers: {
              Authorization: `KakaoAK ${process.env.REACT_APP_KAKAO_API_KEY}`
            }
          }
        ),
        axios.get(
          `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(keyword)}`,
          {
            headers: {
              Authorization: `KakaoAK ${process.env.REACT_APP_KAKAO_API_KEY}`
            }
          }
        )
      ]);

      // 키워드 검색 결과 처리
      const keywordPlaces = keywordResponse.data.documents.map(place => ({
        id: place.id,
        name: place.place_name,
        address: place.road_address_name || place.address_name,
        coords: {
          latitude: place.y,
          longitude: place.x
        }
      }));

      // 주소 검색 결과 처리
      const addressPlaces = addressResponse.data.documents.map(place => ({
        id: place.id || `addr-${place.address_name}`, // 주소 검색의 경우 고유 ID가 없을 수 있음
        name: place.address_name,
        address: place.road_address?.address_name || place.address_name,
        coords: {
          latitude: place.y,
          longitude: place.x
        }
      }));

      // 중복 제거를 위해 Set 사용
      const combinedPlaces = [...keywordPlaces, ...addressPlaces];
      const uniquePlaces = Array.from(new Set(combinedPlaces.map(place => JSON.stringify(place))))
        .map(str => JSON.parse(str));

      setSearchResults(uniquePlaces);
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
            name: place.name || place.formatted_address,
            address: place.formatted_address,
            coords: {
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng()
            },
            source: 'google' // 구글 결과임을 표시
          };
          
          // 기존 검색 결과와 통합
          setSearchResults(prevResults => {
            const newResults = [...prevResults];
            // 중복 제거를 위해 같은 place_id를 가진 결과 제거
            const existingIndex = newResults.findIndex(r => r.id === place.place_id);
            if (existingIndex !== -1) {
              newResults.splice(existingIndex, 1);
            }
            // 구글 결과를 맨 위에 추가
            return [placeData, ...newResults];
          });
        }
      });

      // 예측 결과 변경 이벤트 리스너 추가
      const getPredictions = (input) => {
        const service = new window.google.maps.places.AutocompleteService();
        service.getPlacePredictions({
          input,
          componentRestrictions: { country: 'kr' }
        }, (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
            
            // 각 예측 결과에 대해 상세 정보 가져오기
            predictions.forEach(prediction => {
              placesService.getDetails({
                placeId: prediction.place_id,
                fields: ['name', 'formatted_address', 'geometry']
              }, (place, detailStatus) => {
                if (detailStatus === window.google.maps.places.PlacesServiceStatus.OK) {
                  const placeData = {
                    id: place.place_id,
                    name: place.name || prediction.structured_formatting.main_text,
                    address: place.formatted_address,
                    coords: {
                      latitude: place.geometry.location.lat(),
                      longitude: place.geometry.location.lng()
                    },
                    source: 'google'
                  };

                  setSearchResults(prevResults => {
                    const newResults = [...prevResults];
                    const existingIndex = newResults.findIndex(r => r.id === place.place_id);
                    if (existingIndex !== -1) {
                      newResults.splice(existingIndex, 1);
                    }
                    return [...newResults, placeData];
                  });
                }
              });
            });
          }
        });
      };

      // 검색어 변경시 예측 결과 가져오기
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (e.target.value) {
            getPredictions(e.target.value);
          }
        }, 300);
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
    if (selectedDestination) {
      setSelectedDestination(null);
    } else {
      setSearchText('');
      onClose();
    }
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
        <button className="back-button" onClick={handleBack}>
          ←
        </button>
        <div className="search-input-container">
          <img 
            src="/images/search_bar/mapspicy.png" 
            alt="mapspicy" 
            className="search-icon"
            style={{
              width: '24px',
              height: '24px',
              objectFit: 'contain',
              marginRight: '8px'
            }}
          />
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
          <img 
            src="/images/search_bar/mike.svg" 
            alt="음성 검색" 
            className="voice-icon"
            style={{ 
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              padding: '8px',
              marginLeft: '8px'
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
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