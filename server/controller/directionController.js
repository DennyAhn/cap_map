const fetch = require("node-fetch");

const getDirection = async (req, res) => {
  const { start, goal } = req.query;

  // 입력값 유효성 검사
  if (!start || !goal) {
    return res.status(400).json({
      success: false,
      error: "출발지와 도착지 좌표가 필요합니다."
    });
  }

  try {
    // 좌표 파싱 및 유효성 검사
    const [startX, startY] = start.split(",").map(coord => parseFloat(coord));
    const [endX, endY] = goal.split(",").map(coord => parseFloat(coord));

    if ([startX, startY, endX, endY].some(coord => isNaN(coord))) {
      return res.status(400).json({
        success: false,
        error: "유효하지 않은 좌표값입니다."
      });
    }

    // API 키 확인
    if (!process.env.TMAP_API_KEY) {
      throw new Error("TMAP API 키가 설정되지 않았습니다.");
    }

    // TMAP API 요청
    const url = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "appKey": process.env.TMAP_API_KEY,
      },
      body: JSON.stringify({
        startX,
        startY,
        endX,
        endY,
        reqCoordType: "WGS84GEO",
        resCoordType: "WGS84GEO",
        startName: "출발지",
        endName: "도착지",
      }),
    });

    // 응답 확인 및 에러 처리
    if (!response.ok) {
      const errorText = await response.text();
      console.error("TMAP API 오류 응답:", errorText);
      throw new Error(`TMAP API 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // 응답 데이터 유효성 검사
    if (!data.features || !Array.isArray(data.features)) {
      throw new Error("유효하지 않은 응답 데이터입니다.");
    }

    // 성공 응답
    res.json({
      success: true,
      data: {
        ...data,
        totalDistance: data.features[0]?.properties?.totalDistance || 0,
        totalTime: data.features[0]?.properties?.totalTime || 0,
      }
    });

  } catch (error) {
    console.error("TMAP 도보 경로 요청 에러:", error);
    
    // 클라이언트에게 전달할 에러 메시지
    res.status(500).json({
      success: false,
      error: error.message || "경로 검색 중 오류가 발생했습니다.",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = { getDirection };