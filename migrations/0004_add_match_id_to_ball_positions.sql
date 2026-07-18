-- 주의: 이 마이그레이션은 ball_positions에 NOT NULL 외래키를 추가한다.
-- 이전 스키마(경기 개념 도입 전)로 이미 데이터를 넣어둔 개발 DB가 있다면,
-- 이 마이그레이션 실행 전에 해당 테이블을 비워야 한다(백필 로직은 없음) —
-- 예: TRUNCATE TABLE ball_positions; (개발 데이터이므로 별도 백필 없이 초기화)
ALTER TABLE ball_positions
  ADD COLUMN match_id BIGINT UNSIGNED NOT NULL AFTER id,
  ADD CONSTRAINT fk_ball_positions_match_id FOREIGN KEY (match_id) REFERENCES matches (id);

CREATE INDEX idx_ball_positions_match_id ON ball_positions (match_id);
