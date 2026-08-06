/**
 * @file `PokeFormeTooltip.tsx`
 * @author Keith Choison <keith@tize.io>
 * @since 1.0.7
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';
import { type TooltipProps, BaseButton, Tooltip } from '@showdex/components/ui';
import { type CalcdexPokemon } from '@showdex/interfaces/calc';
import { useColorScheme } from '@showdex/redux/store';
import { formatId } from '@showdex/utils/core';
import { getDexForFormat, getFusionBodyStanceFormes } from '@showdex/utils/dex';
import { Picon } from '../Picon';
import styles from './PokeFormeTooltip.module.scss';

export interface PokeFormeTooltipProps {
  className?: string;
  style?: React.CSSProperties;
  format?: string;
  pokemon?: CalcdexPokemon;
  visible?: boolean;
  maxColumns?: number;
  columnWidth?: number;
  disabled?: boolean;
  children?: TooltipProps['children'];
  onPokemonChange?: (pokemon: Partial<CalcdexPokemon>) => void;
  onRequestClose?: () => void;
}

export const PokeFormeTooltip = ({
  className,
  style,
  format,
  pokemon,
  visible,
  maxColumns = 4,
  columnWidth = 53,
  disabled,
  children,
  onPokemonChange,
  onRequestClose,
  ...props
}: PokeFormeTooltipProps): React.JSX.Element => {
  const { t } = useTranslation('pokedex');
  const dex = React.useMemo(() => getDexForFormat(format), [format]);
  const colorScheme = useColorScheme();

  const {
    speciesForme,
    transformedForme,
    altFormes,
    fusion,
  } = pokemon || {};

  const formeKey = transformedForme ? 'transformedForme' : 'speciesForme';

  const currentForme = React.useMemo(
    () => (transformedForme || speciesForme)?.replace(/-Tera$/, ''),
    [speciesForme, transformedForme],
  );

  const dexForme = React.useMemo(() => dex.species.get(currentForme), [currentForme, dex]);
  const baseForme = (dexForme?.exists && dexForme.baseSpecies) || null;

  // Pokéathlon Infinite Fusion: the Body (`fusion`) can have its own Stance Change formes (Aegislash
  // Shield/Blade) that the Head-based `altFormes` never surfaces. Render those as extra toggles that
  // flip the `fusion` field instead of `speciesForme`.
  const bodyStanceFormes = React.useMemo(() => getFusionBodyStanceFormes(fusion), [fusion]);
  const bodyBaseForme = bodyStanceFormes[0] || null;

  // unified list of toggleable formes: Head formes (write to speciesForme/transformedForme) followed
  // by the Body's stance formes (write to fusion)
  const renderFormes = React.useMemo(() => {
    const headFormes = (altFormes || [])
      .filter((f) => !!f && !!baseForme && f.startsWith(baseForme) && !f.endsWith('-Tera'))
      .map((forme) => ({ forme, targetKey: formeKey as keyof CalcdexPokemon, base: baseForme, current: currentForme }));

    const bodyFormes = bodyStanceFormes
      .map((forme) => ({ forme, targetKey: 'fusion' as keyof CalcdexPokemon, base: bodyBaseForme, current: fusion }));

    return [...headFormes, ...bodyFormes];
  }, [altFormes, baseForme, bodyBaseForme, bodyStanceFormes, currentForme, formeKey, fusion]);

  const formesCount = renderFormes.length;

  const handleFormePress = React.useCallback((
    forme: string,
    targetKey: keyof CalcdexPokemon,
    current: string,
  ) => {
    // don't fire the callback if the forme is the same
    if (current === forme) {
      return;
    }

    // make sure to close the tooltip once the forme is selected for that good good UX
    onPokemonChange?.({ [targetKey]: forme });
    onRequestClose?.();
  }, [
    onPokemonChange,
    onRequestClose,
  ]);

  return (
    <Tooltip
      {...props}
      className={styles.tooltipContainer}
      content={(
        <div
          className={cx(
            styles.container,
            !!colorScheme && styles[colorScheme],
            className,
          )}
          style={{
            ...style,
            gridTemplateColumns: `repeat(${Math.min(formesCount, maxColumns)}, ${columnWidth}px)`,
          }}
        >
          {renderFormes.map(({
            forme: altForme,
            targetKey,
            base,
            current,
          }) => {
            if (!altForme) {
              return null;
            }

            const tItemBase = t(`pokedex:species.${formatId(base)}`, base);
            const tAltForme = t(`pokedex:species.${formatId(altForme)}`, altForme);
            const formeName = tItemBase === tAltForme
              ? t('common:labels.base', tItemBase)
              : tAltForme.replace(`${tItemBase}-`, '');

            const selected = current === altForme;

            return (
              <BaseButton
                key={`PokeFormeTooltip:${speciesForme}:AltForme:${targetKey}:${altForme}`}
                className={cx(
                  styles.formeButton,
                  selected && styles.selected,
                )}
                display="block"
                hoverScale={1}
                activeScale={selected ? 0.98 : undefined}
                onPress={() => handleFormePress(altForme, targetKey, current)}
              >
                <Picon
                  // className={styles.picon}
                  pokemon={altForme}
                />

                <div className={styles.piconLabel}>
                  {formeName}
                </div>
              </BaseButton>
            );
          })}
        </div>
      )}
      visible={visible}
      interactive
      placement="top-start"
      offset={[0, 7]}
      disabled={!speciesForme || !formesCount || disabled}
      onClickOutside={onRequestClose}
    >
      {children}
    </Tooltip>
  );
};
