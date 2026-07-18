import { useEffect, useRef, useState } from 'react';

const SUBMIT_INTERVAL_MS = 3000;

function formatTime(date) {
  return date.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' });
}

export default function PositionForm() {
  const [value, setValue] = useState(50);
  const [status, setStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [lastSubmittedAt, setLastSubmittedAt] = useState(null);
  const [error, setError] = useState(null);

  // setInterval 콜백은 마운트 시점의 클로저를 캡처하므로, 슬라이더를 움직여도
  // 매번 최신 값을 읽을 수 있도록 ref에 최신 value를 반영해둔다. (렌더 중이
  // 아니라 아래 handleChange, 즉 이벤트 핸들러 안에서만 갱신한다.)
  const valueRef = useRef(value);

  useEffect(() => {
    async function submitPosition() {
      try {
        const res = await fetch('/api/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: valueRef.current }),
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
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    }

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
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col text-sm text-gray-700">
        공 위치 (0=완전 왼쪽, 100=완전 오른쪽)
        <div className="mt-1 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={(e) => {
              const next = Number(e.target.value);
              setValue(next);
              valueRef.current = next;
            }}
            className="h-2 w-64 cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600"
          />
          <span className="w-10 text-right font-mono text-base tabular-nums">
            {value}
          </span>
        </div>
      </label>
      <p className="text-xs">
        {status === 'idle' && (
          <span className="text-gray-500">
            {SUBMIT_INTERVAL_MS / 1000}초마다 자동으로 전송됩니다.
          </span>
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
      </p>
    </div>
  );
}
