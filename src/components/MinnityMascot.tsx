/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, Variants } from 'motion/react';

export type MinnityExpression = 'friendly' | 'sleeping' | 'focused' | 'happy' | 'thinking';

interface MinnityMascotProps {
  expression?: MinnityExpression;
  bubbleText: string;
  className?: string;
  compact?: boolean;
}

interface PetHeart {
  id: number;
  x: number;
  scale: number;
}

export default function MinnityMascot({
  expression: externalExpression = 'friendly',
  bubbleText: externalBubbleText,
  className = '',
  compact = false,
}: MinnityMascotProps) {
  const [temporaryExpression, setTemporaryExpression] = useState<MinnityExpression | null>(null);
  const [hearts, setHearts] = useState<PetHeart[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartIdRef = useRef(0);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handlePet = () => {
    // Clear any previous transition timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set happy expression temporarily
    setTemporaryExpression('happy');

    // Spawn 4 floating hearts
    const newHearts: PetHeart[] = Array.from({ length: 4 }).map(() => ({
      id: heartIdRef.current++,
      x: (Math.random() * 80) - 40, // random offset centered
      scale: 0.6 + Math.random() * 0.7,
    }));

    setHearts((prev) => [...prev, ...newHearts]);

    // Restore original expression after 2.8 seconds
    timeoutRef.current = setTimeout(() => {
      setTemporaryExpression(null);
    }, 2800);
  };

  // Resolve current active expression and bubble text representation
  const activeExpression = temporaryExpression || externalExpression;
  const activeBubbleText = externalBubbleText;

  // SVG drawing assets based on expression
  const renderCatSVG = () => {
    // Tail wiggle animation variants
    const tailVariants = {
      friendly: {
        rotate: [0, 15, -10, 15, 0],
        transition: { repeat: Infinity, duration: 4, ease: 'easeInOut' },
      },
      sleeping: {
        rotate: [0, 5, -5, 5, 0],
        transition: { repeat: Infinity, duration: 8, ease: 'easeInOut' },
      },
      focused: {
        rotate: 0,
      },
      happy: {
        rotate: [0, 30, -25, 30, -25, 30, 0],
        transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
      },
      thinking: {
        rotate: [0, -15, 10, -15, 0],
        transition: { repeat: Infinity, duration: 5, ease: 'easeInOut' },
      },
    } satisfies Variants;

    // Ear twitch variants
    const earLeftVariants = {
      friendly: {
        rotate: [0, -5, 0, 0, 0, -2, 0],
        transition: { repeat: Infinity, duration: 5, delay: 1 },
      },
      sleeping: {
        rotate: 0,
      },
      focused: {
        rotate: [0, 2, 0],
        transition: { repeat: Infinity, duration: 3 },
      },
      happy: {
        y: [0, -2, 0],
        transition: { repeat: Infinity, duration: 0.5 },
      },
      thinking: {
        rotate: [0, -8, 0],
        transition: { repeat: Infinity, duration: 4, delay: 0.5 },
      },
    };

    // Body wobble
    const bodyVariants = {
      friendly: {
        y: [0, -2, 0],
        transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
      },
      sleeping: {
        scaleY: [1, 0.96, 1],
        transition: { repeat: Infinity, duration: 4, ease: 'easeInOut' },
      },
      focused: {
        y: 0,
      },
      happy: {
        y: [0, -8, 0],
        transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
      },
      thinking: {
        rotate: [0, 1, -1, 0],
        transition: { repeat: Infinity, duration: 6, ease: 'easeInOut' },
      },
    } satisfies Variants;

    return (
      <motion.svg
        viewBox="0 0 140 140"
        className={`${compact ? 'w-24 h-24' : 'w-36 h-36 md:w-44 md:h-44'} drop-shadow-md`}
        variants={bodyVariants}
        animate={activeExpression}
      >
        {/* Shadow under the cat */}
        <ellipse cx="70" cy="125" rx="45" ry="8" fill="rgba(0,0,0,0.12)" />

        {/* Tail */}
        <motion.g
          style={{ transformOrigin: '95px 105px' }}
          variants={tailVariants}
          animate={activeExpression}
        >
          {/* Curled cat tail */}
          <path
            d="M 100 95 C 125 90, 135 60, 120 45 C 110 35, 100 48, 108 55 C 118 64, 110 80, 95 85 Z"
            fill="#5f30d2"
          />
        </motion.g>

        {/* Feet / Paws */}
        <ellipse cx="50" cy="120" rx="10" ry="7" fill="#7C3AED" />
        <ellipse cx="90" cy="120" rx="10" ry="7" fill="#7C3AED" />

        {/* Main Body */}
        <path
          d="M 35 120 C 35 70, 105 70, 105 120 Z"
          fill="#8B5CF6"
        />
        {/* Chest Plate / Belly (Lighter Purple Accent) */}
        <path
          d="M 50 120 C 50 95, 90 95, 90 120 Z"
          fill="#C4B5FD"
        />

        {/* Ears */}
        {/* Left Ear */}
        <motion.g style={{ transformOrigin: '40px 55px' }} variants={earLeftVariants} animate={activeExpression}>
          <polygon points="30,55 52,25 56,58" fill="#8B5CF6" />
          <polygon points="35,53 50,32 52,55" fill="#C4B5FD" />
        </motion.g>
        {/* Right Ear */}
        <polygon points="110,55 88,25 84,58" fill="#8B5CF6" />
        <polygon points="105,53 90,32 88,55" fill="#C4B5FD" />

        {/* Head */}
        <ellipse cx="70" cy="70" rx="42" ry="34" fill="#8B5CF6" />

        {/* Cheeks / Fur details removed */}

        {/* EYES */}
        {activeExpression === 'sleeping' ? (
          // Sleeping curved eyes
          <g stroke="#4C1D95" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M 46 72 Q 54 78 62 72" />
            <path d="M 78 72 Q 86 78 94 72" />
          </g>
        ) : activeExpression === 'happy' ? (
          // Upward happy arches
          <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M 45 76 Q 52 66 60 76" />
            <path d="M 80 76 Q 87 66 95 76" />
            {/* Blushee pink cheeks */}
            <ellipse cx="40" cy="84" rx="8" ry="4" fill="#F472B6" opacity="0.6" />
            <ellipse cx="100" cy="84" rx="8" ry="4" fill="#F472B6" opacity="0.6" />
          </g>
        ) : (
          // Normal/Focused/Thinking Eyes
          <g>
            {/* White outer */}
            <ellipse cx="52" cy="72" rx="10" ry="10" fill="#ffffff" />
            <ellipse cx="88" cy="72" rx="10" ry="10" fill="#ffffff" />
            {/* Deep purple/black pupil */}
            <ellipse cx={activeExpression === 'thinking' ? "50" : "52"} cy="72" rx="6" ry="6" fill="#1E1B4B" />
            <ellipse cx={activeExpression === 'thinking' ? "86" : "88"} cy="72" rx="6" ry="6" fill="#1E1B4B" />
            {/* Sparkle */}
            <circle cx={activeExpression === 'thinking' ? "48" : "50"} cy="70" r="2.5" fill="#ffffff" />
            <circle cx={activeExpression === 'thinking' ? "84" : "86"} cy="70" r="2.5" fill="#ffffff" />
          </g>
        )}

        {/* Pink tiny Nose */}
        <polygon points="67,82 73,82 70,85" fill="#F472B6" stroke="#F472B6" strokeWidth="1" strokeLinejoin="round" />

        {/* Cute mouth */}
        <path d="M 64 88 Q 70 92 70 88 Q 70 92 76 88" stroke="#4C1D95" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Whiskers */}
        <g stroke="#A78BFA" strokeWidth="2" strokeLinecap="round">
          {/* Left Whiskers */}
          <line x1="25" y1="78" x2="10" y2="76" />
          <line x1="25" y1="84" x2="8" y2="85" />
          {/* Right Whiskers */}
          <line x1="115" y1="78" x2="130" y2="76" />
          <line x1="115" y1="84" x2="132" y2="85" />
        </g>

        {/* Sleeping Bubbles / Zzz */}
        {activeExpression === 'sleeping' && (
          <g fill="#A78BFA">
            <motion.text
              x="110"
              y="35"
              fontSize="12"
              fontWeight="bold"
              animate={{ y: [35, 15], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeOut' }}
            >
              Zzz
            </motion.text>
            <motion.text
              x="120"
              y="20"
              fontSize="16"
              fontWeight="bold"
              animate={{ y: [20, -5], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 3, delay: 1, ease: 'easeOut' }}
            >
              Z
            </motion.text>
          </g>
        )}

        {/* Focus Mode Specs */}
        {activeExpression === 'focused' && (
          <g stroke="#F59E0B" strokeWidth="3" fill="none" strokeLinecap="round">
            {/* Left Frame */}
            <circle cx="52" cy="72" r="12" />
            {/* Right Frame */}
            <circle cx="88" cy="72" r="12" />
            {/* Bridge */}
            <path d="M 64 72 Q 70 69 76 72" />
            {/* Sides */}
            <path d="M 40 72 L 32 68" />
            <path d="M 100 72 L 108 68" />
          </g>
        )}

        {/* Thinking lightbulb/steam lines */}
        {activeExpression === 'thinking' && (
          <g stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" fill="none">
            <motion.path
              d="M 65 15 Q 70 5 75 15"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <motion.path
              d="M 55 20 Q 60 12 65 20"
              animate={{ opacity: [0.1, 0.8, 0.1], y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
            />
            <motion.path
              d="M 75 20 Q 80 12 85 20"
              animate={{ opacity: [0.1, 0.8, 0.1], y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.8 }}
            />
          </g>
        )}
      </motion.svg>
    );
  };

  return (
    <div
      id="minnity-mascot-container"
      className={`flex ${
        compact ? 'flex-row items-center gap-3' : 'flex-col md:flex-row items-center gap-6'
      } ${className} w-full min-w-0 overflow-hidden`}
    >
      {/* Cartoon Speech Bubble */}
      <div className={`relative flex-1 ${compact ? 'order-1' : 'order-1 md:order-2'} w-full min-w-0`}>
        <motion.div
          id="minnity-speech-bubble"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          key={activeBubbleText} // animates whenever the text changes
          transition={{ type: 'spring', damping: 15 }}
          className="bg-app-card text-app-text p-4 rounded-2xl shadow-md border-2 border-app-border font-sans text-sm md:text-base leading-relaxed break-words overflow-hidden"
        >
          <div className="flex items-start gap-2">
            <div>
              <p className="font-medium text-violet-600 dark:text-violet-400 text-xs tracking-wider uppercase mb-0.5">
                {activeExpression === 'sleeping'
                  ? 'Minnity Zzz...'
                  : activeExpression === 'focused'
                  ? 'Minnity Concentrada'
                  : activeExpression === 'happy'
                  ? 'Minnity Feliz'
                  : activeExpression === 'thinking'
                  ? 'Minnity Pensando'
                  : 'Minnity'}
              </p>
              <p className="font-medium">{activeBubbleText}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Cat SVG Drawing - Interactive Pet Container */}
      <div
        onClick={handlePet}
        title="¡Hacé clic para acariciar a Minnity!"
        className={`relative shrink-0 flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-300 select-none ${
          compact ? 'order-2' : 'order-2 md:order-1'
        }`}
      >
        {renderCatSVG()}

        {/* Floating Heart Elements on Petting */}
        {hearts.map((heart) => (
          <motion.div
            key={heart.id}
            initial={{ y: 20, x: heart.x, opacity: 1, scale: heart.scale }}
            animate={{
              y: -100,
              x: heart.x + (Math.random() * 40 - 20),
              opacity: 0,
              scale: heart.scale * 1.5,
            }}
            transition={{ duration: 2, ease: 'easeOut' }}
            onAnimationComplete={() => {
              setHearts((prev) => prev.filter((h) => h.id !== heart.id));
            }}
            className="absolute pointer-events-none select-none text-2xl z-50 text-rose-500 font-sans"
          >
            ❤️
          </motion.div>
        ))}
      </div>
    </div>
  );
}
