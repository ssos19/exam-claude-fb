export default function RecentPositionsTable({ items }) {
  if (items.length === 0) {
    return <p className="text-gray-600">아직 기록된 위치가 없습니다.</p>;
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left">
          <th className="py-1 pr-4">시각</th>
          <th className="py-1">위치</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-gray-100">
            <td className="py-1 pr-4 text-gray-600">
              {new Date(item.recordedAt).toLocaleString()}
            </td>
            <td className="py-1">{item.position}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
