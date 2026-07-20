import { useEffect, useRef, useState } from 'react';
import SoccerField from './SoccerField';

const SUBMIT_INTERVAL_MS = 3000;

function formatTime(date) {
  return date.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' });
}

// 경기장 위 공 마커의 세로(상하) 위치 - 실제 데이터와 무관한 순수 시각 효과.
function randomVerticalPercent() {
  return 25 + Math.random() * 50;
}

export default function PositionForm({
  matchId,
  ended,
  controllerToken,
  isController,
  lastPosition,
  onSubmitSuccess,
  onEnd,
}) {
  const [value, setValue] = useState(50);
  // 렌더 중(useMemo 포함) Math.random()을 직접 부르는 건 순수성 규칙 위반이라,
  // 초기값만 useState의 lazy initializer로(최초 1회 실행이라 허용) 굴리고,
  // 이후로는 아래 슬라이더 onChange(이벤트 핸들러, 렌더 바깥)에서 다시 굴린다.
  const [verticalPercent, setVerticalPercent] = useState(() =>
    randomVerticalPercent()
  );
  const [paused, setPaused] = useState(false);
  // 이번 세션에서 "경기 종료" 버튼으로 방금 끝냈는지만 로컬로 들고 있는다.
  // 부모가 이미 종료됐다고 알려준 상태(ended prop)는 그대로 렌더 중에 합쳐서
  // 쓰면 되므로, prop을 별도 state로 복사하는 동기화 이펙트가 필요 없다.
  const [justEnded, setJustEnded] = useState(false);
  const isEnded = ended || justEnded;
  // 내가 지금 제어 중이 아니면(잠겨있거나 종료됐으면) 로컬에서 만지작거리는
  // 임시 값이 아니라 마지막으로 저장된 값을 그대로 정적으로 보여준다.
  const showLiveValue = isController && !isEnded;
  const displayPosition = showLiveValue ? value : (lastPosition ?? 50);
  const controlsLocked = isEnded || !isController;
  const [ending, setEnding] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [lastSubmittedAt, setLastSubmittedAt] = useState(null);
  const [error, setError] = useState(null);

  // setInterval 콜백은 등록 시점의 클로저를 캡처하므로, 슬라이더를 움직여도
  // 매번 최신 값을 읽을 수 있도록 ref에 최신 value를 반영해둔다. (렌더 중이
  // 아니라 아래 handleChange, 즉 이벤트 핸들러 안에서만 갱신한다.)
  const valueRef = useRef(value);

  useEffect(() => {
    // 종료됐거나 사용자가 정지시켰으면 전송 자체를 하지 않는다. isController가
    // false인 경우는 여기서 막지 않는다 - 잠금이 풀렸는지(제어자가 나가서
    // heartbeat가 끊겼는지)를 이 주기적 전송 시도 자체로 계속 확인해야
    // "10초 뒤 자동으로 제어권을 넘겨받는" 동작이 성립하기 때문이다.
    if (isEnded || paused || !controllerToken) {
      return undefined;
    }

    async function submitPosition() {
      try {
        const res = await fetch('/api/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId,
            position: valueRef.current,
            controllerToken,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setStatus('error');
          setError(data.error ?? '요청 실패');
          return;
        }

        setStatus('success');
        setError(null);
        setLastSubmittedAt(new Date());
        onSubmitSuccess?.();
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    }

    // 페이지 진입 즉시(마운트 시) 한 번 강제 전송해서 선점을 시도한 뒤,
    // 이후 3초 간격으로 반복한다.
    submitPosition();

    // 탭이 숨겨지면(hidden) 인터벌을 멈추고, 다시 보이면 새로 시작한다.
    // intervalId는 이 클로저 안에서 계속 재할당되며, 아래 cleanup 함수는
    // 항상 그 시점의 최신 intervalId를 참조한다.
    let intervalId = setInterval(submitPosition, SUBMIT_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.hidden) {
        clearInterval(intervalId);
      } else {
        intervalId = setInterval(submitPosition, SUBMIT_INTERVAL_MS);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [matchId, isEnded, paused, controllerToken, onSubmitSuccess]);

  async function handleEnd() {
    setEnding(true);
    try {
      const res = await onEnd();
      if (res?.ok) {
        setJustEnded(true);
      }
    } finally {
      setEnding(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 경기장 + 슬라이더를 하나의 그룹으로 묶어 고정 사이즈로 중앙 정렬 */}
      <div className="mx-auto w-full max-w-md space-y-2">
        <SoccerField position={displayPosition} verticalPercent={verticalPercent} />

        <label className="flex flex-col text-sm text-gray-700">
          공 위치 (0=완전 왼쪽, 100=완전 오른쪽)
          <div className="mt-1 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={displayPosition}
              disabled={controlsLocked}
              onChange={(e) => {
                const next = Number(e.target.value);
                setValue(next);
                valueRef.current = next;
                setVerticalPercent(randomVerticalPercent());
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="w-10 text-right font-mono text-base tabular-nums">
              {displayPosition}
            </span>
          </div>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          disabled={controlsLocked}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {paused ? '재개' : '정지'}
        </button>
        <button
          type="button"
          onClick={handleEnd}
          disabled={controlsLocked || ending}
          className="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEnded ? '종료됨' : '경기 종료'}
        </button>
      </div>

      <p className="text-xs">
        {isEnded && (
          <span className="text-gray-500">
            경기가 종료되어 더 이상 기록되지 않습니다.
          </span>
        )}
        {!isEnded && !isController && (
          <span className="text-gray-500">
            다른 사용자가 이 경기를 제어 중입니다 (보기 전용)
          </span>
        )}
        {!isEnded && isController && paused && (
          <span className="text-gray-500">일시정지됨</span>
        )}
        {!isEnded && isController && !paused && status === 'idle' && (
          <span className="text-gray-500">
            {SUBMIT_INTERVAL_MS / 1000}초마다 자동으로 전송됩니다.
          </span>
        )}
        {!isEnded && isController && !paused && status === 'success' && lastSubmittedAt && (
          <span className="text-green-600">
            마지막 전송 성공: {formatTime(lastSubmittedAt)}
          </span>
        )}
        {!isEnded && isController && !paused && status === 'error' && (
          <span role="alert" className="text-red-600">
            전송 실패: {error}
          </span>
        )}
      </p>
    </div>
  );
}
