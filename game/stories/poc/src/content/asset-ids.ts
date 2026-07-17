// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import { parseAssetId } from "@sillymaker/base";

export const assetIdsV1 = Object.freeze([
  parseAssetId("asset.poc.character.heroine.back_hair.standard"),
  parseAssetId("asset.poc.character.heroine.costume_body.standard"),
  parseAssetId("asset.poc.character.heroine.face.neutral"),
  parseAssetId("asset.poc.character.heroine.front_hair.standard"),
  parseAssetId("asset.poc.character.heroine.accessory.standard"),
  parseAssetId("asset.poc.character.heroine.static.standard"),
  parseAssetId("asset.poc.background.main_menu.standard"),
  parseAssetId("asset.poc.background.tavern.day.standard"),
  parseAssetId("asset.poc.background.tavern.evening.standard"),
  parseAssetId("asset.poc.background.market.day.standard"),
  parseAssetId("asset.poc.background.world_map.standard"),
  parseAssetId("asset.poc.background.week_summary.standard"),
] as const);
