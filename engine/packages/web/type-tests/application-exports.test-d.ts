// SPDX-License-Identifier: MIT
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import {
  createGameBootstrapControllerV1,
  createGameRuntimeV1,
  createWebHostV1,
  Loader,
  mountGameApplicationV1,
} from "@sillymaker/web";

const injectedRecordsV1 = createMemoryHostRecordStoreV1();
createWebHostV1({ databaseName: "sillymaker.type-test.runtime" });
createWebHostV1({ records: injectedRecordsV1 });

// @ts-expect-error persistence composition requires databaseName or records
createWebHostV1({});
// @ts-expect-error persistence composition forbids databaseName and records together
createWebHostV1({ databaseName: "sillymaker.type-test.runtime", records: injectedRecordsV1 });

export {
  createGameBootstrapControllerV1,
  createGameRuntimeV1,
  createWebHostV1,
  Loader,
  mountGameApplicationV1,
};
// @ts-expect-error the application root does not export removed Developer UI
export { DevelopmentPanel as ForbiddenDevelopmentPanel } from "@sillymaker/web";
// @ts-expect-error the single Artifact surface has no Developer subpath
export { DevelopmentPanel as ForbiddenDeveloperSubpath } from "@sillymaker/web/developer";
