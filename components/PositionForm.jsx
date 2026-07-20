import { useEffect, useRef, useState } from 'react';
import SoccerField from './SoccerField';

// 서버 전송 간격(동적) 관련 상수.
const BASE_SUBMIT_INTERVAL_MS = 3000;
const MIN_SUBMIT_INTERVAL_MS = 500;
const MAX_SUBMIT_INTERVAL_MS = 12000;
const POSITION_DIFF_THRESHOLD = 5;
const SPEED_UP_FACTOR = 0.9;
const SLOW_DOWN_FACTOR = 1.125;

// styles/globals.css의 input[type=range]::-webkit-slider-thumb 등과
// 반드시 같은 값을 유지해야 한다 - SoccerField의 공 마커 위치 계산이
// 이 값을 기준으로 슬라이더 thumb의 실제 이동 범위에 맞춘다.
const SLIDER_THUMB_SIZE_PX = 16;

function formatTime(date) {
  return date.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

  // 실제 스케줄링에 쓰는 "현재 전송 간격"은 ref로 들고 있는다 - 컴포넌트가
  // 마운트된 동안 한 번만 초기화되고, 정지/재개로 이 submit effect가
  // 재실행돼도(paused가 deps에 있음) 리셋되지 않는다("멈췄던 간격 값 그대로
  // 이어서 재개" 요구사항). 화면 표시용으로만 별도 state에 미러링한다.
  const submitIntervalRef = useRef(BASE_SUBMIT_INTERVAL_MS);
  const [displayIntervalMs, setDisplayIntervalMs] = useState(
    BASE_SUBMIT_INTERVAL_MS
  );
  // 간격 조정 로직(직전 전송값과의 차이 비교)의 기준이 되는 "직전에 성공적으로
  // 전송한 값". 첫 전송에는 비교 대상이 없으니 간격을 조정하지 않는다.
  const lastSentPositionRef = useRef(null);

  useEffect(() => {
    // 종료됐거나 사용자가 정지시켰으면 전송 자체를 하지 않는다. isController가
    // false인 경우는 여기서 막지 않는다 - 잠금이 풀렸는지(제어자가 나가서
    // heartbeat가 끊겼는지)를 이 주기적 전송 시도 자체로 계속 확인해야
    // "10초 뒤 자동으로 제어권을 넘겨받는" 동작이 성립하기 때문이다.
    if (isEnded || paused || !controllerToken) {
      return undefined;
    }

    let timeoutId;
    // effect가 정리(cleanup)된 뒤에도 이미 날아간 fetch의 응답이 늦게 와서
    // 다음 setTimeout을 또 예약해버리는 걸 막기 위한 플래그.
    let cancelled = false;

    function scheduleNext() {
      if (cancelled) {
        return;
      }
      timeoutId = setTimeout(submitPosition, submitIntervalRef.current);
    }

    async function submitPosition() {
      const positionToSend = valueRef.current;
      try {
        const res = await fetch('/api/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId,
            position: positionToSend,
            controllerToken,
          }),
        });

        if (cancelled) {
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setStatus('error');
          setError(data.error ?? '요청 실패');
          // 실패 시에는 간격을 조정하지 않고(성공적으로 보낸 값 기준 비교가
          // 아니므로) 같은 간격으로 재시도한다.
          scheduleNext();
          return;
        }

        setStatus('success');
        setError(null);
        setLastSubmittedAt(new Date());
        onSubmitSuccess?.();

        if (lastSentPositionRef.current !== null) {
          const diff = Math.abs(positionToSend - lastSentPositionRef.current);
          const factor =
            diff >= POSITION_DIFF_THRESHOLD ? SPEED_UP_FACTOR : SLOW_DOWN_FACTOR;
          const nextInterval = clamp(
            submitIntervalRef.current * factor,
            MIN_SUBMIT_INTERVAL_MS,
            MAX_SUBMIT_INTERVAL_MS
          );
          submitIntervalRef.current = nextInterval;
          setDisplayIntervalMs(nextInterval);
        }
        lastSentPositionRef.current = positionToSend;

        scheduleNext();
      } catch (err) {
        if (cancelled) {
          return;
        }
        setStatus('error');
        setError(err.message);
        scheduleNext();
      }
    }

    // 페이지 진입 즉시(마운트 시) 한 번 강제 전송해서 선점을 시도한 뒤,
    // 이후 동적으로 계산되는 간격으로 반복한다.
    submitPosition();

    // 탭이 숨겨지면(hidden) 타이머를 멈추고, 다시 보이면 새로 시작한다.
    function handleVisibilityChange() {
      if (document.hidden) {
        clearTimeout(timeoutId);
      } else {
        scheduleNext();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [matchId, isEnded, paused, controllerToken, onSubmitSuccess]);

  // 공 위치 랜덤 워크: 서버 전송(3초 고정 간격)과는 완전히 별개의 타이머다.
  // 화면(슬라이더 값, 경기장 위 공 마커)에만 반영되고, 실제로 서버에 전송되는
  // 시점/주기는 위 제출 effect가 그대로 담당한다 - 그때그때의 valueRef.current를
  // 읽어가는 것뿐이라, 수동 조작이든 이 랜덤 워크든 구분 없이 자연스럽게
  // 다음 3초 전송에 반영된다.
  useEffect(() => {
    // 잠겨있거나(제어권 없음/종료) 사용자가 정지시켰으면 랜덤 워크도 함께 멈춘다.
    if (controlsLocked || paused) {
      return undefined;
    }

    let timeoutId;

    function tick() {
      const delta = Math.floor(Math.random() * 21) - 10; // -10 ~ 10 사이 정수
      const next = Math.min(100, Math.max(0, valueRef.current + delta));
      setValue(next);
      valueRef.current = next;
      setVerticalPercent(randomVerticalPercent());
      scheduleNext();
    }

    function scheduleNext() {
      const delay = 500 + Math.random() * 500; // 0.5초 ~ 1초, 매 틱마다 새로 랜덤
      timeoutId = setTimeout(tick, delay);
    }

    scheduleNext();

    function handleVisibilityChange() {
      if (document.hidden) {
        clearTimeout(timeoutId);
      } else {
        scheduleNext();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [controlsLocked, paused]);

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
      {/* 경기장 + 슬라이더를 하나의 그룹으로 묶어 고정 사이즈로 중앙 정렬.
          SoccerField와 <input>이 이 div의 직계 자식으로 나란히 있어야
          (사이에 다른 폭을 나눠 쓰는 형제 요소가 없어야) 둘의 실제 렌더링
          너비가 정확히 같아진다. 라벨 텍스트/숫자 표시는 별도 줄로 뺐다. */}
      <div className="mx-auto w-full max-w-md space-y-2">
        <SoccerField
          position={displayPosition}
          verticalPercent={verticalPercent}
          thumbSizePx={SLIDER_THUMB_SIZE_PX}
        />

        <div className="flex items-center justify-between text-sm text-gray-700">
          <label htmlFor="position-slider">
            공 위치 (0=완전 왼쪽, 100=완전 오른쪽)
          </label>
          <span className="font-mono text-base tabular-nums">
            {displayPosition}
          </span>
        </div>
        <input
          id="position-slider"
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
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        />
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
        {!isEnded && isController && !paused && (
          <>
            {status === 'idle' && (
              <span className="text-gray-500">자동으로 전송됩니다.</span>
            )}
            {status === 'success' && lastSubmittedAt && (
              <span className="text-green-600">
                마지막 전송 성공: {formatTime(lastSubmittedAt)}
              </span>
            )}
            {status === 'error' && (
              <span role="alert" className="text-red-600">
                전송 실패: {error}
              </span>
            )}
            <span className="ml-2 text-gray-400">
              (다음 전송까지 약 {(displayIntervalMs / 1000).toFixed(1)}초)
            </span>
          </>
        )}
      </p>
    </div>
  );
}
