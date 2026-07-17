// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { AssetId, LocaleId, ResolvedAssetManifestV1, TextId } from "@sillymaker/base";
import {
  GameSymbolV1,
  ProgressMeter,
  TopCardHudV1,
  type GameSymbolIdV1,
  type GameSymbolRegistryV1,
  type GameRendererContextV1,
  type PresentationReadPortV1,
} from "@sillymaker/ui";
import type { ReactElement } from "react";

import type { PocSemanticGamePortV1 } from "../../application/create-poc-semantic-port.js";
import { pocTextIdsV1 } from "../../content/ids.js";
import type { PocHudProjectionV1 } from "../../gameplay/contracts/types.js";
import { pocGameSymbolIdsByRoleV1 } from "../symbols/poc-game-symbols.js";
import styles from "./PocHud.module.css";

type PocAssetUsageV1 = ResolvedAssetManifestV1["assets"][number]["usage"];
type PocPresentationReadPortV1 = PresentationReadPortV1<
  TextId,
  AssetId,
  PocAssetUsageV1,
  LocaleId,
  string
>;

export type PocHudRendererPropsV1 = GameRendererContextV1<
  PocHudProjectionV1,
  PocSemanticGamePortV1,
  PocPresentationReadPortV1
> & { readonly gameSymbols: GameSymbolRegistryV1 };

function dayLabelTextIdV1(day: PocHudProjectionV1["day"]): TextId {
  switch (day) {
    case 1:
      return pocTextIdsV1.calendarDay1Label;
    case 2:
      return pocTextIdsV1.calendarDay2Label;
    case 3:
      return pocTextIdsV1.calendarDay3Label;
    case 4:
      return pocTextIdsV1.calendarDay4Label;
    case 5:
      return pocTextIdsV1.calendarDay5Label;
    case 6:
      return pocTextIdsV1.calendarDay6Label;
    case 7:
      return pocTextIdsV1.calendarDay7Label;
    default:
      throw new RangeError(`unsupported PoC HUD day: ${String(day)}`);
  }
}

function phaseLabelTextIdV1(phase: PocHudProjectionV1["phase"]): TextId {
  switch (phase) {
    case "morning":
      return pocTextIdsV1.calendarPhaseMorningLabel;
    case "afternoon":
      return pocTextIdsV1.calendarPhaseAfternoonLabel;
    case "evening":
      return pocTextIdsV1.calendarPhaseEveningLabel;
  }
  const unsupportedPhase: never = phase;
  throw new TypeError(`unsupported PoC HUD phase: ${String(unsupportedPhase)}`);
}

function metricV1(input: {
  readonly label: string;
  readonly value: number;
  readonly symbolId: GameSymbolIdV1;
  readonly gameSymbols: GameSymbolRegistryV1;
}): ReactElement {
  return (
    <span className={styles["poc-hud__metric"]}>
      <GameSymbolV1 registry={input.gameSymbols} symbolId={input.symbolId} size={16} decorative />
      <span>{`${input.label} ${input.value}`}</span>
    </span>
  );
}

function staminaMeterV1(input: {
  readonly label: string;
  readonly current: number;
  readonly maximum: number;
  readonly gameSymbols: GameSymbolRegistryV1;
}): ReactElement {
  const valueText = `${input.current}/${input.maximum}`;
  return (
    <span className={styles["poc-hud__meter"]}>
      <span className={styles["poc-hud__meter-label"]}>
        <GameSymbolV1
          registry={input.gameSymbols}
          symbolId={pocGameSymbolIdsByRoleV1.stamina}
          size={16}
          decorative
        />
        <span>{input.label}</span>
      </span>
      <ProgressMeter
        className={styles["poc-hud__meter-progress"]}
        accessibleName={input.label}
        value={input.current}
        max={input.maximum}
        valueText={valueText}
      />
      <span className={styles["poc-hud__meter-value"]} aria-hidden="true">
        {valueText}
      </span>
    </span>
  );
}

export function PocHudV1(props: PocHudRendererPropsV1): ReactElement {
  const { gameSymbols, presentation, viewSlice } = props;
  const readTextV1 = (textId: TextId): string => presentation.text(textId).text;
  const dayLabel = readTextV1(dayLabelTextIdV1(viewSlice.day));
  const phaseLabel = readTextV1(phaseLabelTextIdV1(viewSlice.phase));
  const actionPointsLabel = readTextV1(pocTextIdsV1.hudActionPointsLabel);
  const playerStaminaLabel = readTextV1(pocTextIdsV1.hudPlayerStaminaLabel);
  const heroineStaminaLabel = readTextV1(pocTextIdsV1.hudHeroineStaminaLabel);
  const cashLabel = readTextV1(pocTextIdsV1.hudCashLabel);
  const reputationLabel = readTextV1(pocTextIdsV1.hudReputationLabel);
  const levyLabel = readTextV1(pocTextIdsV1.hudLevyLabel);

  return (
    <TopCardHudV1
      accessibleName={readTextV1(pocTextIdsV1.storyTitle)}
      slots={Object.freeze({
        start: <p className={styles["poc-hud__date"]}>{`${dayLabel} · ${phaseLabel}`}</p>,
        center: (
          <div className={styles["poc-hud__status"]}>
            <span className={styles["poc-hud__action-points"]}>
              {`${actionPointsLabel} ${viewSlice.apRemaining}`}
            </span>
            <span className={styles["poc-hud__meters"]}>
              {staminaMeterV1({
                label: playerStaminaLabel,
                current: viewSlice.playerStamina.current,
                maximum: viewSlice.playerStamina.maximum,
                gameSymbols,
              })}
              {staminaMeterV1({
                label: heroineStaminaLabel,
                current: viewSlice.heroineStamina.current,
                maximum: viewSlice.heroineStamina.maximum,
                gameSymbols,
              })}
            </span>
          </div>
        ),
        end: (
          <div className={styles["poc-hud__economy"]}>
            {metricV1({
              label: cashLabel,
              value: viewSlice.cash,
              symbolId: pocGameSymbolIdsByRoleV1.cash,
              gameSymbols,
            })}
            {metricV1({
              label: reputationLabel,
              value: viewSlice.reputation,
              symbolId: pocGameSymbolIdsByRoleV1.reputation,
              gameSymbols,
            })}
            {metricV1({
              label: levyLabel,
              value: viewSlice.levyAmount,
              symbolId: pocGameSymbolIdsByRoleV1.levy,
              gameSymbols,
            })}
          </div>
        ),
      })}
    />
  );
}
