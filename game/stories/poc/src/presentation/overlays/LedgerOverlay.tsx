// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseTextId } from "@sillymaker/base";
import type { ReactElement } from "react";

import { pocTextIdsV1 } from "../../content/ids.js";
import type { PocLedgerProjectionV1 } from "../../gameplay/index.js";
import type { PocOverlayTextPortV1 } from "./PolicyOverlay.js";

export interface LedgerOverlayPropsV1 {
  readonly ledger: PocLedgerProjectionV1;
  readonly presentation: PocOverlayTextPortV1;
}

export function LedgerOverlayV1(props: LedgerOverlayPropsV1): ReactElement {
  const startingCashLabel = props.presentation.text(pocTextIdsV1.sectionStartingCashLabel).text;
  const currentCashLabel = props.presentation.text(pocTextIdsV1.sectionCurrentCashLabel).text;
  const amountLabel = props.presentation.text(pocTextIdsV1.sectionLedgerAmountLabel).text;
  const reasonLabel = props.presentation.text(pocTextIdsV1.sectionLedgerReasonLabel).text;
  const emptyLabel = props.presentation.text(pocTextIdsV1.sectionLedgerEmptyLabel).text;

  return (
    <section data-poc-overlay-content="ledger">
      <dl>
        <div>
          <dt>{startingCashLabel}</dt>
          <dd>{props.ledger.startingCash}</dd>
        </div>
        <div>
          <dt>{currentCashLabel}</dt>
          <dd>{props.ledger.currentCash}</dd>
        </div>
      </dl>
      {props.ledger.entries.length === 0 ? (
        <p>{emptyLabel}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">{reasonLabel}</th>
              <th scope="col">{amountLabel}</th>
            </tr>
          </thead>
          <tbody>
            {props.ledger.entries.map((entry) => (
              <tr key={entry.entryId}>
                <td>{props.presentation.text(parseTextId(`text.poc.${entry.reasonId}`)).text}</td>
                <td>{entry.cashDelta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
