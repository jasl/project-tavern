// SPDX-License-Identifier: CC-BY-NC-SA-4.0
import { parseTextCatalogSetV1 } from "@sillymaker/base";

import { pocZhCnTextCatalogV1 } from "./zh-CN.js";

export { pocZhCnTextCatalogV1 } from "./zh-CN.js";

export const pocTextCatalogsV1 = parseTextCatalogSetV1({
  defaultLocale: pocZhCnTextCatalogV1.locale,
  catalogs: [pocZhCnTextCatalogV1],
});
