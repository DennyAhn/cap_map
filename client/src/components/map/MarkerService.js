/* global naver */

class MarkerService {
  constructor() {
    this.markers = new Map(); // 카테고리별 마커 저장
    this.activeInfoWindow = null; // 현재 열린 정보창 저장
    this.infoWindows = new Map(); // 마커별 정보창 캐시
    this.clickTimeout = null; // 클릭 디바운스를 위한 타이머
  }

  // 마커 추가/제거 토글 메서드
  toggleMarkers(mapInstance, places, category) {
    // 디바운스 처리
    if (this.toggleTimeout) {
      clearTimeout(this.toggleTimeout);
    }

    return new Promise((resolve) => {
      this.toggleTimeout = setTimeout(() => {
        // 이미 해당 카테고리의 마커가 있다면 모두 제거
        if (this.markers.has(category)) {
          const markers = this.markers.get(category);
          
          // 한 번에 모든 마커와 정보창 제거
          if (this.activeInfoWindow) {
            this.activeInfoWindow.close();
            this.activeInfoWindow = null;
          }

          // 마커 일괄 제거
          markers.forEach(marker => {
            this.infoWindows.delete(marker);
            marker.setMap(null);
          });

          this.markers.delete(category);
          resolve(false);
          return;
        }

        // 새로운 마커 일괄 생성 및 추가
        const newMarkers = places.map(place => {
          const marker = this.createMarker(mapInstance, place, category);
          const infoWindow = this.createInfoWindow(mapInstance, place, category);
          this.infoWindows.set(marker, infoWindow);
          this.addMarkerClickEvent(marker, infoWindow, mapInstance);
          return marker;
        });

        // 마커 일괄 추가
        this.markers.set(category, newMarkers);
        resolve(true);
      }, 10); // 디바운스 시간을 10ms로 줄임
    });
  }

  // 마커 생성 메서드
  createMarker(mapInstance, place, category) {
    return new naver.maps.Marker({
      position: new naver.maps.LatLng(place.latitude, place.longitude),
      map: mapInstance,
      title: place.name,
      icon: {
        content: this.createMarkerContent(category),
        size: new naver.maps.Size(30, 30),
        anchor: new naver.maps.Point(15, 15)
      }
    });
  }

  // 정보창 생성 메서드
  createInfoWindow(mapInstance, place, category) {
    return new naver.maps.InfoWindow({
      content: `
        <div style="padding: 15px; min-width: 200px;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px;">${place.name}</h3>
          ${this.getKoreanPlaceInfo(category, place)}
        </div>
      `,
      borderWidth: 0,
      disableAnchor: true,
      backgroundColor: 'white',
      borderColor: 'transparent',
      pixelOffset: new naver.maps.Point(0, -10)
    });
  }

  // 마커 클릭 이벤트 추가 메서드
  addMarkerClickEvent(marker, infoWindow, mapInstance) {
    let clickCount = 0;
    let clickTimer = null;

    naver.maps.Event.addListener(marker, 'click', () => {
      clickCount++;
      
      if (clickTimer) {
        clearTimeout(clickTimer);
      }

      clickTimer = setTimeout(() => {
        if (clickCount === 1) {
          // 단일 클릭
          if (this.activeInfoWindow === infoWindow) {
            infoWindow.close();
            this.activeInfoWindow = null;
          } else {
            if (this.activeInfoWindow) {
              this.activeInfoWindow.close();
            }
            infoWindow.open(mapInstance, marker);
            this.activeInfoWindow = infoWindow;
          }
        }
        clickCount = 0;
      }, 200);
    });
  }

  // 마커 제거 메서드
  removeMarkers(category) {
    if (this.markers.has(category)) {
      const markers = this.markers.get(category);
      
      // 정보창 일괄 제거
      if (this.activeInfoWindow) {
        this.activeInfoWindow.close();
        this.activeInfoWindow = null;
      }

      // 마커 일괄 제거
      markers.forEach(marker => {
        this.infoWindows.delete(marker);
        marker.setMap(null);
      });

      this.markers.delete(category);
    }
  }

  // 모든 마커 제거 메서드
  removeAllMarkers() {
    this.markers.forEach((markers, category) => {
      this.removeMarkers(category);
    });
    this.markers.clear();
    this.infoWindows.clear();
  }

  // 한글 정보 생성 메서드
  getKoreanPlaceInfo(category, place) {
    // 한글 주소 가져오기
    const getKoreanAddress = async (latitude, longitude) => {
      try {
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error('Google Maps API 키가 설정되지 않았습니다.');
          return '주소 정보를 불러올 수 없습니다.';
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=ko&key=${apiKey}`
        );
        
        if (!response.ok) {
          throw new Error('주소 변환 API 응답 오류');
        }

        const data = await response.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const address = data.results[0].formatted_address;
          return address.replace(/대한민국 /, ''); // '대한민국' 텍스트 제거
        } else {
          console.error('주소 변환 실패:', data.status);
          return '주소 정보를 불러올 수 없습니다.';
        }
      } catch (error) {
        console.error('주소 변환 오류:', error);
        return '주소 정보를 불러올 수 없습니다.';
      }
    };

    let info = `<p style="margin: 5px 0;">주소: <span class="korean-address" data-lat="${place.latitude}" data-lng="${place.longitude}">주소 불러오는 중...</span></p>`;
    
    // 주소 비동기 변환
    getKoreanAddress(place.latitude, place.longitude).then(koreanAddress => {
      const addressElements = document.getElementsByClassName('korean-address');
      Array.from(addressElements).forEach(element => {
        if (element.dataset.lat === String(place.latitude) && 
            element.dataset.lng === String(place.longitude)) {
          element.textContent = koreanAddress;
        }
      });
    });
    
    // 카테고리별 추가 정보
    switch(category) {
      case '편의점':
        info += `<p style="margin: 5px 0;">운영시간: 24시간</p>`;
        break;
      case '소방시설':
        info += `<p style="margin: 5px 0;">긴급전화: 119</p>`;
        break;
      case '경찰서':
        info += `<p style="margin: 5px 0;">긴급전화: 112</p>`;
        break;
      case '안전비상벨':
        info += `<p style="margin: 5px 0;">비상시 즉시 호출 가능</p>`;
        break;
      case 'CCTV':
        info += `<p style="margin: 5px 0;">24시간 촬영중</p>`;
        break;
      case '지하철역 엘레베이터':
        info += `<p style="margin: 5px 0;">운영시간: 첫차~막차</p>`;
        break;
      case '심야약국':
        info += `<p style="margin: 5px 0;">야간 운영 가능</p>`;
        break;
      default:
        break;
    }

    return info;
  }

  // 마커 아이콘 생성 메서드
  createMarkerContent(category) {
    const iconMap = {
      '편의점': '/images/icon/normal/store.png',
      '소방시설': '/images/icon/normal/oneonenine.png',
      '경찰서': '/images/icon/normal/police.png',
      '공사현장': '/images/icon/normal/gong4.png',
      '범죄주의구간': '/images/icon/normal/warning.png',
      '안전비상벨': '/images/icon/wemen/siren.png',
      'CCTV': '/images/icon/wemen/cctv.png',
      '지하철역 엘레베이터': '/images/icon/old/ele.svg',
      '심야약국': '/images/icon/old/drugstore.svg',
      '휠체어 전소': '/images/icon/old/charge.png',
      '복지시설': '/images/icon/old/noin.png'
    };

    const iconUrl = iconMap[category] || '/images/default-marker.png';

    return `
      <div style="
        width: 32px;
        height: 32px;
        background: url(${iconUrl}) no-repeat center;
        background-size: contain;
      "></div>
    `;
  }
}

export default MarkerService;
