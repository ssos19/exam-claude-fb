// 진영 배정과 좌/우 경계값은 임의로 결정된 값이다. 바뀌면 이 파일만 수정하면 된다.
export const TEAMS = {
  A: { id: 'A', fullName: 'Anthro', shortName: 'Ant', side: 'left' },
  B: { id: 'B', fullName: 'Bob', shortName: 'Bike', side: 'right' },
};

export const SIDE_BOUNDARY = 50; // position >= SIDE_BOUNDARY => 'right'

export function positionToSide(position) {
  return position >= SIDE_BOUNDARY ? 'right' : 'left';
}
