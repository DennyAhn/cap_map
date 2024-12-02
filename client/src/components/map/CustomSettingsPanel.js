import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import './CustomSettingsPanel.css';

// 사용자 설정 패널 컴포넌트
// 드래그 가능한 바텀 시트 형태의 설정 패널 제공

const CustomSettingsPanel = ({ onModeChange, selectedMode }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef(null);
  const lastY = useRef(0);

  const handleModeSelect = useCallback((mode) => {
    onModeChange(mode);
    setIsPanelOpen(false);
    setDragOffset(0);
  }, [onModeChange]);

  // 패널 드래그 시작 처리
  const handleStart = useCallback((clientY) => {
    setIsDragging(true);
    lastY.current = clientY;
    setDragStart({
      y: clientY,
      offset: dragOffset
    });
  }, [dragOffset]);

  // 패널 드래그 중 처리
  const handleMove = useCallback((clientY) => {
    if (!isDragging || !dragStart) return;
    
    const diff = dragStart.y - clientY;
    const newOffset = Math.max(0, Math.min(diff, 150));
    setDragOffset(newOffset);
  }, [dragStart, isDragging]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;

    if (dragOffset > 50) {
      setIsPanelOpen(true);
      setDragOffset(150);
    } else {
      setIsPanelOpen(false);
      setDragOffset(0);
    }

    setIsDragging(false);
    setDragStart(null);
  }, [dragOffset, isDragging]);

  const handleTouchStart = useCallback((e) => {
    handleStart(e.touches[0].clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e) => {
    handleMove(e.touches[0].clientY);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.drag-handle')) {
      handleStart(e.clientY);
    }
  }, [handleStart]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      handleMove(e.clientY);
    }
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const getPanelStyle = () => {
    if (isDragging) {
      return {
        transform: `translateY(${Math.max(0, Math.min(100 - (dragOffset / 150) * 100, 100))}%)`
      };
    }
    return {};
  };

  return (
    <div 
      className={`settings-panel ${isPanelOpen ? 'open' : ''} ${isDragging ? 'dragging' : ''}`}
      style={getPanelStyle()}
      ref={panelRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="panel-header">
        <div className="drag-handle" />
        <span className="panel-title">사용자 맞춤 설정</span>
      </div>
      <div className="panel-content">
        <div className="settings-section">
          <div className="user-type-buttons">
            <button 
              type="button"
              className={`user-type-button ${selectedMode === '일반' ? 'active' : ''}`}
              onClick={() => handleModeSelect('일반')}
            >
              <div className="icon-circle">
                <span className="icon">👤</span>
              </div>
              <span>일반</span>
            </button>
            <button 
              type="button"
              className={`user-type-button ${selectedMode === '여성' ? 'active' : ''}`}
              onClick={() => handleModeSelect('여성')}
            >
              <div className="icon-circle">
                <span className="icon">👩</span>
              </div>
              <span>여성</span>
            </button>
            <button 
              type="button"
              className={`user-type-button ${selectedMode === '노약자' ? 'active' : ''}`}
              onClick={() => handleModeSelect('노약자')}
            >
              <div className="icon-circle">
                <span className="icon">♿</span>
              </div>
              <span>노약자</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

CustomSettingsPanel.propTypes = {
  onModeChange: PropTypes.func.isRequired,
  selectedMode: PropTypes.string
};

CustomSettingsPanel.defaultProps = {
  selectedMode: '일반'
};

export default CustomSettingsPanel;