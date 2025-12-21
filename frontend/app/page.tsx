export default function Home() {
  return (
    <div className="min-h-screen px-6 py-8"> 
      <h1 className="text-3xl font-bold text-yellow-400 mb-4">
        Welcome to x402PM
      </h1>
      <p className="text-white/70 mb-8">
        Your predictions market platform
      </p>
      
      {/* Temporary content to test scrolling */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="mb-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <h3 className="text-yellow-400 font-semibold mb-2">Prediction Market {i + 1}</h3>
          <p className="text-white/60 text-sm">This is a sample prediction market card to test scrolling behavior.</p>
        </div>
      ))}
    </div>
  );
}
