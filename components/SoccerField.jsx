// 순수 표시용 컴포넌트. 세로(랜덤) 위치는 실제 데이터와 무관한 시각 효과라
// 여기서 직접 굴리지 않고(렌더 중 Math.random() 호출은 React 순수성 규칙
// 위반), 부모(PositionForm)가 슬라이더 이벤트 핸들러 안에서 미리 굴려
// verticalPercent prop으로 내려준다.
export default function SoccerField({ position, verticalPercent }) {
  return (
    <div className="relative mx-auto h-40 w-full max-w-md overflow-hidden rounded-md border-2 border-white bg-green-600 shadow-inner">
      {/* 중앙 세로선 */}
      <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-white/70" />
      {/* 중앙 서클 */}
      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />
      {/* 양 끝 골대 */}
      <div className="absolute left-1 top-1/2 h-16 w-4 -translate-y-1/2 border-2 border-white/70" />
      <div className="absolute right-1 top-1/2 h-16 w-4 -translate-y-1/2 border-2 border-white/70" />
      {/* 팀 진영 표시 */}
      <div className="absolute inset-y-0 left-0 w-1.5 bg-red-500" />
      <div className="absolute inset-y-0 right-0 w-1.5 bg-blue-500" />
      <span className="absolute left-2 top-2 text-xs font-bold text-red-100">
        Ant
      </span>
      <span className="absolute right-2 top-2 text-xs font-bold text-blue-100">
        Bike
      </span>
      {/* 공 마커: position(0~100)을 가로축 %로, 세로는 randomVerticalPercent로 매핑 */}
      <div
        aria-hidden="true"
        className="absolute text-2xl transition-all duration-500 ease-out"
        style={{
          left: `${position}%`,
          top: `${verticalPercent}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        ⚽
      </div>
    </div>
  );
}
