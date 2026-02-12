import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const randomPos = (min = 0, max = 100) => Math.floor(Math.random() * (max - min + 1) + min);

// Helper to get off-screen position based on current x/y
// This pushes the card to the nearest border or strictly outside
const getOffscreenPos = () => {
  const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
  const distance = 150; // % distance to ensure it's offscreen
  
  switch(side) {
    case 0: return { y: -distance, x: randomPos(-50, 150) };
    case 1: return { x: distance, y: randomPos(-50, 150) };
    case 2: return { y: distance, x: randomPos(-50, 150) };
    case 3: return { x: -distance, y: randomPos(-50, 150) };
    default: return { y: -distance };
  }
};

const generateCards = (count = 8) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: randomPos(20, 80), 
    y: randomPos(20, 80),
    r: randomPos(-15, 15),
    img: `https://picsum.photos/id/${randomPos(1, 200)}/300/400`
  }));
};

const Card = ({ card, className, style }) => (
  <div
    className={`absolute w-40 h-56 md:w-56 md:h-80 rounded-xl shadow-2xl overflow-hidden border-4 border-white transform will-change-transform ${className}`}
    style={{
      left: `${card.x}%`,
      top: `${card.y}%`,
      transform: `translate(-50%, -50%) rotate(${card.r}deg)`, // Center origin
      ...style
    }}
  >
    <img src={card.img} alt="card" className="w-full h-full object-cover" />
    <div className="absolute inset-0 bg-black/10" />
  </div>
);

const ShuffleSection = () => {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  
  // Create 3 sets of cards
  const sets = useRef([
    generateCards(8),
    generateCards(8),
    generateCards(8)
  ]).current;

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerRef.current,
        start: "top top",
        end: "+=2500", 
        scrub: 0.5, // Reduced scrub for snappier feel
        pin: true,
        anticipatePin: 1,
      }
    });

    // --- TRANSITION 1: Set 0 exits, Set 1 enters ---
    
    // 1. Set 0 Explodes Out (Scatter to borders)
    tl.to(".card-set-0", {
      x: () => {
        const side = Math.random() > 0.5 ? 1 : -1;
        return `${side * randomPos(120, 150)}%`; // Scatter Left/Right
      },
      y: () => {
         const side = Math.random() > 0.5 ? 1 : -1;
         return `${side * randomPos(120, 150)}%`; // Scatter Top/Bottom
      },
      opacity: 0,
      scale: 0.8,
      rotation: () => randomPos(-45, 45),
      duration: 0.5,
      stagger: { amount: 0.2, from: "random" },
      ease: "power2.in"
    });

    // 2. Set 1 Enters Instantly (Flash In)
    // We want them to appear quickly, "coming instantly"
    tl.fromTo(".card-set-1", 
      { 
        scale: 1.5,
        opacity: 0
      },
      {
        scale: 1,
        opacity: 1,
        duration: 0.1, // Very fast entrance
        stagger: { amount: 0.15, from: "random" },
        ease: "back.out(1.7)"
      },
      "-=0.1" // Start while last set is finishing exit
    );
    
    // Hold Set 1 for a moment while scrolling
    tl.to({}, { duration: 0.5 });


    // --- TRANSITION 2: Set 1 exits, Set 2 enters ---

    // 3. Set 1 Explodes Out
    tl.to(".card-set-1", {
       x: () => {
        const side = Math.random() > 0.5 ? 1 : -1;
        return `${side * randomPos(120, 150)}%`;
      },
      y: () => {
         const side = Math.random() > 0.5 ? 1 : -1;
         return `${side * randomPos(120, 150)}%`;
      },
      opacity: 0,
      rotation: () => randomPos(-45, 45),
      scale: 1.2,
      duration: 0.5,
      stagger: { amount: 0.2, from: "center" },
      ease: "power1.in"
    });

    // 4. Set 2 Enters Instantly
    tl.fromTo(".card-set-2",
      { 
        scale: 0.2, 
        opacity: 0 
      },
      {
        scale: 1,
        opacity: 1,
        duration: 0.1,
        stagger: { amount: 0.1, from: "random" }, 
        ease: "elastic.out(1, 0.75)"
      },
       "-=0.2"
    );

  }, { scope: containerRef });

  return (
    <div ref={triggerRef} className="h-screen w-full bg-slate-950 overflow-hidden relative">
        <div ref={containerRef} className="h-full w-full relative flex items-center justify-center">
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                 <h1 className="text-6xl md:text-9xl font-black text-white/5 tracking-tighter uppercase text-center select-none">
                    Instant<br/>Shuffle
                 </h1>
            </div>

            {sets.map((set, setIndex) => (
                <div key={setIndex} className={`absolute inset-0 w-full h-full pointer-events-none z-10`}>
                    {set.map((card, i) => (
                        <Card 
                            key={i} 
                            card={card} 
                            className={`card-set-${setIndex} ${setIndex !== 0 ? 'opacity-0' : ''}`} 
                            style={setIndex !== 0 ? { opacity: 0 } : {}}
                        />
                    ))}
                </div>
            ))}
            
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 text-white/30 text-xs uppercase tracking-widest animate-pulse">
                Scroll to Shuffle
            </div>
        </div>
    </div>
  );
};

export default ShuffleSection;
