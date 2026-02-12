import { useState } from 'react';
import ParticleLogo from './ParticleLogo';

function App() {
  const [distortionRadius, setDistortionRadius] = useState(80);
  const [particleColor, setParticleColor] = useState([100, 200, 255]);
  const [forceStrength, setForceStrength] = useState(5.0);
  const [enableWobble, setEnableWobble] = useState(true);
  const [returnDelay, setReturnDelay] = useState(0);
  const [density, setDensity] = useState(2); // 1 = Low Density, 5 = High Density

  // Calculate pixelStep based on density (Higher density = Lower step)
  // Density 1 -> Step 12
  // Density 2 -> Step 8
  // Density 3 -> Step 5
  // Density 4 -> Step 3
  // Density 5 -> Step 1 (Heavy)
  const getPixelStep = (d) => {
      const map = { 1: 12, 2: 8, 3: 5, 4: 3, 5: 1 };
      return map[d] || 8;
  };

  const handleColorChange = (e) => {
    const hex = e.target.value;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    setParticleColor([r, g, b]);
  };

  const rgbToHex = (r, g, b) => {
    const componentToHex = (c) => {
      const hex = c.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }

  return (
    <div className="bg-black min-h-screen text-white font-sans relative overflow-hidden">
        <ParticleLogo 
            distortionRadius={distortionRadius}
            particleColor={particleColor}
            forceStrength={forceStrength}
            enableWobble={enableWobble}
            returnDelay={returnDelay}
            pixelStep={getPixelStep(density)}
        />
        
        <div className="absolute top-5 right-5 z-50 bg-neutral-900/80 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl w-80 space-y-6">
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Particle Controls</h3>
            
            {/* Radius Control */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                    <label>Interaction Radius</label>
                    <span className="font-mono text-white">{distortionRadius}px</span>
                </div>
                <input 
                    type="range" 
                    min="10" 
                    max="300" 
                    value={distortionRadius} 
                    onChange={(e) => setDistortionRadius(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>

            {/* Particle Density */}
            <div className="space-y-2">
                 <div className="flex justify-between text-sm text-gray-400">
                    <label>Particle Density</label>
                    <span className="font-mono text-white">{density} / 5</span>
                </div>
                 <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    step="1"
                    value={density} 
                    onChange={(e) => setDensity(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
            </div>

            {/* Interaction Strength */}
            <div className="space-y-2">
                 <div className="flex justify-between text-sm text-gray-400">
                    <label>Force Strength</label>
                    <span className="font-mono text-white">{forceStrength.toFixed(1)}</span>
                </div>
                 <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    step="0.1"
                    value={forceStrength} 
                    onChange={(e) => setForceStrength(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
            </div>
            
            {/* Return Delay */}
             <div className="space-y-2">
                 <div className="flex justify-between text-sm text-gray-400">
                    <label>Return Delay</label>
                    <span className="font-mono text-white">{returnDelay}ms</span>
                </div>
                 <input 
                    type="range" 
                    min="0" 
                    max="2000" 
                    step="50"
                    value={returnDelay} 
                    onChange={(e) => setReturnDelay(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
            </div>

            {/* Wobble Toggle */}
            <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Spring / Wobble</label>
                <div 
                    onClick={() => setEnableWobble(!enableWobble)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${enableWobble ? 'bg-green-500' : 'bg-gray-700'}`}
                >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${enableWobble ? 'translate-x-6' : ''}`} />
                </div>
            </div>

            {/* Color Control */}
            <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Particle Color</label>
                <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-gray-500 uppercase">{rgbToHex(...particleColor)}</span>
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:scale-110 transition-transform">
                        <input 
                            type="color" 
                            value={rgbToHex(...particleColor)}
                            onChange={handleColorChange}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 cursor-pointer border-none bg-transparent"
                        />
                    </div>
                </div>
            </div>
            
        </div>
    </div>
  );
}

export default App
