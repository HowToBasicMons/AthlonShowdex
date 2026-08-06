/**
 * @file `NidoEasterEgg.tsx`
 * @author HowToBasicMons
 * @since 1.0.6
 * @description A little easter egg tucked into the bottom-left of the Calcdex — a thug-life Pokémon
 *   that NidoTheKing snuck in. Hover for the credit, click for a random fun fact + a squish.
 */

import * as React from 'react';
import cx from 'classnames';
import { useColorScheme } from '@showdex/redux/store';
import { getResourceUrl } from '@showdex/utils/core';
import styles from './NidoEasterEgg.module.scss';

export interface NidoEasterEggProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Random one-liners shown when the easter egg is clicked.
 *
 * * Keep 'em short & lighthearted — they render in a tiny speech bubble.
 */
const NidoFacts: string[] = [
  'Fun fact: in Infinite Fusion, your Defense investment becomes your Attack when Aegislash flips to Blade. Sneaky.',
  'Fun fact: Aura Sphere is a Light-type move in Soulstones. Surprise!',
  'Fun fact: Hyper Voice & Boomburst are Sound-type in Soulstones — mind the matchups.',
  'Fun fact: Cosmic-types laugh at Ground & Sound moves. 0x, baby.',
  'Pro tip: hard-refresh the battle (Ctrl+Shift+R) if the calc looks stale.',
  'Fun fact: this calc reads the type chart straight from the server. No drift allowed.',
  'Fun fact: New Moon powers up Ghost & Dark, and weakens Fairy. Spooky.',
  'Fun fact: Frostburn is just Burn\'s edgy cousin — it halves SPECIAL damage instead.',
  'Pro tip: Eviolite works if EITHER half of your fusion is not-fully-evolved.',
  'Fun fact: a fused Jirachi + Hawlucha is named Jilucha. Adorable. Terrifying.',
  'Reminder: touch grass between ladder sessions. ...Or don\'t. Keep climbing.',
  'Fun fact: these shades are non-negotiable. NidoTheKing said so.',
  'Fun fact: Showdex was built by Bot Keith & analogcam — go show \'em love.',
  'Pro tip: report bugs with the Dump Bug Report tool. Future-you says thanks.',
  'Fun fact: you just clicked a sea urchin wearing sunglasses. Living the dream.',
  'Keep on fusing, battling, and climbing the ladder, Athlonian!',
];

export const NidoEasterEgg = ({
  className,
  style,
}: NidoEasterEggProps): React.JSX.Element => {
  const colorScheme = useColorScheme();

  const [fact, setFact] = React.useState<string>(null);
  const [squishing, setSquishing] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);

  const squishTimer = React.useRef<ReturnType<typeof setTimeout>>(null);
  const factTimer = React.useRef<ReturnType<typeof setTimeout>>(null);
  const lastFactIndex = React.useRef<number>(-1);

  React.useEffect(() => () => {
    if (squishTimer.current) {
      clearTimeout(squishTimer.current);
    }

    if (factTimer.current) {
      clearTimeout(factTimer.current);
    }
  }, []);

  const handlePress = React.useCallback(() => {
    // pick a random fact that isn't the one we just showed
    let index = Math.floor(Math.random() * NidoFacts.length);

    if (NidoFacts.length > 1 && index === lastFactIndex.current) {
      index = (index + 1) % NidoFacts.length;
    }

    lastFactIndex.current = index;
    setFact(NidoFacts[index]);

    // (re)trigger the squish animation
    setSquishing(false);

    // double rAF so the class actually re-applies if spammed
    requestAnimationFrame(() => requestAnimationFrame(() => setSquishing(true)));

    if (squishTimer.current) {
      clearTimeout(squishTimer.current);
    }

    squishTimer.current = setTimeout(() => setSquishing(false), 360);

    // auto-hide the fact bubble after a bit
    if (factTimer.current) {
      clearTimeout(factTimer.current);
    }

    factTimer.current = setTimeout(() => setFact(null), 6000);
  }, []);

  if (hidden) {
    return null;
  }

  return (
    <div
      className={cx(
        styles.container,
        !!colorScheme && styles[colorScheme],
        className,
      )}
      style={style}
    >
      <div
        className={cx(
          styles.bubble,
          !!fact && styles.factVisible,
        )}
        role="status"
      >
        <span className={styles.bubbleText}>
          {fact || 'NidoTheKing put me here'}
        </span>
      </div>

      <button
        type="button"
        className={styles.button}
        aria-label="NidoTheKing put me here"
        onClick={handlePress}
      >
        <img
          className={cx(styles.image, squishing && styles.squishing)}
          src={getResourceUrl('nidotheking.png')}
          alt="NidoTheKing"
          draggable={false}
          onError={() => setHidden(true)}
        />
      </button>
    </div>
  );
};
