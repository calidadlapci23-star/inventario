export default function StatsCard({ titulo, valor }: { titulo: string, valor: string }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-bold">{titulo}</h3>
      <p className="text-2xl">{valor}</p>
    </div>
  );
}
