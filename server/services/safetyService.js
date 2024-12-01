const fetch = require("node-fetch");
const tmapService = require('./tmapService'); // tmapService 모듈 가져오기

const storeService = {
  getStoreData: async (coordinates) => {
    try {
      if (!coordinates || coordinates.length === 0) {
        throw new Error('유효하지 않은 좌표 데이터');
      }

      const midIndex = Math.floor(coordinates.length / 2);
      const midCoord = coordinates[midIndex];

      if (!Array.isArray(midCoord) || midCoord.length < 2) {
        console.error('유효하지 않은 중간 지점 좌표:', midCoord);
        throw new Error('유효하지 않은 중간 지점 좌표');
      }

      const midPoint = {
        latitude: parseFloat(midCoord[1]),
        longitude: parseFloat(midCoord[0])
      };

      console.log('편의점 검색 중심점:', midPoint);

      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=CS2&x=${midPoint.longitude}&y=${midPoint.latitude}&radius=1000&size=15`,
        {
          headers: {
            Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`편의점 데이터 가져오기 실패: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.documents) {
        throw new Error('유효하지 않은 데이터 형식');
      }

      return data.documents.map(store => ({
        name: store.place_name,
        latitude: parseFloat(store.y),
        longitude: parseFloat(store.x),
        address: store.road_address_name || store.address_name,
        distance: parseFloat(store.distance)
      }));

    } catch (error) {
      console.error('편의점 데이터 요청 실패:', error);
      return [];
    }
  }
};

const safetyService = {
  calculateRouteSafety: async (routes, cctvData) => {
    return Promise.all(routes.map(async route => {
      const pathCoordinates = route.features[0].geometry.coordinates;
      let coveredSegments = 0;
      const totalSegments = pathCoordinates.length - 1;
      const uniqueCCTVs = new Set();
      const uniqueStores = new Set();
      const nearbyCCTVs = [];
      const nearbyStores = [];
      
      // 편의점 데이터 가져오기
      const storeData = await storeService.getStoreData(pathCoordinates);
      
      pathCoordinates.forEach((coord, index) => {
        if (index >= pathCoordinates.length - 1) return;

        let segmentHasCCTV = false;
        let segmentHasStore = false;
        
        // CCTV 검사
        cctvData.forEach(cctv => {
          const distance = calculateDistance(
            coord[1], 
            coord[0], 
            cctv.latitude,
            cctv.longitude
          );
          
          if (distance <= 80) {
            if (!segmentHasCCTV) {
              coveredSegments++;
              segmentHasCCTV = true;
            }
            const cctvKey = `${cctv.latitude}-${cctv.longitude}`;
            if (!uniqueCCTVs.has(cctvKey)) {
              uniqueCCTVs.add(cctvKey);
              nearbyCCTVs.push(cctv);
            }
          }
        });

        // 편의점 검사
        storeData.forEach(store => {
          const distance = calculateDistance(
            coord[1],
            coord[0],
            store.latitude,
            store.longitude
          );

          if (distance <= 80) {
            if (!segmentHasStore) {
              coveredSegments++;
              segmentHasStore = true;
            }
            const storeKey = `${store.latitude}-${store.longitude}`;
            if (!uniqueStores.has(storeKey)) {
              uniqueStores.add(storeKey);
              nearbyStores.push(store);
            }
          }
        });
      });

      const coverageRatio = totalSegments > 0 ? Math.min((coveredSegments / totalSegments) * 100, 100) : 0;

      return {
        ...route,
        safety: {
          grade: safetyService.calculateSafetyGrade(coverageRatio, uniqueCCTVs.size, uniqueStores.size),
          cctvCount: uniqueCCTVs.size,
          storeCount: uniqueStores.size,
          coverageRatio: Math.round(coverageRatio)
        },
        nearbyCCTVs,
        nearbyStores
      };
    }));
  },

  calculateSafetyGrade: (coverageRatio, cctvCount, storeCount) => {
    const totalSafetyPoints = cctvCount + (cctvCount * 0.5) + (storeCount * 0.5);

    if (coverageRatio >= 80 && totalSafetyPoints >= 6) {
      return 'A';
    } else if (coverageRatio >= 60 && totalSafetyPoints >= 4) {
      return 'B';
    } else if (coverageRatio >= 40 && totalSafetyPoints >= 2) {
      return 'C';
    } else {
      return 'D';
    }
  },

  selectBestRoute: (routes) => {
    if (!routes || routes.length === 0) {
      return null;
    }

    const calculateSafetyScore = (route) => {
      const safety = route.safety;
      const gradeScore = {
        'A': 100,
        'B': 70,
        'C': 30
      };

      let score = gradeScore[safety.grade] || 0;
      score += Math.min(safety.cctvCount * 2, 20);
      score += Math.min(safety.storeCount * 1, 10);
      score += safety.coverageRatio * 0.2;

      return score;
    };

    return routes.reduce((best, current) => {
      const currentScore = calculateSafetyScore(current);
      const bestScore = best ? calculateSafetyScore(best) : -1;

      return currentScore > bestScore ? current : best;
    }, null);
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

module.exports = { safetyService, storeService };
